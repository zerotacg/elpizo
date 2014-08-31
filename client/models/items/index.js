module items from "client/protos/items";

export class Item {
  constructor(message) {
    this.type = message.type;
  }
}

Item.REGISTRY = {};
Item.register = (c2) => {
  Item.REGISTRY[c2.REGISTRY_TYPE] = c2;
};

export class Equipment extends Item {

}

Equipment.SLOTS = {
    headItem: items.Equipment.Slot.HEAD_ITEM,
    torsoItem: items.Equipment.Slot.TORSO_ITEM,
    legsItem: items.Equipment.Slot.LEGS_ITEM,
    feetItem: items.Equipment.Slot.FEET_ITEM,
    weapon: items.Equipment.Slot.WEAPON
};

Equipment.SLOT_NAMES = {}
Object.keys(Equipment.SLOTS).forEach((k) => {
  Equipment.SLOT_NAMES[Equipment.SLOTS[k]] = k;
});
