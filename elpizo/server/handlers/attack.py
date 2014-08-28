import time

from elpizo.models.entities import Drop
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

      if (actor.target_bounds.intersects(target_bounds) or \
          actor.bounds.intersects(target_bounds)) and \
         target.is_damageable():
        target_protocol = protocol.server.bus.get(target.id)

        damage_packet = packets_pb2.DamagePacket(
            damage=target.damage(actor.attack_strength))
        target.broadcast_to_regions(protocol.server.bus, damage_packet)
        target_protocol.send(target.id, damage_packet)
        if target.health == 0:
          target.broadcast_to_regions(protocol.server.bus,
                                      packets_pb2.DeathPacket())
          target_protocol.send(target.id, packets_pb2.DeathPacket())
          protocol.server.store.entities.destroy(target)

          for item in target.full_inventory:
            drop = Drop(item=item,
                        location=target.location,
                        realm_id=target.realm_id)
            protocol.server.store.entities.create(drop)

            drop.broadcast_to_regions(
                protocol.server.bus,
                packets_pb2.EntityPacket(entity=drop.to_public_protobuf()))
        break

  actor.broadcast_to_regions(protocol.server.bus, message)

  protocol.last_attack_time = now
