export class Item {
  constructor(message) {
    this.type = message.type;
  }
}

Item.REGISTRY = {};
Item.register = (c2) => {
  Item.REGISTRY[c2.REGISTRY_TYPE] = c2;
};
