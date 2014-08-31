module equipment from "client/models/items/equipment";

export class TorsoItem extends equipment.Equipment {
  constructor(message) {
    super(message);
  }

  getSlot() {
    return 1;
  }
}

export class WhiteLongsleeveShirt extends TorsoItem {
  getSingularTitle() {
    return "white long-sleeved shirt";
  }

  getPluralTitle() {
    return "white long-sleeved shirts";
  }

  getIndefiniteTitle() {
    return "a white long-sleeved shirt";
  }
}
WhiteLongsleeveShirt.REGISTRY_TYPE = "white_longsleeve_shirt";
