import {EventEmitter} from "events";

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

  contains(location) {
    var bbox = this.getBbox();
    return location.ax >= this.location.ax + bbox.aLeft &&
           location.ax < this.location.ax + bbox.aRight &&
           location.ay >= this.location.ay + bbox.aTop &&
           location.ay < this.location.ay + bbox.aBottom;
  }

  update(dt) {
  }

  onAdjacentInteract(protocol) {
  }

  onContainingInteract(protocol) {
  }
}
Entity.TYPES = {};

export class Building extends Entity {
  constructor(message) {
    super(message);
    message = message.buildingExt;

    this.aWidth = message.aWidth;
    this.aHeight = message.aHeight;
  }

  getBbox() {
    return {
        aLeft: 0,
        aTop: 0,
        aRight: this.aWidth,
        aBottom: this.aHeight
    };
  }

  isPassable(location, direction) {
    return false;
  }
}
Entity.TYPES["building"] = Building;
