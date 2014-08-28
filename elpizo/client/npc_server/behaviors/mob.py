import asyncio
import random

from elpizo.client.npc_server import behaviors
from elpizo.util import geometry
from elpizo.util import green


class Wander(behaviors.Behavior):
  NAME = "wander"

  def run(self):
    while True:
      try:
        self.move_to(geometry.Vector2(5, 5))
      except behaviors.PassabilityError:
        pass
      else:
        break

      self.be_nice()
