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
function getDirectionConstant(dx, dy) {
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

export class Realm {
  constructor(aw, ah) {
    this.aw = aw;
    this.ah = ah;

    this.regions = {};
    this.entities = {};
  }

  addRegion(region) {
    this.regions[region.getKey()] = region;
  }

  removeRegion(region) {
    delete this.regions[region.getKey()];
  }

  getRegion(arx, ary) {
    var key = [arx, ary].join(",");
    return hasOwnProp.call(this.regions, key) ? this.regions[key] : null;
  }

  addEntity(entity) {
    this.entities[entity.id] = entity;
  }

  removeEntity(entity) {
    delete this.entities[entity.id];
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
  constructor(arx, ary, corners) {
    this.arx = arx;
    this.ary = ary;
    this.corners = corners;
  }

  getKey() {
    return [this.arx, this.ary].join(",");
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

export class Entity {
  constructor(id, kind, type, ax, ay, direction, equipment) {
    this.id = id;
    this.kind = kind;
    this.type = type;
    this.ax = ax;
    this.ay = ay;
    this.direction = direction;
    this.equipment = equipment;

    this.currentPath = [];
    this.speed = 0.005;
  }

  moveTo(ax, ay) {
    var dax = 0;
    var day = 0;

    if (this.currentPath.length > 0) {
      var step = this.currentPath[0];
      if (step.ax % 1 !== 0 || step.ay % 1 !== 0) {
        dax = step.ax;
        day = step.ay;

        // If the path currently has non-integral segments, we need to finish
        // moving on the non-integral segment first.
        this.currentPath.splice(1);
      } else {
        this.currentPath.splice(0);
      }
    }

    // We round this out to correct for floating point error.
    var startAx = Math.round(this.ax + dax);
    var startAy = Math.round(this.ay + day);

    var path = computePath(startAx, startAy, ax, ay, this.direction);
    [].push.apply(this.currentPath, path);

    return {
        start: {
            ax: startAx,
            ay: startAy
        },
        path: path
    };
  }

  update(dt) {
    if (this.currentPath.length > 0) {
      // Compute how much distance we can travel through, in dt units of time.
      var aDistance = Math.min(this.speed * dt, this.currentPath.length);
      var numSteps = 0;

      // Find how many whole parts of the distance we can travel through
      // immediately.
      while (aDistance > 1) {
        var step = this.currentPath[numSteps];
        var aStepDistance = Math.abs(step.ax) + Math.abs(step.ay);

        ++numSteps;
        aDistance -= aStepDistance;
      }

      // Resolve all the whole path steps.
      while (numSteps > 0) {
        var step = this.currentPath.shift();
        this.ax += step.ax;
        this.ay += step.ay
        --numSteps;
      }

      // Resolve the partial step by first computing how much of the partial
      // step we need to move through, then updating the head of the path to
      // reflect how many partial steps we have remaining.
      if (aDistance > 0) {
        var head = this.currentPath[0];

        this.direction = getDirectionConstant(head.ax, head.ay);

        var dax = sgn(head.ax) * aDistance;
        var day = sgn(head.ay) * aDistance;

        if (Math.abs(head.ax) <= Math.abs(dax) &&
            Math.abs(head.ay) <= Math.abs(day)) {
          // We round this out to correct for floating point error, so we don't
          // accumulate errors (and it's relatively accurate here.)
          this.ax = Math.round(this.ax + head.ax);
          this.ay = Math.round(this.ay + head.ay);

          this.currentPath.shift();
        } else {
          this.ax += dax;
          this.ay += day;

          head.ax -= dax;
          head.ay -= day;
        }
      }
    }
  }
}
