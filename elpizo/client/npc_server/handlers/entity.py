import functools

from elpizo.client.npc_server import behaviors
from elpizo.models import entities
from elpizo.models import geometry


def with_entity(f):
  @functools.wraps(f)
  def _wrapper(protocol, origin, message):
    f(protocol, protocol.server.entities[origin], message)
  return _wrapper


def on_entity(protocol, origin, message):
  entity = entities.Entity.from_protobuf_polymorphic(message.entity)
  entity.update(id=origin, realm=protocol.server.realms[entity.realm_id])
  protocol.server.entities[entity.id] = entity

  if isinstance(entity, entities.NPC):
    behavior_factory = behaviors.Behavior.REGISTRY[entity.behavior]
    behavior = behavior_factory(protocol, entity)
    protocol.server.start_behavior(behavior)


@with_entity
def on_despawn_entity(protocol, entity, message):
  del protocol.server.entities[entity.id]


@with_entity
def on_turn(protocol, entity, message):
  entity.direction = message.direction


@with_entity
def on_move(protocol, entity, message):
  entity.location = entity.target_location


@with_entity
def on_teleport(protocol, entity, message):
  entity.direction = message.direction
  entity.location = geometry.Vector2.from_protobuf(message.location)
