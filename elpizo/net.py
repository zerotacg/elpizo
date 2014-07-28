import base64
import json

from sockjs.tornado import SockJSConnection, SockJSRouter
from tornado.gen import coroutine, Task

from .mint import InvalidTokenError
from .models import User


class Protocol(object):
  EXCHANGE_NAME = "amq.direct"

  def __init__(self, user_id, application, socket, channel):
    self.user_id = user_id
    self.application = application
    self.socket = socket
    self.channel = channel

  @coroutine
  def on_open(self):
    player = self.get_player()

    # Set up the user's AMQP subscriptions
    queue_name = player.user.queue_name

    yield Task(self.channel.queue_delete, queue=queue_name)
    yield Task(self.channel.queue_declare, queue=queue_name,
               exclusive=True, auto_delete=True)

    self.channel.basic_consume(self.on_amqp_message, queue=queue_name,
                               no_ack=True, exclusive=True)

    yield Task(self.channel.queue_bind, exchange=self.EXCHANGE_NAME,
               queue=queue_name, routing_key=player.actor.routing_key)

    for on_open_hook in self.application.on_open_hooks:
      on_open_hook(self.make_amqp_context())

  def get_player(self):
    return self.application.sqla_session.query(User) \
      .get(self.user_id) \
      .current_player

  def make_amqp_context(self):
    return AMQPContext(self.application, self.channel, self.get_player())

  def make_sockjs_context(self):
    return SockJSContext(self.application, self.socket, self.get_player())

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
  @property
  def application(self):
    return self.session.server.application

  @coroutine
  def on_open(self, info):
    self.channel = \
        yield Task(lambda callback: self.application.amqp.channel(callback))

    # Authorize the user using a minted token.
    token = info.get_cookie("elpizo_token")
    if token is None:
      self.send({
        "type": "error",
        "text": "no token found"
      })
      return

    try:
      principal, user_id = self.application.mint.unmint(
          base64.b64decode(token)).decode("utf-8").split(":")
    except InvalidTokenError as e:
      self.send({
        "type": "error",
        "text": "invalid token: {e}".format(e=e)
      })
      return

    if principal != "user":
      self.send({
        "type": "error",
        "text": "unrecognized credentials principal: {principal}".format(
            principal=principal)
      })
      return

    self.protocol = Protocol(user_id, self.application, self, self.channel)
    yield self.protocol.on_open()

  def on_message(self, packet):
    self.protocol.on_sockjs_message(self, packet)

  def on_close(self):
    try:
      self.channel.close()
      self.protocol.on_close()
    except Exception as e:
      logging.error("Error in on_close for SockJS connection", exc_info=e)


class AMQPContext(object):
  @property
  def application(self):
    return self.protocol.application

  def __init__(self, protocol, player):
    self.protocol = protocol
    self.player = player

  def send(self, packet):
    self.publish(player.routing_key, packet)

  def publish(self, routing_key, packet):
    self.channel.basic_publish(exchange=Protocol.EXCHANGE_NAME,
                               routing_key=routing_key,
                               body=json.dumps(packet))

  @coroutine
  def unsubscribe(self, routing_key):
    yield Task(self.channel.queue_unbind, exchange=Protocol.EXCHANGE_NAME,
               queue=self.player.user.queue_name, routing_key=routing_key)

  @coroutine
  def subscribe(self, routing_key):
    yield Task(self.channel.queue_unbind, exchange=Protocol.EXCHANGE_NAME,
               queue=self.player.user.queue_name, routing_key=routing_key)


class SockJSContext(object):
  @property
  def application(self):
    return self.protocol.application

  def __init__(self, protocol, player):
    self.protocol = protocol
    self.player = player

  def send(self, message):
    self.socket.send(json.dumps(message))
