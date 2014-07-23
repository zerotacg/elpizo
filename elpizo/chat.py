import json

from tornado.gen import Task, engine

from .net import Protocol


class ChatProtocol(Protocol):
  EXCHANGE_NAME = "elpizo.chat"
  GLOBAL_ROOM_NAME = "global"

  @staticmethod
  def get_room_routing_key(target):
    return "room:{target}".format(target=target)

  @staticmethod
  def get_player_routing_key(target):
    return "player:{target}".format(target=target)

  @engine
  def on_open(self, info):
    self.channel = \
        yield Task(lambda callback: self.application.amqp.channel(callback))

    yield Task(self.channel.exchange_declare, exchange=self.EXCHANGE_NAME,
               type="direct")

    yield Task(self.channel.queue_delete,
               queue="chat:{id}".format(id=self.player.user.id))

    self.chat_queue = (
        yield Task(self.channel.queue_declare,
                   queue="chat:{id}".format(id=self.player.user.id),
                   exclusive=True,
                   auto_delete=True)).method.queue

    yield Task(self.channel.queue_bind, exchange=self.EXCHANGE_NAME,
               queue=self.chat_queue,
               routing_key=self.get_room_routing_key(self.GLOBAL_ROOM_NAME))
    yield Task(self.channel.queue_bind, exchange=self.EXCHANGE_NAME,
               queue=self.chat_queue,
               routing_key=self.get_player_routing_key(self.player.creature.id))

    self.channel.basic_consume(self.simple_relay_to_client,
                               queue=self.chat_queue, no_ack=True,
                               exclusive=True)

  def on_parsed_message(self, message):
    target = message["target"]

    if target[0] == "#":
      routing_key = self.get_room_routing_key(target[1:])
    else:
      self.player = self.application.sqla_session.query(Player) \
        .filter(Player.name == target) \
        .one()
      routing_key = self.get_player_routing_key(self.player.creature.id)

    self.channel.basic_publish(exchange=self.EXCHANGE_NAME,
                               routing_key=routing_key,
                               body=json.dumps({
                                   "origin": self.player.creature.name,
                                   "target": message["target"],
                                   "text": message["text"]
                               }))


CHANNELS = {
    "chat": ChatProtocol
}
