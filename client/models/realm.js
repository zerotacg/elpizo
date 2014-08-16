import {Grid} from "../util/grid";
import {hasOwnProp} from "../util/objects";

module game_pb2 from "../game_pb2";
module exports from "../exports";
module coords from "../util/coords";

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
        (entity) => !entity.isPassable(location, direction)).some((entity) => {
      var bbox = entity.getBbox();
      return location.ax >= entity.location.ax + bbox.aLeft &&
             location.ax < entity.location.ax + bbox.aRight &&
             location.ay >= entity.location.ay + bbox.aTop &&
             location.ay < entity.location.ay + bbox.aBottom;
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

class Layer {
  constructor(message) {
    this.terrain = exports.terrain[message.terrainId];
    this.tiles = new Grid(coords.REGION_SIZE, coords.REGION_SIZE,
                          message.tiles);
  }
}
