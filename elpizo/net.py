import base64
import json
import logging
import sys
import traceback

from sockjs.tornado import SockJSConnection, SockJSRouter
from tornado.gen import coroutine

from . import green
from .mint import InvalidTokenError
from .models import User


class Protocol(object):
  EXCHANGE_NAME = "amq.direct"

  def __init__(self, user_id, application, socket, channel):
    self.user_id = user_id
    self.application = application
    self.socket = socket
    self.channel = channel

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

    green.async_task(self.channel.queue_bind)(
        exchange=self.EXCHANGE_NAME,
        queue=queue_name,
        routing_key=player.actor.routing_key)

    for on_open_hook in self.application.on_open_hooks:
      on_open_hook(self.make_amqp_context())

  def get_player(self):
    return self.application.sqla.query(User) \
        .get(self.user_id) \
        .current_player

  def make_amqp_context(self):
    return AMQPContext(self, self.get_player())

  def make_sockjs_context(self):
    return SockJSContext(self, self.get_player())

  def close(self):
    self.socket.close()

  def on_sockjs_message(self, packet):
    message = json.loads(packet)
    mq = self.make_amqp_context()
    self.application.sockjs_endpoints[message["type"]](mq, message)

  def on_amqp_message(self, channel, method, properties, body):
    message = json.loads(body.decode("utf-8"))
    socket = self.make_sockjs_context()
    self.application.amqp_endpoints[message["type"]](socket, message)

  def on_close(self):
    pass


class Router(SockJSRouter):
  def __init__(self, application, *args, **kwargs):
    self.application = application
    super().__init__(*args, **kwargs)


class Connection(SockJSConnection):
  def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.protocol_event = green.Event()

  @property
  def application(self):
    return self.session.server.application

  def error(self, reason="internal server error", exc_info=None):
    packet = {
        "type": "error",
        "text": reason
    }

    if self.application.settings.get("serve_traceback") and \
        exc_info is not None:
      packet["debug_trace"] = "".join(traceback.format_exception(*exc_info))

    self.send(json.dumps(packet))
    self.close()

  @green.root
  def on_open(self, info):
    try:
      self.channel = green.async_task(self.application.amqp.channel,
                                      callback_name="on_open_callback")()

      # Authorize the user using a minted token.
      cookie = info.get_cookie("elpizo_token")
      if cookie is None:
        self.error("no token found")
        return
      token = cookie.value

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
      logging.error("Error in on_open for SockJS connection", exc_info=e)

  @green.root
  def on_message(self, packet):
    self.protocol_event.wait()

    try:
      self.protocol.on_sockjs_message(packet)
    except Exception as e:
      self.error(exc_info=sys.exc_info())
      logging.error("Error in on_message for SockJS connection", exc_info=e)

  @green.root
  def on_close(self):
    self.protocol_event.wait()

    try:
      if self.channel.is_open:
        self.channel.close()
      self.protocol.on_close()
    except Exception as e:
      logging.error("Error in on_close for SockJS connection", exc_info=e)


class AMQPContext(object):
  def __init__(self, protocol, player):
    self.protocol = protocol
    self.player = player

  @property
  def application(self):
    return self.protocol.application

  def send(self, packet):
    self.publish(self.player.actor.routing_key, packet)

  def publish(self, routing_key, packet):
    self.protocol.channel.basic_publish(exchange=Protocol.EXCHANGE_NAME,
                                        routing_key=routing_key,
                                        body=json.dumps(packet))

  def unsubscribe(self, routing_key):
    green.async_task(self.protocol.channel.queue_unbind)(
        exchange=Protocol.EXCHANGE_NAME,
        queue=self.player.user.queue_name,
        routing_key=routing_key)

  def subscribe(self, routing_key):
    green.async_task(self.protocol.channel.queue_bind)(
        exchange=Protocol.EXCHANGE_NAME,
        queue=self.player.user.queue_name,
        routing_key=routing_key)


class SockJSContext(object):
  def __init__(self, protocol, player):
    self.protocol = protocol
    self.player = player

  @property
  def application(self):
    return self.protocol.application

  def send(self, message):
    self.protocol.socket.send(json.dumps(message))

  def close(self):
    self.protocol.socket.close()
