module exports from "client/exports";

module models from "client/models";
module geometry from "client/models/geometry";
module itemRegistry from "client/models/items/registry";
module realm from "client/models/realm";
module packets from "client/protos/packets";
module damage from "client/ui/overlay/damage.react";
module objects from "client/util/objects";
module timing from "client/util/timing";
module log from "client/ui/log.react";

export function install(game) {
  var protocol = game.protocol;
  var renderer = game.renderer;

  function withEntity(f) {
    return (origin, message) => {
      var entity = game.realm.getEntity(origin);

      if (entity.realm.id !== game.realm.id) {
        console.warn("Got invalid entity realm ID (" +
                     entity.realmId + ") for current realm (" +
                     game.realm.id + "), discarding.");
        return;
      }

      return f(entity, message);
    }
  }

  protocol.on(packets.Packet.Type.REALM, (origin, message) => {
    game.setRealm(new realm.Realm(message.realm));
  });

  protocol.on(packets.Packet.Type.REGION, (origin, message) => {
    if (message.region.realmId !== game.realm.id) {
      console.warn("Got invalid region realm ID (" + message.region.realmId +
                   ") for current realm (" + game.realm.id + "), discarding.");
      return;
    }

    var region = new realm.Region(message.region);
    game.realm.addRegion(region);
  });

  protocol.on(packets.Packet.Type.ENTITY, (origin, message) => {
    if (message.entity.realmId !== game.realm.id) {
      console.warn("Got invalid entity realm ID (" +
                   message.entity.realmId + ") for current realm (" +
                   game.realm.id + "), discarding.");
      return;
    }

    if (objects.hasOwnProp.call(game.realm.entities, message.entity.id)) {
      return;
    }

    game.realm.addEntity(origin, models.makeEntity(message.entity));
  });

  protocol.on(packets.Packet.Type.AVATAR, (origin, message) => {
    game.setAvatarById(origin);
  });

  protocol.on(packets.Packet.Type.MOVE, withEntity((entity, message) => {
    if (!renderer.getCacheBounds().intersects(entity.getTargetBounds())) {
      game.realm.removeEntity(entity.id);
    } else {
      entity.move();
    }
  }));

  protocol.on(packets.Packet.Type.TURN, withEntity((entity, message) => {
    entity.turn(message.direction);
  }));

  protocol.on(packets.Packet.Type.STOP_MOVE, withEntity((entity, message) => {
    entity.isMoving = false;
  }));

  protocol.on(packets.Packet.Type.TELEPORT, withEntity((entity, message) => {
    entity.stopMove();
    entity.location = geometry.Vector2.fromProtobuf(message.location);
    entity.direction = message.direction;
  }));


  protocol.on(packets.Packet.Type.STATUS, withEntity((entity, message) => {
    game.appendToLog(log.StatusMessageEntry({
        origin: entity.name,
        text: (message.online ? "connected" : "disconnected") + "."
    }));
  }));

  protocol.on(packets.Packet.Type.DESPAWN_ENTITY, withEntity((entity, message) => {
    game.realm.removeEntity(entity.id);
  }));

  protocol.on(packets.Packet.Type.DEATH, withEntity((entity, message) => {
    entity.isDying = true;
    game.realm.removeEntity(entity.id);
  }));

  protocol.on(packets.Packet.Type.INVENTORY, (origin, message) => {
    var item = itemRegistry.makeItem(message.item);
    game.me.inventory.push(item);
    game.appendToLog(log.InfoMessageEntry({text: "You picked up: " + item.type}));
  });

  protocol.on(packets.Packet.Type.ATTACK, withEntity((entity, message) => {
    entity.attack();
  }));

  protocol.on(packets.Packet.Type.DAMAGE, withEntity((entity, message) => {
    entity.health -= message.damage;
    renderer.addTimedComponent(damage.DamageNumber({
        damage: message.damage,
        entity: entity
    }), new timing.CountdownTimer(1));
  }));

  protocol.on(packets.Packet.Type.CHAT, (origin, message) => {
    game.appendToLog(log.ChatMessageEntry({
        origin: message.actorName,
        text: message.text
    }));
  });

  protocol.on(packets.Packet.Type.ECHO, (origin, message) => {
    var startTime = parseFloat(message.payload);
    var endTime = new Date().valueOf();

    game.appendToLog(log.InfoMessageEntry({
        text: "Latency: " + (endTime - startTime) + "ms"
    }));
  });
}
