import {Grid} from "../util/grid";
import {hasOwnProp} from "../util/objects";
import {Rectangle, Vector2} from "../util/geometry";

module game_pb2 from "../game_pb2";
module exports from "../exports";
module coords from "../util/coords";

export class Realm {
  constructor(message) {
    this.id = message.id;
    this.name = message.name;
    this.bounds = new Rectangle(0, 0, message.size.aw, message.size.ah);
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
    var key = [location.x, location.y].join(",");
    return hasOwnProp.call(this.regions, key) ? this.regions[key] : null;
  }

  getAllRegions() {
    return Object.keys(this.regions).map((k) => this.regions[k]);
  }

  retainRegions(arBbox) {
    // This should only be called at region boundaries, to ensure that
    // off-screen regions aren't culled away prematurely.
    Object.keys(this.regions).map((k) => {
      var region = this.regions[k];

      if (!arBbox.contains(region.location)) {
        delete this.regions[k];
      }
    });

    Object.keys(this.entities).map((k) => {
      var entity = this.entities[k];

      if (!arBbox.contains(coords.absoluteToContainingRegion(
          entity.location))) {
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
        (entity) => !entity.isPassable(location, direction)).some((entity) =>
      entity.getAbsoluteBounds().contains(entity.location))) {
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
    this.location = new Vector2(message.location.arx, message.location.ary);
    this.layers = message.layers.map((layer) =>
        new Layer(layer));
    this.passabilities = new Grid(coords.REGION_SIZE, coords.REGION_SIZE,
                                  message.passabilities);
  }

  getKey() {
    return [this.location.x, this.location.y].join(",");
  }

  isPassable(location, direction) {
    return !!((this.passabilities.getCell(location.x, location.y) >>
        direction) & 0x1);
  }

  getAbsoluteBounds() {
    return (new Rectangle(0, 0, coords.REGION_SIZE, coords.REGION_SIZE))
      .offset(this.location);
  }
}

class Layer {
  constructor(message) {
    this.terrain = exports.terrain[message.terrainId];
    this.tiles = new Grid(coords.REGION_SIZE, coords.REGION_SIZE,
                          message.tiles);
  }
}
