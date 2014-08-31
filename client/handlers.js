module models from "client/models";
module entities from "client/models/entities";
module geometry from "client/models/geometry";
module equipment from "client/models/items/equipment";
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
      if (entity === null) {
        console.warn("Missing entity " + origin + "; probably transient.");
        return;
      }

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
    game.setRealm(new realm.Realm(message.id, message.realm));
  });

  protocol.on(packets.Packet.Type.REGION, (origin, message) => {
    if (message.realmId !== game.realm.id) {
      console.warn("Got invalid region realm ID (" + message.region.realmId +
                   ") for current realm (" + game.realm.id + "), discarding.");
      return;
    }

    var region = new realm.Region(
        geometry.Vector2.fromProtobuf(message.location), message.region);
    game.realm.addRegion(region);
  });

  protocol.on(packets.Packet.Type.ENTITY, (origin, message) => {
    if (message.entity.realmId !== game.realm.id) {
      console.warn("Got invalid entity realm ID (" +
                   message.entity.realmId + ") for current realm (" +
                   game.realm.id + "), discarding.");
      return;
    }

    if (objects.hasOwnProp.call(game.realm.entities, origin)) {
      console.warn("Entity " + origin + " already exists.");
    }

    game.realm.addEntity(origin, models.makeEntity(origin, message.entity));
  });

  protocol.on(packets.Packet.Type.AVATAR, (origin, message) => {
    game.setAvatarById(origin);
  });

  protocol.on(packets.Packet.Type.MOVE, withEntity((entity, message) => {
    entity.finishMove();

    var targetLocation = entity.getTargetLocation();
    var expectedLocation = geometry.Vector2.fromProtobuf(message.location);

    if (!targetLocation.equals(expectedLocation)) {
      console.warn("Entity " + entity.id + " will not move into the correct " +
                   "position. This is transient for large entities occupying " +
                   "multiple regions. (" +
                   "expected: " + expectedLocation.toString() + ", " +
                   "actual: " + targetLocation.toString() + ", " +
                   "original: " + entity.location.toString() +
                   ")");
      return;
    }

    entity.move();
  }));

  protocol.on(packets.Packet.Type.ENTER, (origin, message) => {
    if (objects.hasOwnProp.call(game.realm.entities, origin)) {
      return;
    }

    game.realm.addEntity(origin, models.makeEntity(origin, message.entity));
  });

  protocol.on(packets.Packet.Type.EXIT, withEntity((entity, message) => {
    if (!game.clientBounds.contains(new geometry.Rectangle(
        message.location.x, message.location.y,
        realm.Region.SIZE, realm.Region.SIZE))) {
      // If no target locations are contained by the client bounds, we remove
      // the entity.
      game.realm.removeEntity(entity.id);
    }
  }));

  protocol.on(packets.Packet.Type.TURN, withEntity((entity, message) => {
    entity.turn(message.direction);
  }));

  protocol.on(packets.Packet.Type.STOP_MOVE, withEntity((entity, message) => {
    entity.stopMove();
  }));

  protocol.on(packets.Packet.Type.TELEPORT, withEntity((entity, message) => {
    console.warn("Entity " + entity.id + " teleported!");

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

  protocol.on(packets.Packet.Type.DISCARD, withEntity((entity, message) => {
    var item = entity.inventory[message.inventoryIndex];
    entity.discard(message.inventoryIndex);

    if (entity === game.me) {
      game.appendToLog(log.InfoMessageEntry({
          text: "You drop " + item.getDefiniteTitle() + "."
      }));
    }
  }));

  protocol.on(packets.Packet.Type.INVENTORY, withEntity((entity, message) => {
    var item = itemRegistry.makeItem(message.item);
    entity.inventory.push(item);

    if (entity === game.me) {
      game.appendToLog(log.InfoMessageEntry({
          text: "You put " + item.getDefiniteTitle() + " in your bag."
      }));
    }
  }));

  protocol.on(packets.Packet.Type.ATTACK, withEntity((entity, message) => {
    entity.attack();
  }));

  protocol.on(packets.Packet.Type.DAMAGE, withEntity((entity, message) => {
    entity.health -= message.damage;
    renderer.addComponent(
        ["damage", entity.id].join("."),
        damage.DamageNumber({
            damage: message.damage,
            entity: entity,
            timer: new timing.CountdownTimer(1)
        }));
  }));

  protocol.on(packets.Packet.Type.CHAT, (origin, message) => {
    game.appendToLog(log.ChatMessageEntry({
        origin: message.actorName,
        text: message.text
    }));

    var entity = game.realm.getEntity(origin);

    if (entity !== null) {
      renderer.addChatBubble(entity, message.text);
    }
  });

  protocol.on(packets.Packet.Type.ECHO, (origin, message) => {
    var startTime = parseFloat(message.payload);
    var endTime = new Date().valueOf();

    game.appendToLog(log.InfoMessageEntry({
        text: "Latency: " + (endTime - startTime) + "ms"
    }));
  });

  protocol.on(packets.Packet.Type.MODIFY_EQUIPMENT, withEntity((entity, message) => {
    var slot = equipment.Equipment.SLOT_NAMES[message.slot];

    if (message.inventoryIndex !== null) {
      // Handle equipping.
      var item = entity.inventory[message.inventoryIndex];
      entity[slot] = item;
      entity.discard(message.inventoryIndex);

      if (entity === game.me) {
        game.appendToLog(log.InfoMessageEntry({
            text: "You " + item.getEquipVerb() + " " + item.getDefiniteTitle() +
                  "."
        }));
      }
    } else {
      // Handle dequipping.
      entity[slot] = null;
    }
  }));
}
