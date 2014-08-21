module fixtures from "client/models/fixtures";
module objects from "client/util/objects";

export function makeFixture(message) {
  if (!objects.hasOwnProp.call(fixtures.Fixture.REGISTRY,
                               message.fixtureType)) {
    return new fixtures.Fixture(message);
  }

  return new fixtures.Fixture.REGISTRY[message.fixtureType](message);
}
