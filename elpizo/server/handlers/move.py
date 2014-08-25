import time

from elpizo.models import entities
from elpizo.protos import packets_pb2


def on_move(protocol, actor, message):
  now = time.monotonic()
  dt = now - protocol.last_move_time

  if dt < 1 / actor.speed * 0.5: # compensate for slow connections by 0.5
    protocol.send(actor.id, packets_pb2.TeleportPacket(
        location=actor.location.to_protobuf(),
        direction=actor.direction))
    return

  old_location = actor.location

  new_location = actor.location.offset(
        entities.Entity.DIRECTION_VECTORS[actor.direction])

  # Check for realm passability.
  if not actor.realm.is_passable(new_location, actor.direction):
    protocol.send(actor.id, packets_pb2.TeleportPacket(
        location=actor.location.to_protobuf(),
        direction=actor.direction))
    return

  last_regions = list(actor.regions)

  with actor.movement():
    actor.location = new_location

  # Check for entity-entity passability. We have to do the movement first to
  # ensure that we're searching the correct regions (but we just revert later).
  for region in actor.regions:
    for entity in region.entities:
      if entity is not actor and entity.bounds.intersects(actor.bounds):
        with actor.movement():
          actor.location = old_location

        protocol.send(actor.id, packets_pb2.TeleportPacket(
            location=actor.location.to_protobuf(),
            direction=actor.direction))
        return

  for region in last_regions:
    protocol.server.bus.broadcast(
        ("region", actor.realm.id, region.location),
        actor.id, message)

  region_diff = set(region.location for region in actor.regions) - \
      set(region.location for region in last_regions)

  if region_diff:
    actor.broadcast_to_regions(protocol.server.bus, packets_pb2.EntityPacket(
          entity=actor.to_public_protobuf()))

    # Manually broadcast RegionChange
    region_change_message = packets_pb2.RegionChangePacket(
        locations=[location.to_protobuf() for location in region_diff])

    for region in last_regions:
      protocol.server.bus.broadcast(
          ("region", actor.realm.id, region.location),
          actor.id, region_change_message)

  protocol.last_move_time = now


def on_stop_move(protocol, actor, message):
  actor.broadcast_to_regions(protocol.server.bus, message)


def on_turn(protocol, actor, message):
  actor.direction = message.direction
  actor.broadcast_to_regions(protocol.server.bus, message)
