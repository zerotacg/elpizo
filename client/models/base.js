import {EventEmitter} from "events";
import {makeItem} from "./items/registry";
import {Rectangle, Vector2} from "../util/geometry";

module game_pb2 from "../game_pb2";

export class Entity extends EventEmitter {
  constructor(message) {
    super();

    this.id = message.id;
    this.type = message.type;
    this.location = new Vector2(message.location.ax, message.location.ay);
    this.bbox = new Rectangle(message.bbox.left, message.bbox.top,
                              message.bbox.width, message.bbox.height);
    this.direction = message.direction;
  }

  getAbsoluteBounds() {
    return this.bbox.offset(this.location);
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
