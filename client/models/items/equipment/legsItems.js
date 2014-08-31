module equipment from "client/models/items/equipment";

export class LegsItem extends equipment.Equipment {
  constructor(message) {
    super(message);
  }

  getSlot() {
    return 2;
  }
}

export class TealPants extends LegsItem {
  getSingularName() {
    return "teal pants";
  }

  getPluralName() {
    return "teal pants";
  }

  getIndefiniteName() {
    return "a pair of teal pants";
  }
}
TealPants.REGISTRY_TYPE = "teal_pants";
