module entities from "client/models/entities";
module fixtureRegistry from "client/models/fixtures/registry";

export function makeEntity(id, message) {
  switch (message.type) {
    case "building":
      return new entities.Building(id, message);

    case "drop":
      return new entities.Drop(id, message);

    case "fixture":
      return fixtureRegistry.makeFixture(id, message);

    case "player":
      return new entities.Player(id, message);

    case "npc":
      return new entities.NPC(id, message);

    case "avatar":
      return new entities.Avatar(id, message);
  }

  throw new Error("Could not make entity of type: " + message.type);
}
