module grid from "client/util/grid";
module objects from "client/util/objects";
module geometry from "client/models/geometry";

export class Realm {
  constructor(message) {
    this.id = message.id;
    this.name = message.name;
    this.size = geometry.Vector2.fromProtobuf(message.size);
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

  getRegionAt(location) {
    var key = [location.x, location.y].join(",");
    return objects.hasOwnProp.call(this.regions, key) ? this.regions[key] : null;
  }

  getAllRegions() {
    return Object.keys(this.regions).map((k) => this.regions[k]);
  }

  retainRegions(bbox) {
    // This should only be called at region boundaries, to ensure that
    // off-screen regions aren't culled away prematurely.
    Object.keys(this.regions).map((k) => {
      var region = this.regions[k];

      if (!bbox.contains(region.location)) {
        delete this.regions[k];
      }
    });

    Object.keys(this.entities).map((k) => {
      var entity = this.entities[k];

      if (!bbox.contains(entity.location)) {
        delete this.entities[k];
      }
    });
  }

  getClosestRegionTo(location) {
    return this.getRegionAt(location.map(Region.floor));
  }

  isPassable(location, direction) {
    var region = this.getClosestRegionTo(location);
    if (region === null || !region.isPassable(location, direction)) {
      return false;
    }

    if (this.getAllEntities().filter(
        (entity) => !entity.isPassable(location, direction)).some((entity) =>
      entity.getBounds().contains(location))) {
      return false;
    }

    return true;
  }

  addEntity(id, entity) {
    entity.realm = this;
    this.entities[id] = entity;
  }

  removeEntity(id) {
    var entity = this.entities[id];
    delete this.entities[id];
    delete entity.realm;
  }

  getEntity(id) {
    return objects.hasOwnProp.call(this.entities, id) ? this.entities[id] : null;
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
    this.location = new geometry.Vector2(message.location.x,
                                         message.location.y);
    this.realmId = message.realmId;
    this.layers = message.layers.map((layer) =>
        new Layer(layer));
    this.passabilities = new grid.Grid(Region.SIZE, Region.SIZE,
                                       message.passabilities);
  }

  getKey() {
    return [this.location.x, this.location.y].join(",");
  }

  isPassable(location, direction) {
    location = location.offset(this.location.negate());
    return !!((this.passabilities.getCell(location.x, location.y) >>
        direction) & 0x1);
  }

  getBounds() {
    return (new geometry.Rectangle(0, 0, Region.SIZE, Region.SIZE))
      .offset(this.location);
  }
}
Region.SIZE = 16;

Region.floor = (x) => Math.floor(x / Region.SIZE) * Region.SIZE;
Region.ceil = (x) => Math.ceil(x / Region.SIZE) * Region.SIZE;

class Layer {
  constructor(message) {
    this.terrain = message.terrain;
    this.tiles = new grid.Grid(Region.SIZE, Region.SIZE, message.tiles);
  }
}
