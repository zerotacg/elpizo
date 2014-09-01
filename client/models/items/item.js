module items from "client/protos/items";
module packets from "client/protos/packets";
module logUi from "client/ui/log.react";

export class Item {
  constructor(message) {
    this.id = message.id;
    this.type = message.type;
  }

  getPluralTitle() {
    return "(type: " + this.type + ", inflection: plural)";
  }

  getDefiniteTitle() {
    return "(type: " + this.type + ", inflection: definite)";
  }

  getIndefiniteTitle() {
    return "(type: " + this.type + ", inflection: indefinite)";
  }

  doDrop(protocol, me, log) {
    protocol.send(new packets.DiscardPacket({
        itemId: this.id
    }));
    me.discard(this);
    log.push(logUi.InfoMessageEntry({
        text: "You drop " + this.getDefiniteTitle() + " onto the ground."
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
