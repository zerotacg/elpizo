module exports from "client/exports";

module models from "client/models";
module geometry from "client/models/geometry";
module itemRegistry from "client/models/items/registry";
module realm from "client/models/realm";
module packets from "client/protos/packets";
module damage from "client/ui/overlay/damage.react";
module objects from "client/util/objects";
module timing from "client/util/timing";

export function install(game) {
  var protocol = game.protocol;
  var renderer = game.renderer;

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

  protocol.on(packets.Packet.Type.MOVE, (origin, message) => {
    var entity = game.realm.getEntity(origin);

    if (!renderer.getCacheBounds().intersects(entity.getTargetBounds())) {
      game.realm.removeEntity(origin);
    } else {
      game.realm.getEntity(origin).move();
    }
  });

  protocol.on(packets.Packet.Type.TURN, (origin, message) => {
    game.realm.getEntity(origin).direction = message.direction;
  });

  protocol.on(packets.Packet.Type.STOP_MOVE, (origin, message) => {
    game.realm.getEntity(origin).isMoving = false;
  });

  protocol.on(packets.Packet.Type.TELEPORT, (origin, message) => {
    var entity = game.realm.getEntity(origin);

    entity.stopMove();
    entity.location = geometry.Vector2.fromProtobuf(message.location);
    entity.direction = message.direction;
  });

  protocol.on(packets.Packet.Type.DESPAWN_ENTITY, (origin, message) => {
    var entity = game.realm.getEntity(origin);

    if (entity.realm.id !== game.realm.id) {
      console.warn("Got invalid entity realm ID (" +
                   entity.realmId + ") for current realm (" +
                   game.realm.id + "), discarding.");
      return;
    }

    game.realm.removeEntity(origin);
  });

  protocol.on(packets.Packet.Type.INVENTORY, (origin, message) => {
    game.me.inventory.push(itemRegistry.makeItem(message.item));
  });

  protocol.on(packets.Packet.Type.ATTACK, (origin, message) => {
    var entity = game.realm.getEntity(origin);
    entity.attack();
  });

  protocol.on(packets.Packet.Type.DAMAGE, (origin, message) => {
    var entity = game.realm.getEntity(origin);
    entity.health -= message.damage;
    renderer.addTimedComponent(damage.DamageNumber({
        damage: message.damage,
        entity: entity
    }), new timing.CountdownTimer(1));
  });
}
