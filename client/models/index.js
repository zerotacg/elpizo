import {Player} from "./actors";
import {Building, Drop} from "./base";
import {makeFixture} from "./fixtures/registry";

export function makeEntity(message) {
  switch (message.type) {
    case "building":
      return new Building(message);

    case "drop":
      return new Drop(message);

    case "fixture":
      return makeFixture(message);

    case "player":
      return new Player(message);
  }

  console.error("Could not make entity of type:", message.type);
}
