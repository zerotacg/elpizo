module names from "./constants/names";
import {Realm, Region, Entity, Directions} from "./models";

export function install(game) {
  var protocol = game.protocol;

  protocol.on("realm", (message) => {
    game.setRealm(new Realm(
        message.realm.id, message.realm.name, message.realm.size));
  });

  protocol.on("region", (message) => {
    if (message.region.position.realmId !== game.realm.id) {
      console.warn("Got invalid region realm ID (" + message.region.realmId +
                   ") for current realm (" + game.realm.id + "), discarding.");
      return;
    }

    game.realm.addRegion(new Region(
        message.region.position,
        message.region.corners.map((id) => names.terrain[id])));
  });

  protocol.on("entity", (message) => {
    if (message.entity.position.realmId !== game.realm.id) {
      console.warn("Got invalid region realm ID (" +
                   message.entity.position.realmId + ") for current realm (" +
                   game.realm.id + "), discarding.");
      return;
    }

    game.realm.addEntity(new Entity(
        message.entity.id, message.entity.name, message.entity.types,
        message.entity.position, message.entity.direction, []));
  });

  protocol.on("avatar", (message) => {
    game.setAvatarById(message.entityId);
  });

  protocol.on("move", (message) => {
    game.realm.getEntity(message.origin).moveInDirection(message.direction);
  });
}
