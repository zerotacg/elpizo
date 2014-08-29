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
    while True:
      try:
        self.move_to(geometry.Vector2(5, 5))
      except behaviors.PassabilityError:
        pass
      except behaviors.IncompletePathGraphError:
        logger.warn("Sorry, path graph is incomplete.")
      else:
        break

      self.be_nice()
