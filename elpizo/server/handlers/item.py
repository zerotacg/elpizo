from elpizo.models import entities
from elpizo.protos import packets_pb2
from elpizo.protos import items_pb2
from elpizo.util import net


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

  protocol.send(actor.id,
                packets_pb2.InventoryPacket(item=drop.item.to_protobuf()))
  actor.inventory.append(drop.item)
  protocol.server.store.entities.destroy(drop)


def on_discard(protocol, actor, message):
  item = actor.inventory[message.inventory_index]
  del actor.inventory[message.inventory_index]

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

  if message.HasField("inventory_index"):
    # Handle equipping.
    if current_equipment is not None:
      # The actor should modify equipment out of this slot first.
      raise ValueError("Slot currently has equipment.")

    equipment = actor.inventory[message.inventory_index]

    if equipment.SLOT != message.slot:
      raise ValueError("Equipment cannot be placed into this slot.")

    setattr(actor, slot_name, equipment)
    del actor.inventory[message.inventory_index]

    # Make the client place the item in slot 0 of the player's inventory (since
    # the client should have 0 information for the inventories of other actors
    # at all times).
    actor.broadcast_to_regions(
        protocol.server.bus,
        packets_pb2.InventoryPacket(item=entity.to_public_protobuf()))

    actor.broadcast_to_regions(
        protocol.server.bus,
        packets_pb2.ModifyEquipmentPacket(slot=message.slot, inventory_index=0))
  elif current_equipment is not None:
    # Handle dequipping.
    setattr(actor, slot_name, None)
    actor.inventory.append(current_equipment)
    protocol.send(actor.id,
                  packets_pb2.InventoryPacket(
                      item=current_equipment.to_protobuf()))

    actor.broadcast_to_regions(
        protocol.server.bus,
        packets_pb2.ModifyEquipmentPacket(slot=message.slot))
