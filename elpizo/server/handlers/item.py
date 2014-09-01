from elpizo.models import entities
from elpizo.protos import packets_pb2
from elpizo.protos import items_pb2


def on_pick_up(protocol, actor, message):
  try:
    drop = protocol.server.store.entities.load(message.drop_id)
  except KeyError:
    return

  if not isinstance(drop, entities.Drop) or \
     drop.realm_id != actor.realm_id or \
     drop.location != actor.location:
    return

  drop.broadcast_to_regions(protocol.server.bus,
                            packets_pb2.DespawnEntityPacket())

  # Picking up an item always requires confirmation from the server, because
  # players can race for it.
  actor.send(protocol,
             packets_pb2.InventoryPacket(item=drop.item.to_protobuf()))
  actor.inventory.add(drop.item)
  protocol.server.store.entities.destroy(drop)


def on_discard(protocol, actor, message):
  try:
    item = next(item for item in actor.inventory if item.id == message.item_id)
  except StopIteration:
    # The client probably has a stale list.
    return

  actor.inventory.remove(item)

  drop = entities.Drop(item=item, location=actor.location,
                       realm_id=actor.realm_id)
  protocol.server.store.entities.create(drop)

  drop.broadcast_to_regions(
      protocol.server.bus,
      packets_pb2.EntityPacket(entity=drop.to_public_protobuf()))


def on_modify_equipment(protocol, actor, message):
  slot_name = {
      items_pb2.Equipment.HEAD_ITEM: "head_item",
      items_pb2.Equipment.TORSO_ITEM: "torso_item",
      items_pb2.Equipment.LEGS_ITEM: "legs_item",
      items_pb2.Equipment.FEET_ITEM: "feet_item",
      items_pb2.Equipment.WEAPON: "weapon",
  }[message.slot]

  current_equipment = getattr(actor, slot_name)

  if message.HasField("item_id"):
    # Handle equipping.
    if current_equipment is not None:
      # The client should modify equipment out of this slot first.
      return

    equipment = next(item for item in actor.inventory
                     if item.id == message.item_id)

    if equipment.SLOT != message.slot:
      # The client's state probably didn't converge yet.
      return

    setattr(actor, slot_name, equipment)
    actor.inventory.remove(equipment)

    # Make the client place the item in slot 0 of the player's inventory (since
    # the client should have 0 information for the inventories of other actors
    # at all times).
    actor.broadcast_to_regions(
        protocol.server.bus,
        packets_pb2.InventoryPacket(item=equipment.to_protobuf()))

    actor.broadcast_to_regions(
        protocol.server.bus,
        packets_pb2.ModifyEquipmentPacket(slot=message.slot,
                                          item_id=equipment.id))
  elif current_equipment is not None:
    # Handle dequipping.
    setattr(actor, slot_name, None)
    actor.inventory.add(current_equipment)

    actor.broadcast_to_regions(
        protocol.server.bus,
        packets_pb2.ModifyEquipmentPacket(slot=message.slot))
