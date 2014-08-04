import {EventEmitter} from "events";

import {nubStrings, repeat} from "./util/collections";
import {hasOwnProp} from "./util/objects";

export var Directions = {
    N: 0,
    W: 1,
    S: 2,
    E: 3
};

function sgn(x) {
  return x < 0 ? -1 : x > 0 ? 1 : 0;
}

function computePath(ax0, ay0, ax1, ay1, d) {
  var path = [];

  var dax = repeat(Math.abs(ax1 - ax0), () => ({
      ax: sgn(ax1 - ax0),
      ay: 0
  }));

  var day = repeat(Math.abs(ay1 - ay0), () => ({
      ax: 0,
      ay: sgn(ay1 - ay0)
  }));

  if (dax.length > day.length) {
    [].push.apply(path, dax);
    [].push.apply(path, day);
  } else if (dax.length < day.length) {
    [].push.apply(path, day);
    [].push.apply(path, dax);
  } else {
    if (d === Directions.N || d === Directions.S) {
      [].push.apply(path, day);
      [].push.apply(path, dax);
    } else if (d === Directions.W || d === Directions.E) {
      [].push.apply(path, dax);
      [].push.apply(path, day);
    }
  }

  return path;
}

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
  constructor(id, name, size) {
    this.id = id;
    this.name = name;
    this.size = size;

    this.regions = {};
    this.entities = {};
  }

  addRegion(region) {
    this.regions[region.getKey()] = region;
  }

  removeRegion(region) {
    delete this.regions[region.getKey()];
  }

  getRegion(position) {
    var key = [position.arx, position.ary].join(",");
    return hasOwnProp.call(this.regions, key) ? this.regions[key] : null;
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
  constructor(position, corners) {
    this.position = position;
    this.corners = corners;
  }

  getKey() {
    return [this.position.arx, this.position.ary].join(",");
  }

  computeTerrain() {
    // Compute terrain from corners, using a modified version of the Marching
    // Squares algorithm.
    var terrain = [];

    for (var rt = 0; rt < Region.SIZE; ++rt) {
      for (var rs = 0; rs < Region.SIZE; ++rs) {
        var nw = this.corners[(rt + 0) * (Region.SIZE + 1) + (rs + 0)];
        var ne = this.corners[(rt + 0) * (Region.SIZE + 1) + (rs + 1)];
        var sw = this.corners[(rt + 1) * (Region.SIZE + 1) + (rs + 0)];
        var se = this.corners[(rt + 1) * (Region.SIZE + 1) + (rs + 1)];

        var types = nubStrings([nw, ne, sw, se]
            .filter((corner) => corner !== null)
            .sort((a, b) =>
                Region.TERRAIN_PREDECENCES.indexOf(a) -
                    Region.TERRAIN_PREDECENCES.indexOf(b)));

        terrain.push(types.map((name, i) => {
          // Terrain blends may exist (e.g. ocean into river), and this ensures
          // that two terrain blending are treated similarly to two terrain of
          // the same type.
          var above = types.slice(i).concat(Region.TERRAIN_BLENDS[name] || []);

          return {
              name: name,
              mask: ((above.indexOf(nw) !== -1) << 3) |
                    ((above.indexOf(ne) !== -1) << 2) |
                    ((above.indexOf(se) !== -1) << 1) |
                    ((above.indexOf(sw) !== -1) << 0)
          };
        }));
      }
    }

    return terrain;
  }
}

Region.SIZE = 16;

Region.TERRAIN_BLENDS = {};
Region.TERRAIN_PREDECENCES = [
    "ocean", "beach",
    "subtropical_desert", "tropical_seasonal_forest", "grassland",
    "tropical_rain_forest",
    "lake", "river", "lakeshore"
];

export class Entity extends EventEmitter {
  constructor(id, name, types, position, direction, equipment) {
    super();

    this.id = id;
    this.name = name;
    this.types = types;
    this.position = position;
    this.direction = direction;

    // TODO: work this out
    this.speed = 2;

    this.equipment = equipment;

    this.remainder = 0;
  }

  moveInDirection(direction) {
    // Move the entity one tile in an axis direction.
    //
    // It will forcibly normalize the position (may be janky, but will always be
    // correct).
    var unit = getDirectionVector(this.direction);
    this.position.ax = Math.round(this.position.ax + unit.ax * this.remainder);
    this.position.ay = Math.round(this.position.ay + unit.ay * this.remainder);
    this.direction = direction;

    this.emit("moveStart", this.position);
    this.remainder = 1;

    return true;
  }

  update(dt) {
    if (this.remainder > 0) {
      var unit = getDirectionVector(this.direction);
      var aDistance = Math.min(this.speed * dt, this.remainder);

      this.remainder -= aDistance;

      this.position.ax = Math.min(
          Math.max(0, this.position.ax + unit.ax * aDistance),
          this.realm.size.aw - 1);
      this.position.ay = Math.min(
          Math.max(0, this.position.ay + unit.ay * aDistance),
          this.realm.size.ah - 1);

      this.emit("moveStep", {aDistance: aDistance});

      if (this.remainder <= 0) {
        this.position.ax = Math.round(this.position.ax);
        this.position.ay = Math.round(this.position.ay);
        this.emit("moveEnd", this.position);
      }
    }
  }
}
