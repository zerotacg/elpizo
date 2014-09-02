import asyncio
import collections
import contextlib
import logging
import websockets

from elpizo.models import geometry
from elpizo.models import realm
from elpizo.models import record
from elpizo.models import items
from elpizo.protos import entities_pb2
from elpizo.util import green
from elpizo.util import support


logger = logging.getLogger(__name__)


class Ephemera(object):
  def __init__(self):
    self.last_move_time = 0
    self.last_attack_time = 0


class Entity(record.Record):
  REGISTRY = {}

  DIRECTION_VECTORS = {
      0: geometry.Vector2( 0, -1),  # N
      1: geometry.Vector2(-1,  0),  # W
      2: geometry.Vector2( 0,  1),  # S
      3: geometry.Vector2( 1,  0)   # E
  }

  DIRECTIONS = {v: k for k, v in DIRECTION_VECTORS.items()}

  def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.location_log = collections.deque()
    self.location_lock = asyncio.Lock()

  def log_location(self, time, location):
    self.location_log.append((time, location))

  def retain_log_after(self, since):
    while self.location_log:
      time, head  = self.location_log[0]
      if time < since:
        self.location_log.popleft()
      else:
        break

  @property
  def all_locations(self):
    for _, location in self.location_log:
      yield location
    yield self.location

  @property
  def direction_vector(self):
    return self.DIRECTION_VECTORS[self.direction]

  @classmethod
  def register(cls, subclass):
    cls.REGISTRY[subclass.TYPE] = subclass
    return subclass

  def to_protobuf(self):
    return entities_pb2.Entity(type=self.TYPE, realm_id=self.realm_id,
                               location=self.location.to_protobuf(),
                               bbox=self.bbox.to_protobuf(),
                               direction=self.direction)

  def to_public_protobuf(self):
    return self.to_protected_protobuf()

  def to_protected_protobuf(self):
    return self.to_protobuf()

  @classmethod
  def from_protobuf_polymorphic(cls, proto):
    return cls.REGISTRY[proto.type].from_protobuf(proto)

  @classmethod
  def from_protobuf(cls, proto):
    return cls(type=proto.type, realm_id=proto.realm_id,
               location=geometry.Vector2.from_protobuf(proto.location),
               bbox=geometry.Rectangle.from_protobuf(proto.bbox),
               direction=proto.direction)

  @property
  def target_location(self):
    return self.location.offset(self.direction_vector)

  @property
  def target_bounds(self):
    return self.bounds.offset(self.direction_vector)

  @property
  def bounds(self):
    return self.bbox.offset(self.location)

  @property
  def regions(self):
    return self.realm.load_intersecting_regions(self.bounds)

  @contextlib.contextmanager
  def movement(self):
    initial_regions = list(self.regions)

    yield

    for region in initial_regions:
      region.entities.remove(self)

    for region in self.regions:
      region.entities.add(self)

  def is_passable_by(self, entity, direction):
    return False

  def is_damageable_by(self, attacker):
    return False

  def send(self, protocol, message):
    protocol.send(self.id, message)

  def broadcast(self, bus, channel, message):
    futures = []

    for bus_key in list(bus.channels.get(channel, set())):
      try:
        protocol = bus.get(bus_key)
      except KeyError:
        # A client disappeared while we were iterating.
        logger.warn("Client disappeared during broadcast: %s", bus_key)
        continue
      else:
        if not protocol.policy.can_receive_broadcasts_from(self):
          # Broadcasts from this entity are not permitted.
          continue

      futures.append(green.coroutine(self.send)(protocol, message))

    return asyncio.gather(*futures)

  def broadcast_to_regions(self, bus, message):
    futures = []

    for region in self.regions:
      futures.append(self.broadcast(
          bus, ("region", self.realm.id, region.location), message))

    return asyncio.gather(*futures)


class Actor(Entity):
  BASE_SPEED = 4
  DEFAULT_ATTACK_COOLDOWN = 2

  @property
  def speed(self):
    return self.BASE_SPEED

  @property
  def attack_cooldown(self):
    return self.DEFAULT_ATTACK_COOLDOWN

  def damage(self, v):
    old_health = self.health
    self.health = max([0, self.health - v])
    return old_health - self.health

  @property
  def attack_strength(self):
    if self.weapon is not None:
      return 1  # TODO: something sensible here
    return 1

  def to_protobuf(self):
    proto = super().to_protobuf()
    message = entities_pb2.Actor(name=self.name, health=self.health,
                                 gender=self.gender, body=self.body,
                                 inventory=[item.to_protobuf()
                                            for item
                                            in self.inventory_dict.values()])

    if getattr(self, "facial", None):
      message.facial = self.facial

    if getattr(self, "hair", None):
      message.hair = self.hair

    if getattr(self, "head_item", None):
      message.head_item.MergeFrom(self.head_item.to_protobuf())

    if getattr(self, "torso_item", None):
      message.torso_item.MergeFrom(self.torso_item.to_protobuf())

    if getattr(self, "legs_item", None):
      message.legs_item.MergeFrom(self.legs_item.to_protobuf())

    if getattr(self, "feet_item", None):
      message.feet_item.MergeFrom(self.feet_item.to_protobuf())

    if getattr(self, "weapon", None):
      message.weapon.MergeFrom(self.weapon.to_protobuf())

    proto.Extensions[entities_pb2.Actor.ext].MergeFrom(message)
    return proto

  def to_public_protobuf(self):
    proto = super().to_public_protobuf()
    proto.Extensions[entities_pb2.Actor.ext].ClearField("inventory")
    return proto

  @classmethod
  def from_protobuf(cls, proto):
    record = super().from_protobuf(proto)
    proto = proto.Extensions[entities_pb2.Actor.ext]
    record.update(name=proto.name, health=proto.health, gender=proto.gender,
                  body=proto.body,
                  inventory={items.Item.from_protobuf_polymorphic(item_proto)
                      for item_proto in proto.inventory},
                  facial=proto.facial, hair=proto.hair,
                  head_item=items.Item.from_protobuf_polymorphic(proto.head_item)
                      if proto.HasField("head_item") else None,
                  torso_item=items.Item.from_protobuf_polymorphic(proto.torso_item)
                      if proto.HasField("torso_item") else None,
                  legs_item=items.Item.from_protobuf_polymorphic(proto.legs_item)
                      if proto.HasField("legs_item") else None,
                  feet_item=items.Item.from_protobuf_polymorphic(proto.feet_item)
                      if proto.HasField("feet_item") else None,
                  weapon=items.Item.from_protobuf_polymorphic(proto.weapon)
                      if proto.HasField("weapon") else None)
    return record

  @property
  def equipment(self):
    return {item for item in
            [self.head_item, self.torso_item, self.legs_item, self.feet_item,
             self.weapon] if item is not None}

  @property
  def inventory(self):
    return self.inventory_dict.values()

  @inventory.setter
  def inventory(self, items):
    self.inventory_dict = {item.id: item for item in items}

  @property
  def full_inventory(self):
    return set(self.inventory) | self.equipment

  def get_realm(self, realm_store):
    return realm_store.find(self.realm_id)

  def is_passable_by(self, entity, direction):
    return False

  @property
  def bus_key(self):
    return (self.TYPE, self.id)

  def subscribe(self, bus, channel):
    bus.subscribe(self.bus_key, channel)

  def unsubscribe(self, bus, channel):
    bus.unsubscribe(self.bus_key, channel)

  def add_to_bus(self, bus, protocol):
    bus.add(self.bus_key, protocol)

  def remove_from_bus(self, bus):
    bus.remove(self.bus_key)


@Entity.register
class Player(Actor):
  TYPE = "player"

  def __init__(self, *args, **kwargs):
    self.bbox = geometry.Rectangle(0, 0, 1, 1)
    super().__init__(*args, **kwargs)

  def to_protobuf(self):
    proto = super().to_protobuf()
    proto.Extensions[entities_pb2.Player.ext].MergeFrom(
        entities_pb2.Player(online=getattr(self, "online", False)))
    return proto

  @classmethod
  def from_protobuf(cls, proto):
    record = super().from_protobuf(proto)
    proto = proto.Extensions[entities_pb2.Player.ext]
    record.update(online=proto.online)
    return record

  def is_damageable_by(self, attacker):
    if isinstance(attacker, Player):
      # no PVP (for now)
      return False
    return True


@Entity.register
class NPC(Actor):
  TYPE = "npc"

  def __init__(self, *args, **kwargs):
    self.bbox = geometry.Rectangle(0, 0, 1, 1)
    super().__init__(*args, **kwargs)

  def to_protobuf(self):
    proto = super().to_protobuf()
    proto.Extensions[entities_pb2.NPC.ext].MergeFrom(entities_pb2.NPC(
        behavior=self.behavior))
    return proto

  def to_public_protobuf(self):
    proto = super().to_public_protobuf()
    proto.Extensions[entities_pb2.NPC.ext].ClearField("behavior")
    return proto

  @classmethod
  def from_protobuf(cls, proto):
    record = super().from_protobuf(proto)
    proto = proto.Extensions[entities_pb2.NPC.ext]
    record.update(behavior=proto.behavior
                           if proto.HasField("behavior") else None)
    return record

  def is_damageable_by(self, attacker):
    return True


@Entity.register
class Building(Entity):
  TYPE = "building"


@Entity.register
class Drop(Entity):
  TYPE = "drop"

  def __init__(self, *args, **kwargs):
    self.bbox = geometry.Rectangle(0, 0, 1, 1)
    self.direction = 0
    super().__init__(*args, **kwargs)

  def to_protobuf(self):
    proto = super().to_protobuf()
    proto.Extensions[entities_pb2.Drop.ext].MergeFrom(
        entities_pb2.Drop(item=self.item.to_protobuf()))
    return proto

  @classmethod
  def from_protobuf(cls, proto):
    record = super().from_protobuf(proto)
    proto = proto.Extensions[entities_pb2.Drop.ext]
    record.update(item=items.Item.from_protobuf_polymorphic(proto.item))
    return record

  def is_passable_by(self, entity, direction):
    return True


class EntityStore(record.PolymorphicProtobufStore):
  TYPE = Entity
  PROTOBUF_TYPE = entities_pb2.Entity

  def __init__(self, parent, kvs):
    self.parent = parent
    super().__init__(kvs)

  def add(self, entity):
    super().add(entity)
    entity.realm = self.parent.realms.load(entity.realm_id)

  def create(self, entity):
    super().create(entity)
    for region in entity.regions:
      region.entities.add(entity)
      entity.realm.regions.save(region)

  def destroy(self, entity):
    super().destroy(entity)
    for region in entity.regions:
      region.entities.remove(entity)
