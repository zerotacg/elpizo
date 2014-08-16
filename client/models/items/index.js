import {Entity} from "../base";
module game_pb2 from "../../game_pb2";

export class Item {
  constructor(message) {
    this.id = message.id;
    this.type = message.type;
  }
}

export class Drop extends Entity {
  constructor(message) {
    super(message);
    message = message.dropExt;

    this.item = new Item(message.item);
  }

  getBbox() {
    return {
        aLeft: 0,
        aTop: 0,
        aRight: 1,
        aBottom: 1
    };
  }

  isPassable(location, direction) {
    return true;
  }

  onContainingInteract(protocol) {
    // Attempt to pick up the drop.
    protocol.send(new game_pb2.PickUpPacket({dropId: this.id}));
  }
}
Entity.TYPES["drop"] = Drop;
