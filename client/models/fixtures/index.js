import {Entity} from "../base";
module exports from "../../exports";

export class Fixture extends Entity {
  constructor(message) {
    super(message);
    message = message.fixtureExt;

    this.fixtureType = exports.fixtureTypes[message.fixtureTypeId];
  }

  getBbox() {
    return this.fixtureType.bbox;
  }

  isPassable(location, direction) {
    return false;
  }

  onAdjacentInteract(protocol) {
    console.warn("NOT IMPLEMENTED: FIXTURE INTERACTION");
  }
}
Entity.TYPES["fixture"] = Fixture;
