module equipment from "client/models/items/equipment";

export class LegsItem extends equipment.Equipment {
  constructor(message) {
    super(message);
  }

  getSlot() {
    return 2;
  }

  getEquipVerb() {
    return "put on";
  }

  getDequipVerb() {
    return "take off";
  }
}

export class TealPants extends LegsItem {
  getPluralTitle() {
    return "teal pants";
  }

  getDefiniteTitle() {
    return "the pair of teal pants";
  }

  getIndefiniteTitle() {
    return "a pair of teal pants";
  }
}
TealPants.REGISTRY_TYPE = "teal_pants";
