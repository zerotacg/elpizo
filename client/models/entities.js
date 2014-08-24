module geometry from "client/models/geometry";
module itemRegistry from "client/models/items/registry";
module packets from "client/protos/packets";
module input from "client/util/input";

export class Entity {
  constructor(message) {
    this.id = message.id;
    this.type = message.type;
    this.realmId = message.realmId;
    this.location = geometry.Vector2.fromProtobuf(message.location);
    this.bbox = geometry.Rectangle.fromProtobuf(message.bbox);
    this.direction = message.direction;
  }

  getBounds() {
    return this.bbox.offset(this.location);
  }

  update(dt) {
  }

  onAdjacentInteract(avatar, protocol) {
  }

  onIntersectingInteract(avatar, protocol) {
  }

  onContact(avatar, protocol) {
  }

  isPassable(location, direction) {
    return true;
  }

  visit(visitor) {
    visitor.visitEntity(this);
  }
}

export class Building extends Entity {
  constructor(message) {
    super(message);
    message = message[".Building.ext"];

    this.doorPosition = message.doorPosition;
  }

  visit(visitor) {
    super.visit(visitor);
    visitor.visitBuilding(this);
  }

  isPassable(location, direction) {
    if (location.x == this.getBounds().left + this.doorPosition &&
        location.y == this.getBounds().getBottom() - 1) {
      return true;
    }
    return false;
  }
}

export class Drop extends Entity {
  constructor(message) {
    super(message);
    message = message[".Drop.ext"];

    this.item = itemRegistry.makeItem(message.item);
  }

  onIntersectingInteract(avatar, protocol) {
    // Attempt to pick up the drop.
    protocol.send(new packets.PickUpPacket({dropId: this.id}));
  }

  visit(visitor) {
    super.visit(visitor);
    visitor.visitDrop(this);
  }
}
export var Directions = {
    N: 0,
    W: 1,
    S: 2,
    E: 3
};

export function getDirectionVector(d) {
  switch (d) {
    case Directions.N: return new geometry.Vector2( 0, -1);
    case Directions.W: return new geometry.Vector2(-1,  0);
    case Directions.S: return new geometry.Vector2( 0,  1);
    case Directions.E: return new geometry.Vector2( 1,  0);
  }
}

export class Actor extends Entity {
  constructor(message) {
    super(message);
    message = message[".Actor.ext"];

    this.name = message.name;
    this.health = message.health;
    this.gender = message.gender;
    this.body = message.body;
    this.hair = message.hair;
    this.facial = message.facial;

    this.headItem = message.headItem && itemRegistry.makeItem(message.headItem);
    this.torsoItem = message.torsoItem && itemRegistry.makeItem(message.torsoItem);
    this.legsItem = message.legsItem && itemRegistry.makeItem(message.legsItem);
    this.feetItem = message.feetItem && itemRegistry.makeItem(message.feetItem);

    this.inventory = message.inventory.map(
      (message) => itemRegistry.makeItem(message));

    this.isMoving = false;
    this.moveRemaining = 0;
  }

  getPreviousLocation() {
    return this.location.offset(this.getDirectionVector());
  }

  getDirectionVector() {
    return getDirectionVector(this.direction);
  }

  step() {
    // Move the entity one tile forward.
    //
    // It will forcibly normalize the location (may be janky, but will always be
    // correct).
    this.location = this.location
        .offset(this.getDirectionVector().scale(this.moveRemaining))
        .map(Math.round);
    this.isMoving = true;
    this.moveRemaining = 1;
  }

  getSpeed() {
    return Actor.BASE_SPEED;
  }

  update(dt) {
    super.update(dt);

    if (this.moveRemaining > 0) {
      var aDistance = Math.min(this.getSpeed() * dt, this.moveRemaining);

      this.location = this.location
          .offset(this.getDirectionVector().scale(aDistance))

      this.moveRemaining -= aDistance;

      if (this.moveRemaining <= 0) {
        this.location = this.location.map(Math.round);
        this.moveRemaining = 0;
      }
    }
  }

  visit(visitor) {
    super.visit(visitor);
    visitor.visitActor(this);
  }
}

Actor.BASE_SPEED = 5;

export class Player extends Actor {
  updateAsAvatar(dt, inputState, protocol) {
    if (this.moveRemaining > 0) {
      return;
    }

    // Check for movement.
    var direction = inputState.held(input.Key.LEFT) ? Directions.W :
                    inputState.held(input.Key.UP) ? Directions.N :
                    inputState.held(input.Key.RIGHT) ? Directions.E :
                    inputState.held(input.Key.DOWN) ? Directions.S :
                    null;

    var move = !inputState.held(input.Key.ALT);

    var didMove = false;

    if (direction !== null) {
      if (this.direction !== direction) {
        // Send a turn packet.
        this.direction = direction;
        protocol.send(new packets.TurnPacket({direction: direction}))
      } else if (move) {
        var target = this.location.offset(this.getDirectionVector());
        var targetBounds = this.bbox.offset(target);

        var intersecting = this.realm.getAllEntities()
            .filter((entity) =>
                entity.getBounds().intersects(targetBounds) && entity !== this);

        if (this.realm.isPassable(target, this.direction) &&
            intersecting.length === 0) {
          this.step();
          didMove = true;

          protocol.send(new packets.MovePacket());

          // Trigger all target contacts (before we arrive, but this is the
          // only time we can guarantee it.)
          // NOTE: not reachable code right now, but will be once
          // intersectability is implemented
          intersecting
              .forEach((entity) =>
                entity.onContact(this, protocol));
        }
      }
    }

    if (!didMove && this.isMoving) {
      // We've stopped moving entirely.
      this.isMoving = false;
      protocol.send(new packets.StopMovePacket());
    }

    // Check for interactions.
    var interactions = [];

    if (inputState.unstick(input.Key.Z)) {
      this.realm.getAllEntities().forEach((entity) => {
        if (entity === this) {
          return;
        }

        if (entity.getBounds().contains(this.location)) {
          interactions.push({
              entity: entity,
              contained: true
          });
        } else if (entity.getBounds().contains(
            this.location.offset(this.getDirectionVector()))) {
          interactions.push({
              entity: entity,
              contained: false
          });
        }
      });

      console.log(interactions);

      if (interactions.length === 0) {
        return;
      }

      if (interactions.length > 1) {
        console.warn("NOT IMPLEMENTED: MULTIPLE ENTITY INTERACTION");
        return;
      }

      var head = interactions[0];
      if (head.contained) {
        head.entity.onIntersectingInteract(this, protocol);
      } else {
        head.entity.onAdjacentInteract(this, protocol);
      }
    }
  }

  visit(visitor) {
    super.visit(visitor);
    visitor.visitPlayer(this);
  }
}

export class NPC extends Actor {
  constructor(message) {
    super(message);
    message = message[".NPC.ext"];

    this.species = message.species;
  }

  visit(visitor) {
    super.visit(visitor);
    visitor.visitNPC(this);
  }
}

export class EntityVisitor {
  visitEntity(entity) {
  }

  visitBuilding(building) {
  }

  visitDrop(drop) {
  }

  visitActor(actor) {
  }

  visitPlayer(player) {
  }

  visitNPC(npc) {
  }
}
