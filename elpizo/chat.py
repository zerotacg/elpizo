import json

from tornado.gen import Task, engine

from .net import Protocol


class ChatProtocol(Protocol):
  @staticmethod
  def get_room_exchange_name(target):
    return "chat:room:{}".format(target)

  @staticmethod
  def get_player_exchange_name(target):
    return "chat:player:{}".format(target)

  @engine
  def on_authed_open(self, info):
    player = self.get_player()

    self.channel = \
        yield Task(lambda callback: self.application.amqp.channel(callback))

    yield Task(self.channel.exchange_declare,
               exchange=self.get_room_exchange_name("global"),
               type="fanout")
    yield Task(self.channel.exchange_declare,
               exchange=self.get_player_exchange_name(player.id),
               type="fanout")

    self.chat_queue = (
        yield Task(self.channel.queue_declare, exclusive=True)).method.queue

    yield Task(self.channel.queue_bind,
               exchange=self.get_room_exchange_name("global"),
               queue=self.chat_queue)
    yield Task(self.channel.queue_bind,
               exchange=self.get_player_exchange_name(player.id),
               queue=self.chat_queue)

    self.channel.basic_consume(self.on_chat_queue_consume,
                               queue=self.chat_queue, no_ack=True)

  def on_parsed_message(self, message):
    player = self.get_player()
    target = message["target"]

    if target[0] == "#":
      exchange = self.get_room_exchange_name(target[1:])
    else:
      player = self.application.sqla_session.query(Player) \
        .filter(Player.name == target) \
        .one()
      exchange = self.get_player_exchange_name(player.id)

    self.channel.basic_publish(exchange=exchange,
                               routing_key="",
                               body=json.dumps({
                                   "origin": player.name,
                                   "target": message["target"],
                                   "text": message["text"]
                               }))

  def on_chat_queue_consume(self, ch, method, properties, body):
    self.send(json.loads(body.decode("utf-8")))


CHANNELS = {
  "chat": ChatProtocol
}
