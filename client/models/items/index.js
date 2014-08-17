import {Entity} from "../base";
module game_pb2 from "../../game_pb2";

export class Item {
  constructor(message) {
    this.id = message.id;
    this.type = message.type;
  }
}

Item.REGISTRY = {};
Item.register = (c2) => {
  Item.REGISTRY[c2.REGISTRY_TYPE] = c2;
};
