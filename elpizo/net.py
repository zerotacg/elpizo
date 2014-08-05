import base64
import json
import logging
import sys
import traceback

from tornado.gen import coroutine
from tornado.websocket import WebSocketHandler

from . import green
from . import game_pb2
from .mint import InvalidTokenError
from .models import User


class Protocol(object):
  EXCHANGE_NAME = "amq.direct"

  PACKETS = {}

  def __init__(self, user_id, application, socket, channel):
    self.user_id = user_id
    self.application = application
    self.socket = socket
    self.channel = channel
    self.transient_storage = {}

  def on_open(self):
    player = self.get_player()

    # Set up the user's AMQP subscriptions
    queue_name = player.user.queue_name

    green.async_task(self.channel.queue_delete)(queue=queue_name)
    green.async_task(self.channel.queue_declare)(queue=queue_name,
                                                 exclusive=True,
                                                 auto_delete=True)

    self.channel.basic_consume(green.root(self.on_amqp_message),
                               queue=queue_name, no_ack=True, exclusive=True)

    for on_open_hook in self.application.on_open_hooks:
      on_open_hook(self.make_context())

  @classmethod
  def serialize_packet(cls, type, origin, message):
    packet = game_pb2.Packet(
        type=type,
        payload=message.SerializeToString())

    if origin is not None:
      packet.origin.MergeFrom(origin)

    return packet.SerializeToString()

  @classmethod
  def deserialize_packet(cls, raw):
    packet = game_pb2.Packet.FromString(raw)
    return packet.type, packet.origin, \
           cls.PACKETS[packet.type].FromString(packet.payload)

  def send(self, type, origin, message):
    self.socket.write_message(self.serialize_packet(type, origin, message),
                              binary=True)

  def get_player(self):
    return self.application.sqla.query(User) \
        .get(self.user_id) \
        .current_player

  def publish(self, routing_key, type, origin, message):
    self.channel.basic_publish(
        exchange=Protocol.EXCHANGE_NAME,
        routing_key=routing_key,
        body=self.serialize_packet(type, origin, message))

  def unsubscribe(self, player, routing_key):
    green.async_task(self.channel.queue_unbind)(
        exchange=Protocol.EXCHANGE_NAME,
        queue=player.user.queue_name,
        routing_key=routing_key)

  def subscribe(self, player, routing_key):
    green.async_task(self.channel.queue_bind)(
        exchange=Protocol.EXCHANGE_NAME,
        queue=player.user.queue_name,
        routing_key=routing_key)

  def make_context(self):
    return Context(self, self.get_player())

  def close(self):
    self.socket.close()

  def on_ws_message(self, packet):
    type, origin, message = self.deserialize_packet(packet)
    ctx = self.make_context()
    self.application.sockjs_endpoints[type](ctx, message)

  def on_amqp_message(self, channel, method, properties, body):
    type, origin, message = self.deserialize_packet(body)
    ctx = self.make_context()
    self.application.amqp_endpoints[type](ctx, origin, message)

  def on_close(self):
    pass


for name, descriptor in game_pb2.DESCRIPTOR.message_types_by_name.items():
  options = descriptor.GetOptions()

  if options.HasExtension(game_pb2.packetType):
    Protocol.PACKETS[options.Extensions[game_pb2.packetType]] = \
        getattr(game_pb2, name)


class Connection(WebSocketHandler):
  def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.protocol_event = green.Event()

  def error(self, reason="internal server error", exc_info=None):
    body = reason

    if self.application.settings.get("serve_traceback") and \
        exc_info is not None:
      body += "\nTraceback:\n" +  "".join(traceback.format_exception(*exc_info))

    self.write_message(
        Protocol.serialize_packet(game_pb2.Packet.ERROR, None,
                                  game_pb2.ErrorPacket(text=body)),
        binary=True)
    self.close()

  @green.root
  def open(self):
    try:
      self.channel = green.async_task(self.application.amqp.channel,
                                      callback_name="on_open_callback")()

      # Authorize the user using a minted token.
      token = self.get_cookie("elpizo_token")
      if token is None:
        self.error("no token found")
        return

      try:
        realm, user_id = self.application.mint.unmint(
            base64.b64decode(token)).decode("utf-8").split(".")
      except InvalidTokenError as e:
        self.error("invalid token: {e}".format(e=e))
        return

      if realm != "user":
        self.error("unrecognized credentials realm: {realm}".format(realm=realm))
        return

      self.protocol = Protocol(user_id, self.application, self, self.channel)
      self.protocol.on_open()
      self.protocol_event.set()
    except Exception as e:
      self.error(exc_info=sys.exc_info())
      logging.error("Error in on_open for WebSocket connection", exc_info=e)

  @green.root
  def on_message(self, packet):
    self.protocol_event.wait()

    try:
      self.protocol.on_ws_message(packet)
    except Exception as e:
      self.error(exc_info=sys.exc_info())
      logging.error("Error in on_message for WebSocket connection", exc_info=e)

  @green.root
  def on_close(self):
    self.protocol_event.wait()

    try:
      if self.channel.is_open:
        self.channel.close()
      self.protocol.on_close()
    except Exception as e:
      logging.error("Error in on_close for WebSocket connection", exc_info=e)


class Context(object):
  def __init__(self, protocol, player):
    self.protocol = protocol
    self.player = player

  @property
  def application(self):
    return self.protocol.application

  @property
  def transient_storage(self):
    return self.protocol.transient_storage

  def error(self, text):
    self.protocol.socket.error(text)

  def send(self, type, origin, message):
    self.protocol.send(type, origin, message)

  def publish(self, routing_key, type, message):
    self.protocol.publish(routing_key, type,
                          self.player.entity.to_origin_protobuf(), message)

  def unsubscribe(self, routing_key):
    self.protocol.unsubscribe(self.player, routing_key)

  def subscribe(self, routing_key):
    self.protocol.subscribe(self.player, routing_key)

  def close(self):
    self.protocol.close()
