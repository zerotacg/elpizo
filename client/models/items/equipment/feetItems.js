module equipment from "client/models/items/equipment";

export class FeetItem extends equipment.Equipment {
  constructor(message) {
    super(message);
  }

  getSlot() {
    return 3;
  }
}

export class BrownShoes extends FeetItem {
  getSingularName() {
    return "brown shoes";
  }

  getPluralName() {
    return "brown shoes";
  }

  getIndefiniteName() {
    return "a pair of brown shoes";
  }
}
BrownShoes.REGISTRY_TYPE = "brown_shoes";
