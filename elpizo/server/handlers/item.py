from elpizo.models import entities
from elpizo.protos import packets_pb2


def on_pick_up(protocol, message):
  try:
    drop = protocol.server.store.entities.load(message.drop_id)
  except KeyError:
    return

  if not isinstance(drop, entities.Drop) or \
     drop.realm_id != protocol.actor.realm_id or \
     drop.location != protocol.actor.location:
    return

  for region in drop.regions:
    protocol.server.bus.broadcast(
        ("region", drop.realm.id, region.location),
        drop.id, packets_pb2.DespawnEntityPacket())

  protocol.send(None, packets_pb2.InventoryPacket(item=drop.item.to_protobuf()))
  protocol.actor.inventory.append(drop.item)
  protocol.server.store.entities.destroy(drop)
