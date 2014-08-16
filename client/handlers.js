module exports from "./exports";
import {Entity} from "./models/base";
import {Directions} from "./models/actors";
import {Realm, Region} from "./models/realm";

import {Packet} from "./game_pb2";

export function install(game) {
  var protocol = game.protocol;

  protocol.on(Packet.Type.REALM, (origin, message) => {
    game.setRealm(new Realm(message.realm));
  });

  protocol.on(Packet.Type.REGION, (origin, message) => {
    if (message.region.location.realmId !== game.realm.id) {
      console.warn("Got invalid region realm ID (" + message.region.realmId +
                   ") for current realm (" + game.realm.id + "), discarding.");
      return;
    }

    var region = new Region(message.region);
    game.realm.addRegion(region);
  });

  protocol.on(Packet.Type.ENTITY, (origin, message) => {
    if (message.entity.location.realmId !== game.realm.id) {
      console.warn("Got invalid entity realm ID (" +
                   message.entity.location.realmId + ") for current realm (" +
                   game.realm.id + "), discarding.");
      return;
    }

    game.realm.addEntity(new (Entity.TYPES[message.entity.type])(
        message.entity));
  });

  protocol.on(Packet.Type.AVATAR, (origin, message) => {
    game.setAvatarById(origin);
  });

  protocol.on(Packet.Type.MOVE, (origin, message) => {
    game.realm.getEntity(origin).moveInDirection(message.direction);
  });

  protocol.on(Packet.Type.STOP_MOVE, (origin, message) => {
    game.realm.getEntity(origin).moving = false;
  });

  protocol.on(Packet.Type.TELEPORT, (origin, message) => {
    var entity = game.realm.getEntity(origin);

    if (message.location.realmId !== game.realm.id) {
      console.warn("Got invalid teleport realm ID (" +
                   message.location.realmId + ") for current realm (" +
                   game.realm.id + "), discarding.");
      return;
    }

    entity.moving = false;
    entity.remainder = 0;
    entity.location = {
        ax: message.location.ax,
        ay: message.location.ay
    };
    entity.direction = message.direction;
  });

  protocol.on(Packet.Type.DESPAWN_ENTITY, (origin, message) => {
    var entity = game.realm.getEntity(origin);

    if (entity.realm.id !== game.realm.id) {
      console.warn("Got invalid entity realm ID (" +
                   entity.location.realmId + ") for current realm (" +
                   game.realm.id + "), discarding.");
      return;
    }

    game.realm.removeEntity(entity);
  });

  protocol.on(Packet.Type.INVENTORY, (origin, message) => {
    console.warn("NOT IMPLEMENTED: INVENTORY");
  });
}
