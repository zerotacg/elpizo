import asyncio
import networkx

from elpizo.models import entities
from elpizo.protos import packets_pb2
from elpizo.util import geometry
from elpizo.util import green


def manhattan(a, b):
  dx = abs(a.x - b.x)
  dy = abs(a.y - b.y)
  return dx + dy


class PassabilityError(Exception):
  pass


class IncompletePathGraphError(Exception):
  pass


class Behavior(object):
  REGISTRY = {}

  def __init__(self, protocol, npc):
    self.protocol = protocol
    self.npc = npc

  @classmethod
  def register(cls, subclass):
    cls.REGISTRY[subclass.NAME] = subclass
    return subclass

  @property
  def server(self):
    return self.protocol.server

  def run(self):
    while True:
      self.on_update()
      self.be_nice()

  def on_attacked(self, attacker):
    pass

  def on_update(self):
    pass

  def be_nice(self):
    green.await_coro(asyncio.sleep(0))

  def turn(self, direction):
    self.npc.direction = direction
    self.send(packets_pb2.TurnPacket(direction=direction))

  def send(self, message):
    self.protocol.send(self.npc.id, message)

  def move(self):
    self.npc.location = self.npc.target_location
    self.send(packets_pb2.MovePacket())

  def stop_move(self):
    self.send(packets_pb2.StopMovePacket())

  def move_towards(self, target_location):
    try:
      path = networkx.astar_path(self.npc.realm.path_graph, self.npc.location,
                                 target_location, manhattan)
    except KeyError:
      raise IncompletePathGraphError
    except networkx.NetworkXNoPath:
      raise PassabilityError

    if len(path) == 1:
      return

    current, next, *_ = path
    direction = entities.Entity.DIRECTIONS[next.offset(current.negate())]

    if direction != self.npc.direction:
      self.turn(direction)

    self.move()

  def wait_move(self):
      green.await_coro(asyncio.sleep(1 / self.npc.speed))

