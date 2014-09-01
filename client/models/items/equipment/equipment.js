module items from "client/models/items";
module packets from "client/protos/packets";
module logUi from "client/ui/log.react";

export class Equipment extends items.Item {
  constructor(message) {
    super(message);
    message = message[".Equipment.ext"];
  }

  doEquip(protocol, me, log) {
    var slot = Equipment.SLOT_NAMES[this.getSlot()];

    if (me[slot] !== null) {
      // Make sure we dequip the item in the slot first.
      protocol.send(new packets.ModifyEquipmentPacket({
          slot: this.getSlot(),
          itemId: null
      }));
      me.inventory[me[slot].id] = me[slot];
    }

    protocol.send(new packets.ModifyEquipmentPacket({
        slot: this.getSlot(),
        itemId: this.id
    }));
    me[slot] = this;
    me.discard(this);

    log.push(logUi.InfoMessageEntry({
        text: "You " + this.getEquipVerb() + " " + this.getDefiniteTitle() + "."
    }));
  }

  doDequip(protocol, me, log) {
    var slot = Equipment.SLOT_NAMES[this.getSlot()];

    me[slot] = null;
    me.addToInventory(this);

    protocol.send(new packets.ModifyEquipmentPacket({
        slot: this.getSlot(),
        itemId: null
    }));

    log.push(logUi.InfoMessageEntry({
        text: "You " + this.getDequipVerb() + " " + this.getDefiniteTitle() +
              "."
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
