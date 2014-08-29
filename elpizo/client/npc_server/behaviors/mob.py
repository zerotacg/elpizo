import asyncio
import logging
import random

from elpizo.client.npc_server import behaviors
from elpizo.models import entities
from elpizo.util import geometry
from elpizo.util import green

logger = logging.getLogger(__name__)


class Pursue(behaviors.Behavior):
  NAME = "pursue"

  def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.target = None

  def run(self):
    while True:
      if self.target is None:
        self.be_nice()
        continue

      target = self.target.location.offset(
          entities.Entity.DIRECTION_VECTORS[self.target.direction].negate())

      if target == self.npc.location:
        self.be_nice()
        continue

      try:
        self.move_towards(target)
      except behaviors.PassabilityError:
        logger.warn("No path to %r?", target)
      except behaviors.IncompletePathGraphError:
        logger.warn("Sorry, path graph is incomplete.")
      else:
        self.wait_move()

      self.be_nice()

  def on_attacked(self, attacker):
    self.target = attacker
