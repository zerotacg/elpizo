module names from "./constants/names";
import {Realm, Region, Entity, Directions} from "./models";

import {Packet} from "./game_pb2";

export function install(game) {
  var protocol = game.protocol;

  protocol.on(Packet.Type.REALM, (origin, message) => {
    game.setRealm(new Realm(
        message.realm.id, message.realm.name, message.realm.size));
  });

  protocol.on(Packet.Type.REGION, (origin, message) => {;
    if (message.region.location.realmId !== game.realm.id) {
      console.warn("Got invalid region realm ID (" + message.region.realmId +
                   ") for current realm (" + game.realm.id + "), discarding.");
      return;
    }

    game.realm.addRegion(new Region(
        message.region.location,
        message.region.corners.map((id) => names.terrain[id])));
  });

  protocol.on(Packet.Type.ENTITY, (origin, message) => {
    if (message.entity.location.realmId !== game.realm.id) {
      console.warn("Got invalid region realm ID (" +
                   message.entity.location.realmId + ") for current realm (" +
                   game.realm.id + "), discarding.");
      return;
    }

    game.realm.addEntity(new Entity(
        message.entity.id, message.entity.name, message.entity.types,
        message.entity.location, message.entity.direction, []));
  });

  protocol.on(Packet.Type.AVATAR, (origin, message) => {
    game.setAvatarById(origin.id);
  });

  protocol.on(Packet.Type.MOVE, (origin, message) => {
    game.realm.getEntity(origin.id).moveInDirection(message.direction);
  });
}
