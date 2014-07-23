import json

from tornado.gen import Task, engine

from .net import Protocol


class ChatProtocol(Protocol):
  EXCHANGE_NAME = "elpizo.chat"
  GLOBAL_ROOM_NAME = "global"

  @staticmethod
  def get_room_routing_key(target):
    return "room:{}".format(target)

  @staticmethod
  def get_player_routing_key(target):
    return "player:{}".format(target)

  @engine
  def on_open(self, info):
    player = self.get_player()

    self.channel = \
        yield Task(lambda callback: self.application.amqp.channel(callback))

    yield Task(self.channel.exchange_declare, exchange=self.EXCHANGE_NAME,
               type="direct")

    self.chat_queue = (
        yield Task(self.channel.queue_declare,
                   queue="chat.queue:{id}".format(id=player.creature.id),
                   exclusive=True)).method.queue

    yield Task(self.channel.queue_bind, exchange=self.EXCHANGE_NAME,
               queue=self.chat_queue,
               routing_key=self.get_room_routing_key(self.GLOBAL_ROOM_NAME))
    yield Task(self.channel.queue_bind, exchange=self.EXCHANGE_NAME,
               queue=self.chat_queue,
               routing_key=self.get_player_routing_key(player.creature.id))

    self.channel.basic_consume(self.simple_relay_to_client,
                               queue=self.chat_queue, no_ack=True)

  def on_parsed_message(self, message):
    player = self.get_player()
    target = message["target"]

    if target[0] == "#":
      routing_key = self.get_room_routing_key(target[1:])
    else:
      player = self.application.sqla_session.query(Player) \
        .filter(Player.name == target) \
        .one()
      routing_key = self.get_player_routing_key(player.creature.id)

    self.channel.basic_publish(exchange=self.EXCHANGE_NAME,
                               routing_key=routing_key,
                               body=json.dumps({
                                   "origin": player.creature.name,
                                   "target": message["target"],
                                   "text": message["text"]
                               }))


CHANNELS = {
    "chat": ChatProtocol
}
