import contextlib

from elpizo.models import geometry
from elpizo.models import realm
from elpizo.models import items
from elpizo.models import record
from elpizo.protos import entities_pb2
from elpizo.util import support


class Entity(record.PolymorphicProtobufRecord):
  PROTOBUF_TYPE = entities_pb2.Entity
  REGISTRY = {}

  DIRECTION_VECTORS = {
      0: geometry.Vector2( 0, -1),  # N
      1: geometry.Vector2(-1,  0),  # W
      2: geometry.Vector2( 0,  1),  # S
      3: geometry.Vector2( 1,  0)   # E
  }

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
    proto = self.to_protobuf()
    proto.id = self.id
    return proto

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


class Actor(Entity):
  BASE_SPEED = 5

  @property
  def speed(self):
    return self.BASE_SPEED

  def to_protobuf(self):
    proto = super().to_protobuf()
    message = entities_pb2.Actor(name=self.name, health=self.health,
                                 gender=self.gender, body=self.body,
                                 inventory=[item.to_protobuf()
                                            for item in self.inventory])

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
                  inventory=[items.Item.from_protobuf_polymorphic(item_proto)
                             for item_proto in proto.inventory],
                  facial=proto.facial, hair=proto.hair,
                  head_item=items.Item.from_protobuf_polymorphic(proto.head_item)
                      if proto.HasField("head_item") else None,
                  torso_item=items.Item.from_protobuf_polymorphic(proto.torso_item)
                      if proto.HasField("torso_item") else None,
                  legs_item=items.Item.from_protobuf_polymorphic(proto.legs_item)
                      if proto.HasField("legs_item") else None,
                  feet_item=items.Item.from_protobuf_polymorphic(proto.feet_item)
                      if proto.HasField("feet_item") else None)
    return record

  def get_realm(self, realm_store):
    return realm_store.find(self.realm_id)


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


class NPC(Actor):
  _TYPE_PREFIX = "npc"

  @support.classproperty
  def TYPE(cls):
    return ".".join([cls._TYPE_PREFIX, cls.SPECIES])

  @support.classproperty
  def REGISTRY(cls):
    registry = {}
    for k, v in super().REGISTRY.items():
      type, *rest = k.split(".")
      if type != cls._TYPE_PREFIX:
        continue

      species, = rest
      registry[species] = v
    return registry

  def __init__(self, *args, **kwargs):
    self.bbox = geometry.Rectangle(0, 0, 1, 1)
    super().__init__(*args, **kwargs)

  def to_protected_protobuf(self):
    proto = super().to_protected_protobuf()
    proto.type = self._TYPE_PREFIX
    proto.Extensions[entities_pb2.NPC.ext].MergeFrom(
        entities_pb2.NPC(species=self.SPECIES))
    return proto

  def to_protobuf(self):
    proto = super().to_protobuf()
    proto.Extensions[entities_pb2.NPC.ext].MergeFrom(entities_pb2.NPC())
    return proto

  @classmethod
  def from_protobuf(cls, proto):
    record = super().from_protobuf(proto)
    proto = proto.Extensions[entities_pb2.NPC.ext]
    return record


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
