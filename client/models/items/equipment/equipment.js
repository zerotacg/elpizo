module items from "client/models/items";
module packets from "client/protos/packets";

export class Equipment extends items.Item {
  constructor(message) {
    super(message);
    message = message[".Equipment.ext"];
  }

  doEquip(protocol, me, index) {
    var item = me.inventory[index];
    var slot = Equipment.SLOT_NAMES[item.getSlot()];

    if (me[slot] !== null) {
      // Make sure we dequip the item in the slot first.
      protocol.send(new packets.ModifyEquipmentPacket({
          slot: item.getSlot(),
          inventoryIndex: null
      }));
    }

    protocol.send(new packets.ModifyEquipmentPacket({
        slot: item.getSlot(),
        inventoryIndex: index
    }));
  }

  getInventoryActions() {
    var actions = super.getInventoryActions();
    actions.unshift({
        title: "Equip",
        f: this.doEquip.bind(this)
    });
    return actions;
  }
}

Equipment.SLOT_NAMES = {
    0: "headItem",
    1: "torsoItem",
    2: "legsItem",
    3: "feetItem",
    4: "weapon"
};
