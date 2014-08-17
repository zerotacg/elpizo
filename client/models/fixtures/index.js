import {Entity} from "../base";
module exports from "../../exports";

export class Fixture extends Entity {
  constructor(message) {
    super(message);
    message = message.fixtureExt;

    this.fixtureType = message.fixtureType;
  }

  isPassable(location, direction) {
    return false;
  }

  onAdjacentInteract(protocol) {
    console.warn("NOT IMPLEMENTED: FIXTURE INTERACTION");
  }

  visit(visitor) {
    super.visit(visitor);
    visitor.visitFixture(this);
  }
}

Fixture.REGISTRY = {};
Fixture.register = (c2) => {
  Fixture.REGISTRY[c2.REGISTRY_TYPE] = c2;
};
