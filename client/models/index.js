module entities from "client/models/entities";
module fixtureRegistry from "client/models/fixtures/registry";

export function makeEntity(message) {
  switch (message.type) {
    case "building":
      return new entities.Building(message);

    case "drop":
      return new entities.Drop(message);

    case "fixture":
      return fixtureRegistry.makeFixture(message);

    case "player":
      return new entities.Player(message);
  }

  console.error("Could not make entity of type:", message.type);
}
