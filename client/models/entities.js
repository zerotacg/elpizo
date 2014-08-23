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

  onContainingInteract(avatar, protocol) {
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
    message = message.buildingExt;

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
    message = message.dropExt;

    this.item = itemRegistry.makeItem(message.item);
  }

  onContainingInteract(avatar, protocol) {
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
    message = message.actorExt;

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

    this.moving = false;
    this.remainder = 0;
  }

  getPreviousLocation() {
    return this.location.offset(this.getDirectionVector());
  }

  getDirectionVector() {
    return getDirectionVector(this.direction);
  }

  moveInDirection(direction) {
    // Move the entity one tile in an axis direction.
    //
    // It will forcibly normalize the location (may be janky, but will always be
    // correct).
    var lastDirection = this.direction;

    this.location = this.location
        .offset(this.getDirectionVector().scale(this.remainder))
        .map(Math.round);

    this.direction = direction;

    var targetLocation = this.location
          .offset(this.getDirectionVector())
          .map(Math.round);

    if (!this.realm.isPassable(targetLocation, direction)) {
      this.remainder = 0;
      this.moving = lastDirection !== this.direction;
    } else {
      this.remainder = 1;
      this.moving = true;
    }

    if (!this.moving) {
      targetLocation = this.location;
    }

    return targetLocation;
  }

  getSpeed() {
    return Actor.BASE_SPEED;
  }

  update(dt) {
    super.update(dt);

    if (this.remainder > 0) {
      var aDistance = Math.min(this.getSpeed() * dt, this.remainder);

      this.location = this.location
          .offset(this.getDirectionVector().scale(aDistance))

      this.remainder -= aDistance;

      if (this.remainder <= 0) {
        this.location = this.location.map(Math.round);
        this.remainder = 0;
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
    if (this.remainder > 0) {
      return;
    }

    // Check for movement.
    var direction = inputState.isHeld(input.Key.LEFT) ? Directions.W :
                    inputState.isHeld(input.Key.UP) ? Directions.N :
                    inputState.isHeld(input.Key.RIGHT) ? Directions.E :
                    inputState.isHeld(input.Key.DOWN) ? Directions.S :
                    null;

    var wasMoving = this.moving;

    if (direction !== null) {
      var lastDirection = this.direction;
      var targetLocation = this.moveInDirection(direction);

      if (!targetLocation.equals(this.location) ||
          lastDirection !== this.direction) {
        // Send a move packet only if we've successfully moved.
        protocol.send(new packets.MovePacket({direction: direction}));

        // Trigger all target contacts.
        var target = this.location.offset(getDirectionVector(direction));

        this.realm.getAllEntities().filter((entity) =>
            entity.getBounds().contains(target)).forEach((entity) => {
            entity.onContact(this, protocol);
          })
      } else if (wasMoving) {
        // Otherwise, we're trying to move in a direction that's obstructed so
        // we stop moving and send StopMoves.
        this.moving = false;
        protocol.send(new packets.StopMovePacket());
      }
    } else if (this.moving) {
        // We've stopped moving entirely.
        this.moving = false;
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
        head.entity.onContainingInteract(this, protocol);
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

export class Mob extends Actor {
  visit(visitor) {
    super.visit(visitor);
    visitor.visitMob(this);
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
}
