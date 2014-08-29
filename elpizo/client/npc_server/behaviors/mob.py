import asyncio
import logging
import random

from elpizo.client.npc_server import behaviors
from elpizo.util import geometry
from elpizo.util import green

logger = logging.getLogger(__name__)


class Wander(behaviors.Behavior):
  NAME = "wander"

  def run(self):
    target = geometry.Vector2(5, 21)

    while True:
      try:
        self.move_towards(target)
      except behaviors.PassabilityError:
        pass
      except behaviors.IncompletePathGraphError:
        logger.warn("Sorry, path graph is incomplete.")
      else:
        if self.npc.location == target:
          self.stop_move()
          break

        self.wait_move()

      self.be_nice()
