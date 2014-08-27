import time

from elpizo.protos import packets_pb2


def on_attack(protocol, actor, message):
  now = time.monotonic()
  dt = now - protocol.last_attack_time

  if dt < 1 / actor.attack_cooldown * 0.5: # compensate for slow connections by 0.5
    return

  for actor_id in message.actor_ids:
    target = protocol.server.store.entities.load(actor_id)

    for location in target.all_locations:
      target_bounds = target.bbox.offset(location)

      if actor.target_bounds.intersects(target_bounds) or \
         actor.bounds.intersects(target_bounds):
        target.broadcast_to_regions(
            protocol.server.bus,
            packets_pb2.DamagePacket(damage=target.damage(
                actor.attack_strength)),
            exclude_origin=False)
        break

  actor.broadcast_to_regions(protocol.server.bus, message)

  protocol.last_attack_time = now
