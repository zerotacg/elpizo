module actors from "./actors";
module base from "./base";
module realm from "./realm";
module fixtures from "./fixtures";
module items from "./items";

export function makeEntity(message) {
  return new ({
      building: base.Building,
      drop: items.Drop,
      fixture: fixtures.Fixture,
      player: actors.Player
  })[message.type](message);
}
