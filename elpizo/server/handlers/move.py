import time

from elpizo.models import entities
from elpizo.protos import packets_pb2


def on_move(protocol, actor, message):
  actor.direction = message.direction

  now = time.monotonic()
  dt = now - protocol.last_move_time

  if dt < 1 / actor.speed * 0.5: # compensate for slow connections by 0.5
    protocol.send(actor.id, packets_pb2.TeleportPacket(
        location=actor.location.to_protobuf(),
        direction=actor.direction))
    return

  last_regions = list(actor.regions)

  for region in last_regions:
    protocol.server.bus.broadcast(
        ("region", actor.realm.id, region.location),
        actor.id, message)

  new_location = actor.location.offset(
        entities.Entity.DIRECTION_VECTORS[message.direction])

  if not actor.realm.is_passable(new_location, message.direction):
    return

  with actor.movement():
    actor.location = new_location

  region_diff = set(region.location for region in actor.regions) - \
      set(region.location for region in last_regions)

  if region_diff:
    for region in actor.regions:
      protocol.server.bus.broadcast(
          ("region", actor.realm.id, region.location),
          actor.id, packets_pb2.EntityPacket(
              entity=actor.to_public_protobuf()))

    for region in last_regions:
      protocol.server.bus.broadcast(
          ("region", actor.realm.id, region.location),
          actor.id, packets_pb2.RegionChangePacket(
              locations=[location.to_protobuf() for location in region_diff]))

  protocol.last_move_time = now


def on_stop_move(protocol, actor, message):
  for region in actor.regions:
    protocol.server.bus.broadcast(
        ("region", actor.realm.id, region.location),
        actor.id, message)
