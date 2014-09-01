module equipment from "client/models/items/equipment";

class Weapon extends equipment.Equipment {
  constructor(message) {
    super(message);
    message = message[".Weapon.ext"];
  }

  getSlot() {
    return 4;
  }

  getEquipVerb() {
    return "wield";
  }

  getDequipVerb() {
    return "stop wielding";
  }
}

export class Dagger extends Weapon {
  getPluralTitle() {
    return "daggers";
  }

  getDefiniteTitle() {
    return "the dagger";
  }

  getIndefiniteTitle() {
    return "a dagger";
  }
}
Dagger.REGISTRY_TYPE = "dagger";
