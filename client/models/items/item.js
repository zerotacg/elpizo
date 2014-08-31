module items from "client/protos/items";
module packets from "client/protos/packets";

export class Item {
  constructor(message) {
    this.type = message.type;
  }

  getSingularTitle() {
    return "(type: " + this.type + ", inflection: singular)";
  }

  getPluralTitle() {
    return "(type: " + this.type + ", inflection: plural)";
  }

  getIndefiniteTitle() {
    return "(type: " + this.type + ", inflection: indefinite)";
  }

  doDrop(protocol, me, index) {
    protocol.send(new packets.DiscardPacket({
        inventoryIndex: index
    }));
  }

  getInventoryActions() {
    return [{
        title: "Drop",
        f: this.doDrop.bind(this)
    }];
  }
}

Item.REGISTRY = {};
Item.register = (c2) => {
  Item.REGISTRY[c2.REGISTRY_TYPE] = c2;
};
