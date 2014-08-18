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

  onAdjacentInteract(avatar, protocol) {
  }

  onContainingInteract(avatar, protocol) {
  }

  onContact(avatar, protocol) {
  }

  isPassable(location, direction) {
    return true;
  }

  visit(visitor) {
    visitor.visitEntity(this);
  }
}

export class Building extends Entity {
  constructor(message) {
    super(message);
    message = message.buildingExt;

    this.doorPosition = message.doorPosition;
  }

  visit(visitor) {
    super.visit(visitor);
    visitor.visitBuilding(this);
  }

  isPassable(location, direction) {
    if (location.x == this.getAbsoluteBounds().left + this.doorPosition &&
        location.y == this.getAbsoluteBounds().getBottom() - 1) {
      return true;
    }
    return false;
  }
}


export class Drop extends Entity {
  constructor(message) {
    super(message);
    message = message.dropExt;

    this.item = makeItem(message.item);
  }

  onContainingInteract(avatar, protocol) {
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
