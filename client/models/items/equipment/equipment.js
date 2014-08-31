module items from "client/models/items";

export class Equipment extends items.Item {
  constructor(message) {
    super(message);
    message = message[".Equipment.ext"];
  }

  accept(visitor) {
    visitor.visitEquipment(this);
  }
}

Equipment.SLOT_NAMES = {
    0: "headItem",
    1: "torsoItem",
    2: "legsItem",
    3: "feetItem",
    4: "weapon"
};
