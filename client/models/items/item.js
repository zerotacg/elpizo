module items from "client/protos/items";

export class Item {
  constructor(message) {
    this.type = message.type;
  }

  getSingularName() {
    return "(type: " + this.type + ", inflection: singular)";
  }

  getPluralName() {
    return "(type: " + this.type + ", inflection: plural)";
  }

  getIndefiniteName() {
    return "(type: " + this.type + ", inflection: indefinite)";
  }
}

Item.REGISTRY = {};
Item.register = (c2) => {
  Item.REGISTRY[c2.REGISTRY_TYPE] = c2;
};
