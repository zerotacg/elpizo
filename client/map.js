import {nubStrings} from "./util/collections";
import {hasOwnProp} from "./util/objects";

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

  computePath(ax0, ay0, ax1, ay1) {
    var path = [];

    var dax = Math.abs(ax1 - ax0);
    var day = Math.abs(ay1 - ay0);

    var iax = ax0 < ax1 ? 1 : -1;
    var iay = ay0 < ay1 ? 1 : -1;

    var e = 0;

    for (var i = 0; i < dax + day; ++i) {
      var e1 = e + day;
      var e2 = e - dax;

      var step;

      if (Math.abs(e1) < Math.abs(e2)) {
        ax0 += iax;
        e = e1;
        step = {ax: iax, ay: 0};
      } else {
        ay0 += iay;
        e = e2;
        step = {ax: 0, ay: iay};
      }

      path.push(step);
    }

    return path;
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
  constructor(id, kind, type, ax, ay) {
    this.id = id;
    this.kind = kind;
    this.type = type;
    this.ax = ax;
    this.ay = ay;
  }
}
