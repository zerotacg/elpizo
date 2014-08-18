import {Entity} from "./base";
import {makeItem} from "./items/registry";

import {Key} from "../util/input";
import {Vector2} from "../util/geometry";
module game_pb2 from "../game_pb2";

export var Directions = {
    N: 0,
    W: 1,
    S: 2,
    E: 3
};

export function getDirectionVector(d) {
  switch (d) {
    case Directions.N: return new Vector2( 0, -1);
    case Directions.W: return new Vector2(-1,  0);
    case Directions.S: return new Vector2( 0,  1);
    case Directions.E: return new Vector2( 1,  0);
  }
}

export class Actor extends Entity {
  constructor(message) {
    super(message);
    message = message.actorExt;

    this.name = message.name;
    this.gender = message.gender;
    this.body = message.body;
    this.hair = message.hair;
    this.facial = message.facial;

    this.headItem = message.headItem && makeItem(message.headItem);
    this.torsoItem = message.torsoItem && makeItem(message.torsoItem);
    this.legsItem = message.legsItem && makeItem(message.legsItem);
    this.feetItem = message.feetItem && makeItem(message.feetItem);

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
        .elementwise(Math.round);

    this.direction = direction;

    if (!this.realm.isPassable(this.location
        .offset(this.getDirectionVector())
        .elementwise(Math.round), direction)) {
      this.remainder = 0;
      this.moving = lastDirection !== this.direction;
    } else {
      this.remainder = 1;
      this.moving = true;
    }

    if (this.moving) {
      this.emit("moveStart", this.location);
    }

    return this.moving;
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

      this.emit("moveStep", {aDistance: aDistance});
      this.remainder -= aDistance;

      if (this.remainder <= 0) {
        this.location = this.location.elementwise(Math.round);
        this.remainder = 0;
        this.emit("moveEnd", this.location);
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
    var direction = inputState.isHeld(Key.LEFT) ? Directions.W :
                    inputState.isHeld(Key.UP) ? Directions.N :
                    inputState.isHeld(Key.RIGHT) ? Directions.E :
                    inputState.isHeld(Key.DOWN) ? Directions.S :
                    null;

    var wasMoving = this.moving;

    if (direction !== null) {
      if (this.moveInDirection(direction)) {
        // Send a move packet only if we've successfully moved.
        protocol.send(new game_pb2.MovePacket({direction: direction}));

        // Trigger all target contacts.
        var target = this.location.offset(getDirectionVector(direction));

        this.realm.getAllEntities().filter((entity) =>
            entity.getAbsoluteBounds().contains(target)).forEach((entity) => {
            entity.onContact(this, protocol);
          })
      } else if (wasMoving) {
        // Otherwise, we're trying to move in a direction that's obstructed so
        // we stop moving and send StopMoves.
        this.moving = false;
        protocol.send(new game_pb2.StopMovePacket());
      }
    } else if (this.moving) {
        // We've stopped moving entirely.
        this.moving = false;
        protocol.send(new game_pb2.StopMovePacket());
    }

    // Check for interactions.
    var interactions = [];

    if (inputState.unstick(Key.Z)) {
      this.realm.getAllEntities().forEach((entity) => {
        if (entity === this) {
          return;
        }

        if (entity.getAbsoluteBounds().contains(this.location)) {
          interactions.push({
              entity: entity,
              contained: true
          });
        } else if (entity.getAbsoluteBounds().contains(
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
