module equipment from "client/models/items/equipment";

class Weapon extends equipment.Equipment {
  constructor(message) {
    super(message);
    message = message[".Weapon.ext"];
  }

  getSlot() {
    return 4;
  }
}

export class Dagger extends Weapon {
  getSingularName() {
    return "dagger";
  }

  getPluralName() {
    return "daggers";
  }

  getIndefiniteName() {
    return "a dagger";
  }
}
Dagger.REGISTRY_TYPE = "dagger";
