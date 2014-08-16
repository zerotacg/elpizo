import {Entity} from "./base";
import {Item} from "./items";

import {Key} from "../util/input";
module game_pb2 from "../game_pb2";

export var Directions = {
    N: 0,
    W: 1,
    S: 2,
    E: 3
};

// Get the direction constant for a given axis vector.
//
// Returns -1 on an invalid direction.
export function getDirectionConstant(dx, dy) {
  if (dy < 0) {
    return Directions.N;
  } else if (dx < 0) {
    return Directions.W;
  } else if (dy > 0) {
    return Directions.S;
  } else if (dx > 0) {
    return Directions.E;
  }

  return -1;
}

export function getDirectionVector(d) {
  switch (d) {
    case Directions.N: return {ax:  0, ay: -1};
    case Directions.W: return {ax: -1, ay:  0};
    case Directions.S: return {ax:  0, ay:  1};
    case Directions.E: return {ax:  1, ay:  0};
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

    this.headItem = message.headItem && new Item(message.headItem);
    this.torsoItem = message.torsoItem && new Item(message.torsoItem);
    this.legsItem = message.legsItem && new Item(message.legsItem);
    this.feetItem = message.feetItem && new Item(message.feetItem);

    this.moving = false;
    this.remainder = 0;
  }

  getPreviousLocation() {
    var ad = this.getDirectionVector();
    return {
        ax: this.location.ax - ad.ax,
        ay: this.location.ay - ad.ay
    }
  }

  getDirectionVector() {
    return getDirectionVector(this.direction);
  }

  getBbox() {
    return {
        aLeft: 0,
        aTop: 0,
        aRight: 1,
        aBottom: 1
    };
  }

  isPassable(location, direction) {
    return true;
  }

  moveInDirection(direction) {
    // Move the entity one tile in an axis direction.
    //
    // It will forcibly normalize the location (may be janky, but will always be
    // correct).
    var lastDirection = this.direction;

    var unit = getDirectionVector(this.direction);
    this.location.ax = Math.round(this.location.ax + unit.ax * this.remainder);
    this.location.ay = Math.round(this.location.ay + unit.ay * this.remainder);

    this.direction = direction;
    unit = getDirectionVector(this.direction);

    if (!this.realm.isPassable({
        ax: Math.round(this.location.ax + unit.ax),
        ay: Math.round(this.location.ay + unit.ay)
    }, direction)) {
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
      var unit = getDirectionVector(this.direction);
      var aDistance = Math.min(this.getSpeed() * dt, this.remainder);

      this.location.ax += unit.ax * aDistance;
      this.location.ay += unit.ay * aDistance;
      this.emit("moveStep", {aDistance: aDistance});
      this.remainder -= aDistance;

      if (this.remainder <= 0) {
        this.location.ax = Math.round(this.location.ax);
        this.location.ay = Math.round(this.location.ay);
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

    if (direction !== null) {
      var wasMoving = this.moving;

      if (this.moveInDirection(direction)) {
        // Send a move packet only if we've successfully moved.
        protocol.send(new game_pb2.MovePacket({direction: direction}));
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
    var dv = getDirectionVector(this.direction);

    var interactions = [];

    if (inputState.unstick(Key.Z)) {
      this.realm.getAllEntities().forEach((entity) => {
        if (entity === this) {
          return;
        }

        if (entity.contains(this.location)) {
          interactions.push({
              entity: entity,
              contained: true
          });
        } else if (entity.contains({
            ax: this.location.ax + dv.ax,
            ay: this.location.ay + dv.ay
        })) {
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
        head.entity.onContainingInteract(protocol);
      } else {
        head.entity.onAdjacentInteract(protocol);
      }
    }
  }

  visit(visitor) {
    super.visit(visitor);
    visitor.visitPlayer(this);
  }
}
