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
    self.target_id = None

  def on_update(self):
    if self.target_id is None:
      return

    target = self.server.store.entities.load(self.target_id)

    target_location = target.location.offset(
        entities.Entity.DIRECTION_VECTORS[target.direction].negate())

    if target_location == self.npc.location:
      self.attack(target.id)
      self.sleep(2)
      return

    try:
      self.move_towards(target_location)
    except behaviors.PassabilityError:
      logger.warn("No path to %r?", target_location)
    except behaviors.IncompletePathGraphError:
      logger.warn("Sorry, path graph is incomplete.")
    else:
      self.wait_move(random.randint(10, 30) / 10.)
      self.stop_move()

  def on_attacked(self, attacker):
    self.target_id = attacker.id


class Wander(behaviors.Behavior):
  NAME = "wander"

  def on_update(self):
    direction = random.choice(list(entities.Entity.DIRECTION_VECTORS.keys()))
    self.turn(direction)

    if self.npc.realm.path_graph.has_edge(
      self.npc.location, self.npc.target_location):
      self.move()
      self.wait_move()

    self.stop_move()
