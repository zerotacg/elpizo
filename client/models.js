import {EventEmitter} from "events";

import {nubBy, repeat} from "./util/collections";
import {hasOwnProp} from "./util/objects";

module game_pb2 from "./game_pb2";
module exports from "./constants/exports";
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

    this.regions = {};
    this.entities = {};
  }

  addRegion(region) {
    this.regions[region.getKey()] = region;
  }

  removeRegion(region) {
    delete this.regions[region.getKey()];
  }

  getRegion(location) {
    var key = [location.arx, location.ary].join(",");
    return hasOwnProp.call(this.regions, key) ? this.regions[key] : null;
  }

  getClosestRegion(location) {
    return this.getRegion(coords.absoluteToContainingRegion(location));
  }

  hasCollidableAt(location) {
    var region = this.getClosestRegion(location);
    if (region === null ||
        region.hasCollidableAt(coords.absoluteToRelative(location))) {
      return true;
    }

    if (this.getAllEntities().filter(
        (entity) => entity.type == "fixtures").some((entity) => {
      return location.ax >= entity.location.ax + entity.aLeft &&
             location.ax < entity.location.ax + entity.aRight &&
             location.ay >= entity.location.ay + entity.aTop &&
             location.ay < entity.location.ay + entity.aBottom;
    })) {
      return true;
    }

    return false;
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
    this.corners = message.corners.map((id) => exports.terrain[id]);
    this.terrain = this.computeTerrain();
  }

  getKey() {
    return [this.location.arx, this.location.ary].join(",");
  }

  computeTerrain() {
    // Compute terrain from corners, using a modified version of the Marching
    // Squares algorithm.
    var terrain = new Array(coords.REGION_SIZE * coords.REGION_SIZE);

    for (var rt = 0; rt < coords.REGION_SIZE; ++rt) {
      for (var rs = 0; rs < coords.REGION_SIZE; ++rs) {
        var nw = this.corners[(rt + 0) * (coords.REGION_SIZE + 1) + (rs + 0)];
        var ne = this.corners[(rt + 0) * (coords.REGION_SIZE + 1) + (rs + 1)];
        var sw = this.corners[(rt + 1) * (coords.REGION_SIZE + 1) + (rs + 0)];
        var se = this.corners[(rt + 1) * (coords.REGION_SIZE + 1) + (rs + 1)];

        var types = nubBy([nw, ne, sw, se]
            .filter((corner) => corner !== null)
            .sort((a, b) =>
                Region.TERRAIN_PREDECENCES.indexOf(a) -
                    Region.TERRAIN_PREDECENCES.indexOf(b)),
            (corner) => corner.name);

        terrain[rt * coords.REGION_SIZE + rs] = types.map((corner, i) => {
          // Terrain blends may exist (e.g. ocean into river), and this ensures
          // that two terrain blending are treated similarly to two terrain of
          // the same type.
          var above = types.slice(i).concat(
              Region.TERRAIN_BLENDS[corner.name] || []);

          return {
              name: corner.name,
              mask: ((above.indexOf(nw) !== -1) << 3) |
                    ((above.indexOf(ne) !== -1) << 2) |
                    ((above.indexOf(se) !== -1) << 1) |
                    ((above.indexOf(sw) !== -1) << 0),
              passable: corner.passable
          };
        });
      }
    }

    return terrain;
  }

  hasCollidableAt(location) {
    var corners = [
        this.corners[(location.ry + 0) * (coords.REGION_SIZE + 1) +
                     (location.rx + 0)],
        this.corners[(location.ry + 0) * (coords.REGION_SIZE + 1) +
                     (location.rx + 1)],
        this.corners[(location.ry + 1) * (coords.REGION_SIZE + 1) +
                     (location.rx + 0)],
        this.corners[(location.ry + 1) * (coords.REGION_SIZE + 1) +
                     (location.rx + 1)]
    ];
    return corners.filter((terrain) => terrain.passable).length <= 1;
  }
}

Region.TERRAIN_BLENDS = {};
Region.TERRAIN_PREDECENCES = [
    "ocean", "beach",
    "subtropical_desert", "tropical_seasonal_forest", "grassland",
    "tropical_rain_forest",
    "lake", "river", "lakeshore"
];

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

    // TODO: work this out
    this.speed = 2;

    this.moving = false;
    this.remainder = 0;
  }

  moveInDirection(direction) {
    // Move the entity one tile in an axis direction.
    //
    // It will forcibly normalize the location (may be janky, but will always be
    // correct).
    var unit = getDirectionVector(this.direction);
    this.location.ax = Math.round(this.location.ax + unit.ax * this.remainder);
    this.location.ay = Math.round(this.location.ay + unit.ay * this.remainder);

    this.direction = direction;
    unit = getDirectionVector(this.direction);

    if (this.realm.hasCollidableAt({
        ax: Math.round(this.location.ax + unit.ax),
        ay: Math.round(this.location.ay + unit.ay)
    })) {
      this.remainder = 0;
    } else {
      this.remainder = 1;
    }

    this.emit("moveStart", this.location);
    this.moving = true;
  }

  update(dt) {
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
    // TODO: validate timing server-side.
    if (this.remainder === 0) {
      var direction = inputState.isPressed(37) ? Directions.W :
                      inputState.isPressed(38) ? Directions.N :
                      inputState.isPressed(39) ? Directions.E :
                      inputState.isPressed(40) ? Directions.S :
                      null;

      if (direction !== null) {
        this.moveInDirection(direction);
        protocol.send(game_pb2.Packet.Type.MOVE,
                      new game_pb2.MovePacket({direction: direction}));
      } else if (this.moving) {
        this.moving = false;
        protocol.send(game_pb2.Packet.Type.STOP_MOVE,
                      new game_pb2.StopMovePacket());
      }
    }
  }
}

export class Actor extends Entity {
  constructor(message) {
    super(message);
    message = message.actorExt;

    this.equipment = [];

    this.body = message.body;
    this.facial = message.facial;
  }
}

export class Player extends Actor {
  constructor(message) {
    super(message);
    message = message.playerExt;

    this.name = message.name;
  }
}

export class Fixture extends Entity {
  constructor(message) {
    super(message);
    message = message.fixtureExt;

    this.fixtureType = exports.fixtureTypes[message.fixtureType];
    this.aLeft = message.aLeft;
    this.aTop = message.aTop;
    this.aRight = message.aRight;
    this.aBottom = message.aBottom;
  }
}

Entity.TYPES = {
    actors: Actor,
    players: Player,
    fixtures: Fixture
};
