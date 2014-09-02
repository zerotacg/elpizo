import time

from elpizo.models import entities
from elpizo.protos import packets_pb2


def on_attack(protocol, actor, message):
  ephemera = protocol.get_ephemera(actor)
  now = time.monotonic()
  dt = now - ephemera.last_attack_time

  if dt < 1 / actor.attack_cooldown * 0.5: # compensate for slow connections by 0.5
    return

  actor.broadcast_to_regions(protocol.server.bus, message)

  ephemera.last_attack_time = now

  for entity_id in message.entity_ids:
    target = protocol.server.store.entities.load(entity_id)

    for location in target.all_locations:
      target_bounds = target.bbox.offset(location)
      if actor.target_bounds.intersects(target_bounds) and \
          target.is_damageable_by(actor) and \
          actor.realm.is_terrain_passable_by(actor, target_bounds,
                                             actor.direction):
        damage_packet = packets_pb2.DamagePacket(
            damage=target.damage(actor.attack_strength))
        target.broadcast_to_regions(protocol.server.bus, damage_packet)
        target.send_via_bus(protocol.server.bus, target, damage_packet)

        if target.health == 0:
          for protocol in protocol.server.bus.protocols.values():
            protocol.policy.on_despawn(target.id)

          target.broadcast_to_regions(protocol.server.bus,
                                      packets_pb2.DeathPacket())
          target.send_via_bus(protocol.server.bus, target,
                              packets_pb2.DeathPacket())
          protocol.server.store.entities.destroy(target)

          for item in target.full_inventory:
            drop = entities.Drop(item=item, location=target.location,
                                 realm_id=target.realm_id)
            protocol.server.store.entities.create(drop)

            drop.broadcast_to_regions(
                protocol.server.bus,
                packets_pb2.EntityPacket(entity=drop.to_public_protobuf()))
        break
