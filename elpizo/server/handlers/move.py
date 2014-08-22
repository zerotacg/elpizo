import time

from elpizo.models import entities


def on_move(protocol, message):
  last_move_time = protocol.last_move_time

  protocol.player.direction = message.direction

  now = time.monotonic()

  for region in protocol.player.regions:
    protocol.server.bus.broadcast(
        ("region", protocol.player.realm.id, region.location),
        protocol.player.id, message)

  new_location = protocol.player.location.offset(
        entities.Entity.DIRECTION_VECTORS[message.direction])

  if not protocol.player.realm.is_passable(new_location, message.direction):
    return

  with protocol.player.movement():
    protocol.player.location = new_location

  protocol.last_move_time = now


def on_stop_move(protocol, message):
  for region in protocol.player.regions:
    protocol.server.bus.broadcast(
        ("region", protocol.player.realm.id, region.location),
        protocol.player.id, message)
