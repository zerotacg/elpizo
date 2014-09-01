module equipment from "client/models/items/equipment";

export class TorsoItem extends equipment.Equipment {
  constructor(message) {
    super(message);
  }

  getSlot() {
    return 1;
  }

  getEquipVerb() {
    return "put on";
  }

  getDequipVerb() {
    return "take off";
  }
}

export class WhiteLongsleeveShirt extends TorsoItem {
  getPluralTitle() {
    return "white long-sleeved shirts";
  }

  getDefiniteTitle() {
    return "the white long-sleeved shirt";
  }

  getIndefiniteTitle() {
    return "a white long-sleeved shirt";
  }
}
WhiteLongsleeveShirt.REGISTRY_TYPE = "white_longsleeve_shirt";
