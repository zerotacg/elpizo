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
  try:
    old_entity = protocol.server.store.entities.load(origin)
  except KeyError:
    pass
  else:
    protocol.server.store.entities.expire(old_entity)

  entity = entities.Entity.from_protobuf_polymorphic(message.entity)
  entity.update(id=origin)
  protocol.server.store.entities.add(entity)

  if isinstance(entity, entities.NPC) and entity.behavior is not None and \
      entity.id not in protocol.server.npcs:
    behavior_factory = behaviors.Behavior.REGISTRY[entity.behavior]
    behavior = behavior_factory(protocol, entity)
    protocol.server.start_behavior(behavior)


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
def on_stop_move(protocol, entity, message):
  pass


@with_entity
def on_teleport(protocol, entity, message):
  entity.direction = message.direction
  entity.location = geometry.Vector2.from_protobuf(message.location)


@with_entity
def on_attack(protocol, entity, message):
  for target_id in message.entity_ids:
    if target_id in protocol.server.npcs:
      npc = protocol.server.npcs[target_id]
      npc.on_attacked(entity)


@with_entity
def on_damage(protocol, entity, message):
  entity.health -= message.damage
