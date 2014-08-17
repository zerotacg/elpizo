import {hasOwnProp} from "../../util/objects";
import {Fixture} from "../fixtures";

export function makeFixture(message) {
  if (!hasOwnProp.call(Fixture.REGISTRY, message.fixtureType)) {
    return new Fixture(message);
  }

  return new Fixture.REGISTRY[message.fixtureType](message);
}
