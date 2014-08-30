import time

from elpizo.models import entities
from elpizo.models import geometry
from elpizo.protos import packets_pb2
from elpizo.util import green


def on_move(protocol, actor, message):
  now = time.monotonic()
  dt = now - actor.ephemera.last_move_time

  old_location = actor.location
  new_location = old_location.offset(
      entities.Entity.DIRECTION_VECTORS[actor.direction])

  expected_location = geometry.Vector2.from_protobuf(message.location)

  if new_location != expected_location or \
      dt < 1 / actor.speed * 0.25: # compensate for slow connections by 0.25
    protocol.send(actor.id, packets_pb2.TeleportPacket(
        location=actor.location.to_protobuf(),
        direction=actor.direction))
    return

  old_regions = list(actor.regions)

  # BEGIN CRITICAL SECTION: We need to update the location of the actor, and
  # ensure no conflicting writes occur due to greenlet switching during IO.
  #
  # Passability checking MUST be done within the critical section, as we only
  # know where we're moving to within the critical section.
  with green.locking(actor.location_lock):
    # Check for realm passability.
    passable = actor.realm.is_passable(actor.bbox.offset(new_location),
                                       actor.direction)

    if passable:
      with actor.movement():
        actor.location = new_location
  # END CRITICAL SECTION

  if not passable:
    protocol.send(actor.id, packets_pb2.TeleportPacket(
        location=actor.location.to_protobuf(),
        direction=actor.direction))
    return

  # We don't need strict sequentiality of the location log, so we keep this out
  # of the critical section.
  actor.ephemera.last_move_time = now
  actor.log_location(now, old_location)
  actor.retain_log_after(now - 1)

  new_region_locations = set(region.location for region in actor.regions)
  old_region_locations = set(region.location for region in old_regions)

  added_region_locations = new_region_locations - old_region_locations
  removed_region_locations = old_region_locations - new_region_locations

  # Broadcast ENTER to the regions the entity is entering.
  actor_protobuf = actor.to_public_protobuf()

  for region_location in removed_region_locations:
    for new_region_location in new_region_locations:
      actor.broadcast(
          protocol.server.bus,
          ("region", actor.realm.id, new_region_location),
          packets_pb2.EnterPacket(
              location=region_location.to_protobuf(),
              entity=actor_protobuf))

  # Broadcast EXIT to the regions the entity is exiting.
  for region_location in added_region_locations:
    for old_region_location in old_region_locations:
      actor.broadcast(
          protocol.server.bus,
          ("region", actor.realm.id, old_region_location),
          packets_pb2.ExitPacket(
              location=region_location.to_protobuf()))

  # For every region that we moved from, we broadcast that we moved.
  for region in old_regions:
    actor.broadcast(
        protocol.server.bus,
        ("region", actor.realm.id, region.location),
        packets_pb2.MovePacket(location=new_location.to_protobuf()))


def on_stop_move(protocol, actor, message):
  actor.broadcast_to_regions(protocol.server.bus, message)


def on_turn(protocol, actor, message):
  actor.direction = message.direction
  actor.broadcast_to_regions(protocol.server.bus, message)
