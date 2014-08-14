import {EventEmitter} from "events";

import {nubBy, repeat} from "./util/collections";
import {Grid} from "./util/grid";
import {hasOwnProp} from "./util/objects";
import {Key} from "./util/input";

module game_pb2 from "./game_pb2";
module exports from "./exports";
module coords from "./util/coords";

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

export class Realm {
  constructor(message) {
    this.id = message.id;
    this.name = message.name;
    this.size = {
        aw: message.size.aw,
        ah: message.size.ah
    };
    this.terrainLayers = message.terrainLayers;

    this.regions = {};
    this.entities = {};
  }

  addRegion(region) {
    this.regions[region.getKey()] = region;
    region.realm = this;
  }

  removeRegion(region) {
    delete this.regions[region.getKey()];
    delete region.realm;
  }

  getRegion(location) {
    var key = [location.arx, location.ary].join(",");
    return hasOwnProp.call(this.regions, key) ? this.regions[key] : null;
  }

  getAllRegions() {
    return Object.keys(this.regions).map((k) => this.regions[k]);
  }

  retainRegions(bbox) {
    // This should only be called at region boundaries, to ensure that
    // off-screen regions aren't culled away prematurely.
    Object.keys(this.regions).map((k) => {
      var region = this.regions[k];

      if (region.location.arx < bbox.arLeft ||
          region.location.arx >= bbox.arRight ||
          region.location.ary < bbox.arTop ||
          region.location.ary >= bbox.arBottom) {
        delete this.regions[k];
      }
    });

    Object.keys(this.entities).map((k) => {
      var entity = this.entities[k];

      var arEntityLocation = coords.absoluteToContainingRegion(
          entity.location);

      if (arEntityLocation.arx < bbox.arLeft ||
          arEntityLocation.arx >= bbox.arRight ||
          arEntityLocation.ary < bbox.arTop ||
          arEntityLocation.ary >= bbox.arBottom) {
        delete this.entities[k];
      }
    });
  }

  getClosestRegion(location) {
    return this.getRegion(coords.absoluteToContainingRegion(location));
  }

  isPassable(location, direction) {
    var region = this.getClosestRegion(location);
    if (region === null ||
        !region.isPassable(coords.absoluteToRelative(location), direction)) {
      return false;
    }

    if (this.getAllEntities().filter(
        (entity) => entity.type == "Fixture").some((entity) => {
      return location.ax >= entity.location.ax + entity.fixtureType.size.aLeft &&
             location.ax < entity.location.ax + entity.fixtureType.size.aRight &&
             location.ay >= entity.location.ay + entity.fixtureType.size.aTop &&
             location.ay < entity.location.ay + entity.fixtureType.size.aBottom;
    })) {
      return false;
    }

    return true;
  }

  addEntity(entity) {
    entity.realm = this;
    this.entities[entity.id] = entity;
  }

  removeEntity(entity) {
    delete this.entities[entity.id];
    delete entity.realm;
  }

  getEntity(id) {
    return hasOwnProp.call(this.entities, id) ? this.entities[id] : null;
  }

  getAllEntities() {
    return Object.keys(this.entities).map((k) => this.entities[k]);
  }

  update(dt) {
    this.getAllEntities().forEach((entity) => {
      entity.update(dt);
    });
  }
}

export class Region {
  constructor(message) {
    this.location = {
        arx: message.location.arx,
        ary: message.location.ary
    };
    this.layers = message.layers.map((layer) =>
        new Layer(layer));
    this.passabilities = new Grid(coords.REGION_SIZE, coords.REGION_SIZE,
                                  message.passabilities);
  }

  getKey() {
    return [this.location.arx, this.location.ary].join(",");
  }

  isPassable(location, direction) {
    return !!((this.passabilities.getCell(location.rx, location.ry) >>
        direction) & 0x1);
  }
}

Region.TERRAIN_BLENDS = {};
Region.TERRAIN_PREDECENCES = [
    "beach",
    "subtropical_desert", "tropical_seasonal_forest", "grassland",
    "tropical_rain_forest",
    "lake", "river", "lakeshore", "ocean"
];

export class Layer {
  constructor(message) {
    this.terrain = exports.terrain[message.terrainId];
    this.corners = new Grid(coords.REGION_SIZE + 1, coords.REGION_SIZE + 1,
                            message.corners);
  }
}

export class Entity extends EventEmitter {
  constructor(message) {
    super();

    this.id = message.id;
    this.type = message.type;
    this.location = {
        ax: message.location.ax,
        ay: message.location.ay
    };
    this.direction = message.direction;
  }

  update(dt) {
  }
}

export class Actor extends Entity {
  constructor(message) {
    super(message);
    message = message.actorExt;

    this.equipment = [];

    this.name = message.name;
    this.gender = message.gender;
    this.body = message.body;
    this.hair = message.hair;
    this.facial = message.facial;

    // TODO: work this out
    this.speed = message.speed;

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

  update(dt) {
    super.update(dt);

    if (this.remainder > 0) {
      var unit = getDirectionVector(this.direction);
      var aDistance = Math.min(this.speed * dt, this.remainder);

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
    if (inputState.unstick(Key.Z)) {
      var contacts = this.realm.getAllEntities().filter((entity) =>
          entity.location.ax === this.location.ax &&
          entity.location.ay === this.location.ay &&
          entity !== this);

      if (contacts.length === 0) {
        return;
      }

      if (contacts.length > 1) {
        console.warn("I don't know how to handle this!");
        return;
      }

      var head = contacts[0];
      switch (head.type) {
        case "Drop":
          // Attempt to pick up the drop.
          protocol.send(new game_pb2.PickUpPacket({dropId: head.id}));
          break;
      }
    }
  }
}

export class Fixture extends Entity {
  constructor(message) {
    super(message);
    message = message.fixtureExt;

    this.fixtureType = exports.fixtureTypes[message.fixtureTypeId];
    this.aLeft = message.aLeft;
    this.aTop = message.aTop;
    this.aRight = message.aRight;
    this.aBottom = message.aBottom;
  }
}

export class Item {
  constructor(message) {
    this.id = message.id;
    this.type = message.type;
  }
}

export class Drop extends Entity {
  constructor(message) {
    super(message);
    message = message.dropExt;

    this.item = new Item(message.item);
  }
}

export class Building extends Entity {
  constructor(message) {
    super(message);
    message = message.buildingExt;

    this.aWidth = message.aWidth;
    this.aHeight = message.aHeight;
  }
}

Entity.TYPES = {
    Actor: Actor,
    Player: Actor,
    Fixture: Fixture,
    Drop: Drop,
    Building: Building
};
