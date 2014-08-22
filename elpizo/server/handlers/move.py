import time

from elpizo.models import entities
from elpizo.protos import packets_pb2


def on_move(protocol, message):
  protocol.player.direction = message.direction

  now = time.monotonic()
  dt = now - protocol.last_move_time

  if dt < 1 / protocol.player.speed * 0.5: # compensate for slow connections by 0.5
    protocol.send(protocol.player.id, packets_pb2.TeleportPacket(
        location=protocol.player.location.to_protobuf(),
        direction=protocol.player.direction))
    return

  last_regions = list(protocol.player.regions)

  for region in last_regions:
    protocol.server.bus.broadcast(
        ("region", protocol.player.realm.id, region.location),
        protocol.player.id, message)

  new_location = protocol.player.location.offset(
        entities.Entity.DIRECTION_VECTORS[message.direction])

  if not protocol.player.realm.is_passable(new_location, message.direction):
    return

  with protocol.player.movement():
    protocol.player.location = new_location

  region_diff = set(region.location for region in protocol.player.regions) - \
      set(region.location for region in last_regions)

  if region_diff:
    for region in protocol.player.regions:
      protocol.server.bus.broadcast(
          ("region", protocol.player.realm.id, region.location),
          protocol.player.id, packets_pb2.EntityPacket(
              entity=protocol.player.to_public_protobuf()))

    for region in last_regions:
      protocol.server.bus.broadcast(
          ("region", protocol.player.realm.id, region.location),
          protocol.player.id, packets_pb2.RegionChangePacket(
              locations=[location.to_protobuf() for location in region_diff]))

  protocol.last_move_time = now


def on_stop_move(protocol, message):
  for region in protocol.player.regions:
    protocol.server.bus.broadcast(
        ("region", protocol.player.realm.id, region.location),
        protocol.player.id, message)
