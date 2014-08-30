module grid from "client/util/grid";
module objects from "client/util/objects";
module geometry from "client/models/geometry";

export class Realm {
  constructor(message) {
    this.id = message.id;
    this.name = message.name;
    this.size = geometry.Vector2.fromProtobuf(message.size);

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

  getClosestRegionTo(location) {
    return this.getRegionAt(location.map(Region.floor));
  }

  getBounds() {
    return new geometry.Rectangle(0, 0, this.size.x, this.size.y);
  }

  isPassable(bounds, direction) {
    if (!this.getBounds().contains(bounds)) {
      return false;
    }

    for (var y = Region.floor(bounds.top);
         y < Region.ceil(bounds.getBottom());
         y += Region.SIZE) {
      for (var x = Region.floor(bounds.left);
           x < Region.ceil(bounds.getRight());
           x += Region.SIZE) {
        var region = this.getRegionAt(new geometry.Vector2(x, y));
        if (region === null || !region.isPassable(bounds, direction)) {
          return false;
        }
      }
    }

    if (this.getAllEntities().some((entity) =>
        entity.getBounds().intersects(bounds) &&
        !entity.isPassable(direction))) {
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

  isPassable(bounds, direction) {
    bounds = bounds.offset(this.location.negate());

    for (var y = bounds.top; y < bounds.getBottom(); ++y) {
      for (var x = bounds.left; x < bounds.getRight(); ++x) {
        var passability = this.passabilities.getCell(x, y);
        if (passability !== null && !((passability >> direction) & 0x1)) {
          return false;
        }
      }
    }

    return true;
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
