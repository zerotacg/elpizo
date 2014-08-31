module equipment from "client/models/items/equipment";

export class FeetItem extends equipment.Equipment {
  constructor(message) {
    super(message);
  }

  getSlot() {
    return 3;
  }

  getEquipVerb() {
    return "put on";
  }
}

export class BrownShoes extends FeetItem {
  getPluralTitle() {
    return "brown shoes";
  }

  getDefiniteTitle() {
    return "the brown shoes";
  }

  getIndefiniteTitle() {
    return "a pair of brown shoes";
  }
}
BrownShoes.REGISTRY_TYPE = "brown_shoes";
