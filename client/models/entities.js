module geometry from "client/models/geometry";
module itemRegistry from "client/models/items/registry";
module packets from "client/protos/packets";
module input from "client/util/input";
module timing from "client/util/timing";

export class Entity extends timing.Timed {
  constructor(id, message) {
    super();

    this.id = id;
    this.type = message.type;
    this.realmId = message.realmId;
    this.location = geometry.Vector3.fromProtobuf(message.location);
    this.bbox = geometry.Rectangle.fromProtobuf(message.bbox);
    this.direction = message.direction;
  }

  getTitle() {
    return "(unknown)";
  }

  getBounds() {
    return this.bbox.offset(this.location);
  }

  getDirectionVector() {
    return getDirectionVector(this.direction);
  }

  getTargetLocation() {
    return this.location.offset(this.getDirectionVector());
  }

  getTargetBounds() {
    return this.getBounds().offset(this.getDirectionVector());
  }

  update(dt) {
    super.update(dt);
  }

  getAdjacentInteractions() {
    return [];
  }

  getIntersectingInteractions() {
    return [];
  }

  onContact(protocol, me) {
  }

  isPassableBy(entity, direction) {
    return false;
  }

  accept(visitor) {
    visitor.visitEntity(this);
  }

  getHeight() {
    return this.bbox.height;
  }
}

export class Building extends Entity {
  constructor(id, message) {
    super(id, message);
    message = message[".Building.ext"];
  }

  accept(visitor) {
    visitor.visitBuilding(this);
  }
}

export class Drop extends Entity {
  constructor(id, message) {
    super(id, message);
    message = message[".Drop.ext"];

    this.item = itemRegistry.makeItem(message.item);
  }

  getTitle() {
    return this.item.getIndefiniteTitle();
  }

  doPickUp(protocol, me) {
    protocol.send(new packets.PickUpPacket({dropId: this.id}));
  }

  getIntersectingInteractions() {
    var interactions = super.getIntersectingInteractions();

    interactions.push({
        title: "Pick up",
        f: this.doPickUp.bind(this)
    });

    return interactions;
  }

  accept(visitor) {
    visitor.visitDrop(this);
  }

  isPassableBy(entity, direction) {
    return true;
  }
}

export var Directions = {
    N: 0,
    W: 1,
    S: 2,
    E: 3
};

export function getDirectionVector(d) {
  switch (d) {
    case Directions.N: return new geometry.Vector3( 0, -1,  0);
    case Directions.W: return new geometry.Vector3(-1,  0,  0);
    case Directions.S: return new geometry.Vector3( 0,  1,  0);
    case Directions.E: return new geometry.Vector3( 1,  0,  0);
  }
}

export class Actor extends Entity {
  constructor(id, message) {
    super(id, message);
    message = message[".Actor.ext"];

    this.name = message.name;
    this.health = message.health;
    this.gender = message.gender;
    this.body = message.body;
    this.hair = message.hair;
    this.facial = message.facial;

    this.headItem = message.headItem &&
        itemRegistry.makeItem(message.headItem);

    this.torsoItem = message.torsoItem &&
        itemRegistry.makeItem(message.torsoItem);

    this.legsItem = message.legsItem &&
        itemRegistry.makeItem(message.legsItem);

    this.feetItem = message.feetItem &&
        itemRegistry.makeItem(message.feetItem);

    this.weapon = message.weapon &&
        itemRegistry.makeItem(message.weapon);

    this.inventory = {};
    message.inventory.forEach((message) => {
      this.inventory[message.id] = itemRegistry.makeItem(message);
    });

    this.isMoving = false;
    this.isDying = false;

    this.addTimer("move", new timing.CountdownTimer());
    this.addTimer("death", new timing.CountdownTimer());
    this.addTimer("turn", new timing.CountdownTimer());
  }

  getTitle() {
    return this.name;
  }

  addToInventory(item) {
    this.inventory[item.id] = item;
  }

  discard(item) {
    delete this.inventory[item.id];
  }

  finishMove() {
    var moveTimer = this.getTimer("move");

    this.location = this.location
        .offset(this.getDirectionVector().scale(
            moveTimer.remaining * this.getSpeed()))
        .map(Math.round);
    moveTimer.reset(0);
  }

  turn(direction) {
    this.finishMove();
    this.direction = direction;
  }

  move() {
    // Move the entity one tile forward.
    //
    // It will forcibly normalize the location (may be janky, but will always be
    // correct).
    var moveTimer = this.getTimer("move");

    this.isMoving = true;
    this.finishMove();
    moveTimer.reset(1 / this.getSpeed());
  }

  stopMove() {
    this.isMoving = false;
    this.finishMove();
  }

  getSpeed() {
    return Actor.BASE_SPEED;
  }

  getAdjacentInteractions() {
    return [{
      title: "THIS ACTION DOES NOTHING AND IS ONLY FOR TESTING",
      f: () => { }
    }];
  }

  update(dt) {
    var moveTimer = this.getTimer("move");
    var lastRemaining = moveTimer.remaining;

    super.update(dt);

    // Round out the location if the movement timer is 0.
    if (moveTimer.isStopped()) {
      this.location = this.location
          .offset(this.getDirectionVector().scale(lastRemaining * this.getSpeed()))
          .map(Math.round);
    } else {
      this.location = this.location
          .offset(this.getDirectionVector().scale(dt * this.getSpeed()));
    }

    var deathTimer = this.getTimer("death");
    if (this.isDying && deathTimer.isStopped()) {
      // We've died, so remove ourselves from the realm.
      this.realm.removeEntity(this.id);
    }
  }

  accept(visitor) {
    visitor.visitActor(this);
  }

  isPassableBy(entity, direction) {
    return false;
  }
}

Actor.BASE_SPEED = 4;
Actor.TURN_TIME = 0.1;

export class Player extends Actor {
  accept(visitor) {
    visitor.visitPlayer(this);
  }

  getHeight() {
    return 1.75;
  }
}

export class NPC extends Actor {
  constructor(id, message) {
    super(id, message);
    message = message[".NPC.ext"];
  }

  accept(visitor) {
    visitor.visitNPC(this);
  }
}

export class Avatar extends Player {
  constructor(id, message) {
    super(id, message);
    this.interactions = [];
    this.showInventory = false;
  }

  accept(visitor) {
    visitor.visitAvatar(this);
  }

  doInteract(protocol) {
    var intersecting = this.realm.getAllEntities().filter((entity) =>
      entity.getBounds().intersects(this.getBounds()) &&
      this.realm.isTerrainPassableBy(this, this.getBounds(), this.direction) &&
      entity !== this);

    var adjacents = this.realm.getAllEntities().filter((entity) =>
      entity.getBounds().intersects(this.getTargetBounds()) &&
      this.realm.isTerrainPassableBy(this, this.getTargetBounds(),
                                     this.direction) &&
      entity !== this);

    // Check for interactions.
    var interactions = [];
    [].push.apply(interactions, intersecting.map((entity) => ({
        entity: entity,
        actions: entity.getIntersectingInteractions()
    })).filter((group) => group.actions.length > 0));
    [].push.apply(interactions, adjacents.map((entity) => ({
        entity: entity,
        actions: entity.getAdjacentInteractions()
    })).filter((group) => group.actions.length > 0));

    this.interactions = interactions;
  }

  doMove(protocol, direction) {
    var didMove = false;
    if (this.direction !== direction) {
      // Send a turn packet.
      this.turn(direction);
      protocol.send(new packets.TurnPacket({direction: direction}));
      this.getTimer("turn").reset(Actor.TURN_TIME);
      return;
    }

    var targetLocation = this.getTargetLocation();
    var targetBounds = this.bbox.offset(targetLocation);
    var targetEntities = this.realm.getAllEntities().filter((entity) =>
        (entity.getBounds().intersects(targetBounds) ||
        entity.getBounds().intersects(this.getBounds())) && entity !== this);

    // Movement mode logic.
    if (this.realm.isPassableBy(this, targetBounds, this.direction)) {
      this.move();
      didMove = true;

      protocol.send(new packets.MovePacket({location: targetLocation}));

      targetEntities.forEach((entity) =>
        entity.onContact(protocol, this));
    }
    return didMove;
  }

  updateAsAvatar(dt, inputState, protocol) {
    // Don't allow any avatar updates if there are any timers pending.
    if (!this.areAllTimersStopped()) {
      return;
    }

    if (inputState.stick(input.Key.Z)) {
      this.doInteract(protocol);
      return;
    }

    if (inputState.stick(input.Key.I)) {
      this.interactions = [];
      this.showInventory = !this.showInventory;
      return;
    }

    if (inputState.stick(input.Key.ESCAPE)) {
      this.interactions = [];
      this.showInventory = false;
      return;
    }

    // Check for movement.
    var direction = inputState.held(input.Key.LEFT) ? Directions.W :
                    inputState.held(input.Key.UP) ? Directions.N :
                    inputState.held(input.Key.RIGHT) ? Directions.E :
                    inputState.held(input.Key.DOWN) ? Directions.S :
                    null;

    var didMove = false;

    if (direction !== null) {
      this.interactions = [];
      didMove = this.doMove(protocol, direction);
    }

    if (!didMove && this.isMoving) {
      // We've stopped moving entirely.
      this.isMoving = false;
      protocol.send(new packets.StopMovePacket());
    }
  }
}

export class EntityVisitor {
  visitEntity(entity) {
  }

  visitBuilding(building) {
    this.visitEntity(building);
  }

  visitDrop(drop) {
    this.visitEntity(drop);
  }

  visitActor(actor) {
    this.visitEntity(actor);
  }

  visitPlayer(player) {
    this.visitActor(player);
  }

  visitNPC(npc) {
    this.visitActor(npc);
  }

  visitAvatar(avatar) {
    this.visitPlayer(avatar);
  }
}
