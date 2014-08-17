import {EventEmitter} from "events";
import {makeItem} from "./items/registry";

module game_pb2 from "../game_pb2";

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

  visit(visitor) {
    visitor.visitEntity(this);
  }
}

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

  visit(visitor) {
    super.visit(visitor);
    visitor.visitBuilding(this);
  }
}


export class Drop extends Entity {
  constructor(message) {
    super(message);
    message = message.dropExt;

    this.item = makeItem(message.item);
  }

  getBbox() {
    return {
        aLeft: 0,
        aTop: 0,
        aRight: 1,
        aBottom: 1
    };
  }

  isPassable(location, direction) {
    return true;
  }

  onContainingInteract(protocol) {
    // Attempt to pick up the drop.
    protocol.send(new game_pb2.PickUpPacket({dropId: this.id}));
  }

  visit(visitor) {
    super.visit(visitor);
    visitor.visitDrop(this);
  }
}

export class EntityVisitor {
  visitEntity(entity) {
  }

  visitBuilding(building) {
  }

  visitDrop(drop) {
  }

  visitActor(actor) {
  }

  visitPlayer(player) {
  }
}
