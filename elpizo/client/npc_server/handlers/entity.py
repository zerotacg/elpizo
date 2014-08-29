import functools

from elpizo.client.npc_server import behaviors
from elpizo.models import entities
from elpizo.models import geometry
from elpizo.protos import packets_pb2


def with_entity(f):
  @functools.wraps(f)
  def _wrapper(protocol, origin, message):
    f(protocol, protocol.server.store.entities.load(origin), message)
  return _wrapper


def on_entity(protocol, origin, message):
  entity = entities.Entity.from_protobuf_polymorphic(message.entity)
  entity.update(id=origin)
  protocol.server.store.entities.add(entity)

  if isinstance(entity, entities.NPC) and entity.behavior is not None:
    behavior_factory = behaviors.Behavior.REGISTRY[entity.behavior]
    behavior = behavior_factory(protocol, entity)
    protocol.server.start_behavior(behavior)

    # TODO: request a chunk more sanely
    protocol.send(origin, packets_pb2.ViewportPacket(
        bounds=entity.realm.bounds.to_protobuf()))


@with_entity
def on_despawn_entity(protocol, entity, message):
  protocol.server.store.entities.destroy(entity)


@with_entity
def on_turn(protocol, entity, message):
  if entity.id not in protocol.server.npcs:
    entity.direction = message.direction


@with_entity
def on_move(protocol, entity, message):
  if entity.id not in protocol.server.npcs:
    entity.location = entity.target_location


@with_entity
def on_teleport(protocol, entity, message):
  entity.direction = message.direction
  entity.location = geometry.Vector2.from_protobuf(message.location)
