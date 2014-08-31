module items from "client/models/items";

export class Carrot extends items.Item {
  getPluralTitle() {
    return "carrots";
  }

  getDefiniteTitle() {
    return "the carrot";
  }

  getIndefiniteTitle() {
    return "a carrot";
  }
}
Carrot.REGISTRY_TYPE = "carrot";
