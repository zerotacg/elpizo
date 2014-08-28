import asyncio
import random

from elpizo.client.npc_server import behaviors
from elpizo.protos import packets_pb2
from elpizo.util import green


class Wander(behaviors.Behavior):
  NAME = "wander"

  def run(self):
    while True:
      self.send(packets_pb2.MovePacket())
      green.await_coro(asyncio.sleep(1 / self.npc.speed))
      self.send(packets_pb2.TurnPacket(direction=
          random.choice([0, 1, 2, 3])))
