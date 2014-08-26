import time

from elpizo.models import entities
from elpizo.protos import packets_pb2
from elpizo.util import green


def on_move(protocol, actor, message):
  now = time.monotonic()
  dt = now - protocol.last_move_time

  if dt < 1 / actor.speed * 0.5: # compensate for slow connections by 0.5
    protocol.send(actor.id, packets_pb2.TeleportPacket(
        location=actor.location.to_protobuf(),
        direction=actor.direction))
    return

  old_location = actor.location
  last_regions = list(actor.regions)

  # BEGIN CRITICAL SECTION: We need to update the location of the actor, and
  # ensure no conflicting writes occur due to greenlet switching during IO.
  #
  # Make SURE this critical section is as small as possible!
  #
  #  * Passability checking MUST be done within the critical section, as we only
  #    know where we're moving to within the critical section.
  green.await_coro(actor.location_lock.acquire())

  passable = True
  try:
    new_location = actor.location.offset(
          entities.Entity.DIRECTION_VECTORS[actor.direction])

    # Check for realm passability.
    if actor.realm.is_passable(actor.bbox.offset(new_location),
                               actor.direction):
      with actor.movement():
        actor.location = new_location
    else:
      passable = False
  finally:
    actor.location_lock.release()
  # END CRITICAL SECTION

  if not passable:
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

  # We don't need strict sequentiality of the location log, so we keep this out
  # of the critical section.
  actor.log_location(now, old_location)
  actor.retain_log_after(now - 1)
  protocol.last_move_time = now


def on_stop_move(protocol, actor, message):
  actor.broadcast_to_regions(protocol.server.bus, message)


def on_turn(protocol, actor, message):
  actor.direction = message.direction
  actor.broadcast_to_regions(protocol.server.bus, message)
