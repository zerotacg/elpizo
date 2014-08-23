import time

from elpizo.models import entities
from elpizo.protos import packets_pb2


def on_move(protocol, message):
  protocol.actor.direction = message.direction

  now = time.monotonic()
  dt = now - protocol.last_move_time

  if dt < 1 / protocol.actor.speed * 0.5: # compensate for slow connections by 0.5
    protocol.send(protocol.actor.id, packets_pb2.TeleportPacket(
        location=protocol.actor.location.to_protobuf(),
        direction=protocol.actor.direction))
    return

  last_regions = list(protocol.actor.regions)

  for region in last_regions:
    protocol.server.bus.broadcast(
        ("region", protocol.actor.realm.id, region.location),
        protocol.actor.id, message)

  new_location = protocol.actor.location.offset(
        entities.Entity.DIRECTION_VECTORS[message.direction])

  if not protocol.actor.realm.is_passable(new_location, message.direction):
    return

  with protocol.actor.movement():
    protocol.actor.location = new_location

  region_diff = set(region.location for region in protocol.actor.regions) - \
      set(region.location for region in last_regions)

  if region_diff:
    for region in protocol.actor.regions:
      protocol.server.bus.broadcast(
          ("region", protocol.actor.realm.id, region.location),
          protocol.actor.id, packets_pb2.EntityPacket(
              entity=protocol.actor.to_public_protobuf()))

    for region in last_regions:
      protocol.server.bus.broadcast(
          ("region", protocol.actor.realm.id, region.location),
          protocol.actor.id, packets_pb2.RegionChangePacket(
              locations=[location.to_protobuf() for location in region_diff]))

  protocol.last_move_time = now


def on_stop_move(protocol, message):
  for region in protocol.actor.regions:
    protocol.server.bus.broadcast(
        ("region", protocol.actor.realm.id, region.location),
        protocol.actor.id, message)
