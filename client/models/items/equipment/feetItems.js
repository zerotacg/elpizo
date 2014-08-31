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
  getSingularTitle() {
    return "brown shoes";
  }

  getPluralTitle() {
    return "brown shoes";
  }

  getIndefiniteTitle() {
    return "a pair of brown shoes";
  }
}
BrownShoes.REGISTRY_TYPE = "brown_shoes";
