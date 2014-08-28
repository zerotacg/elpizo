module geometry from "client/models/geometry";
module itemRegistry from "client/models/items/registry";
module packets from "client/protos/packets";
module input from "client/util/input";
module timing from "client/util/timing";

export class Entity extends timing.Timed {
  constructor(message) {
    super();

    this.id = message.id;
    this.type = message.type;
    this.realmId = message.realmId;
    this.location = geometry.Vector2.fromProtobuf(message.location);
    this.bbox = geometry.Rectangle.fromProtobuf(message.bbox);
    this.direction = message.direction;
  }

  getHeight() {
    return this.bbox.height;
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

  onAdjacentInteract(avatar, protocol) {
  }

  onIntersectingInteract(avatar, protocol) {
  }

  onContact(avatar, protocol) {
  }

  isPassable(direction) {
    return false;
  }

  accept(visitor) {
    visitor.visitEntity(this);
  }
}

export class Building extends Entity {
  constructor(message) {
    super(message);
    message = message[".Building.ext"];

    this.doorPosition = message.doorPosition;
  }

  accept(visitor) {
    visitor.visitBuilding(this);
  }
}

export class Drop extends Entity {
  constructor(message) {
    super(message);
    message = message[".Drop.ext"];

    this.item = itemRegistry.makeItem(message.item);
  }

  onIntersectingInteract(avatar, protocol) {
    // Attempt to pick up the drop.
    protocol.send(new packets.PickUpPacket({dropId: this.id}));
  }

  accept(visitor) {
    visitor.visitDrop(this);
  }

  isPassable(direction) {
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
    case Directions.N: return new geometry.Vector2( 0, -1);
    case Directions.W: return new geometry.Vector2(-1,  0);
    case Directions.S: return new geometry.Vector2( 0,  1);
    case Directions.E: return new geometry.Vector2( 1,  0);
  }
}

export class Actor extends Entity {
  constructor(message) {
    super(message);
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

    this.inventory = message.inventory.map(
      (message) => itemRegistry.makeItem(message));

    this.isMoving = false;
    this.isDying = false;

    this.addTimer("attack", new timing.CountdownTimer());
    this.addTimer("move", new timing.CountdownTimer());
    this.addTimer("death", new timing.CountdownTimer());
  }

  finishMove() {
    var moveTimer = this.getTimer("move");

    this.location = this.location
        .offset(this.getDirectionVector().scale(
            moveTimer.remaining / this.getSpeed()))
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
    this.isMoving = true;
    this.finishMove();
    this.getTimer("move").reset(1 / this.getSpeed());
  }

  stopMove() {
    this.isMoving = false;
    this.getTimer("move").reset(0);
  }

  attack() {
    this.getTimer("attack").reset(1 / this.getAttackCooldown());
  }

  getSpeed() {
    return Actor.BASE_SPEED;
  }

  getAttackCooldown() {
    return Actor.DEFAULT_ATTACK_COOLDOWN;
  }

  update(dt) {
    super.update(dt);

    // Round out the location if the movement timer is 0.
    var moveTimer = this.getTimer("move");
    if (moveTimer.isStopped()) {
      this.location = this.location.map(Math.round);
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

  isPassable(direction) {
    return true;
  }
}

Actor.BASE_SPEED = 4;
Actor.DEFAULT_ATTACK_COOLDOWN = 2;

export class Player extends Actor {
  updateAsAvatar(dt, inputState, protocol) {
    // Don't allow any avatar updates if there are any timers pending.
    if (!this.areAllTimersStopped()) {
      return;
    }

    var attackMode = inputState.held(input.Key.ALT);

    // Check for movement.
    var direction = inputState.held(input.Key.LEFT) ? Directions.W :
                    inputState.held(input.Key.UP) ? Directions.N :
                    inputState.held(input.Key.RIGHT) ? Directions.E :
                    inputState.held(input.Key.DOWN) ? Directions.S :
                    null;

    var didMove = false;

    if (direction !== null) {
      if (this.direction !== direction) {
        // Send a turn packet.
        this.turn(direction);
        protocol.send(new packets.TurnPacket({direction: direction}))
      }

      var target = this.getTargetLocation();
      var targetBounds = this.bbox.offset(target);
      var targetEntities = this.realm.getAllEntities().filter((entity) =>
        (entity.getBounds().intersects(targetBounds) ||
         entity.getBounds().intersects(this.getBounds())) && entity !== this);

      if (attackMode) {
        // Attack mode logic.
        if (this.getTimer("attack").isStopped()) {
          if (inputState.stick(input.Key.LEFT) ||
              inputState.stick(input.Key.UP) ||
              inputState.stick(input.Key.RIGHT) ||
              inputState.stick(input.Key.DOWN)) {
            protocol.send(new packets.AttackPacket({
                actorIds: targetEntities
                    .filter((entity) => entity instanceof Actor)
                    .map((entity) => entity.id)
            }));
            this.attack();
          }
        }
      } else {
        // Movement mode logic.
        if (this.realm.isPassable(targetBounds, this.direction)) {
          this.move();
          didMove = true;

          protocol.send(new packets.MovePacket());

          targetEntities.forEach((entity) =>
            entity.onContact(this, protocol));
        }
      }
    }

    if (!didMove && this.isMoving) {
      // We've stopped moving entirely.
      this.isMoving = false;
      protocol.send(new packets.StopMovePacket());
    }

    if (inputState.stick(input.Key.Z)) {
      var intersecting = this.realm.getAllEntities().filter((entity) =>
        entity.getBounds().intersects(this.getBounds()) &&
        entity !== this);

      var adjacents = this.realm.getAllEntities().filter((entity) =>
        entity.getBounds().intersects(this.getTargetBounds()) &&
        entity !== this);

      // Check for interactions.
      var interactions = [];
      [].push.apply(interactions, intersecting.map((entity) => ({
          entity: entity,
          intersecting: true
      })));
      [].push.apply(interactions, adjacents.map((entity) => ({
          entity: entity,
          intersecting: false
      })));

      console.log(interactions);

      if (interactions.length === 0) {
        return;
      }

      if (interactions.length > 1) {
        console.warn("NOT IMPLEMENTED: MULTIPLE ENTITY INTERACTION");
        return;
      }

      var head = interactions[0];
      if (head.intersecting) {
        head.entity.onIntersectingInteract(this, protocol);
      } else {
        head.entity.onAdjacentInteract(this, protocol);
      }
    }
  }

  getHeight() {
    // TODO: this might be overriden sometime maybe? It's only used for
    // rendering...
    return 1.75;
  }

  accept(visitor) {
    visitor.visitPlayer(this);
  }
}

export class NPC extends Actor {
  constructor(message) {
    super(message);
    message = message[".NPC.ext"];

    this.species = message.species;
  }

  accept(visitor) {
    visitor.visitNPC(this);
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
}
