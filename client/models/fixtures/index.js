module entities from "client/models/entities";

export class Fixture extends entities.Entity {
  constructor(message) {
    super(message);
    message = message.fixtureExt;

    this.fixtureType = message.fixtureType;
  }

  isPassable(location, direction) {
    return true;
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
