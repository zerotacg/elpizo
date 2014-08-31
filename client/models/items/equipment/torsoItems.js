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
  getSingularName() {
    return "white long-sleeved shirt";
  }

  getPluralName() {
    return "white long-sleeved shirts";
  }

  getIndefiniteName() {
    return "a white long-sleeved shirt";
  }
}
WhiteLongsleeveShirt.REGISTRY_TYPE = "white_longsleeve_shirt";
