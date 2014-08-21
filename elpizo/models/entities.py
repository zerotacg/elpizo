import contextlib

from elpizo import models
from elpizo.models import geometry
from elpizo.models import realm
from elpizo.models import items
from elpizo.protos import entities_pb2


class Entity(models.ProtobufRecord):
  PROTOBUF_TYPE = entities_pb2.Entity
  REGISTRY = {}

  @classmethod
  def register(cls, subclass):
    cls.REGISTRY[subclass.TYPE] = subclass
    return subclass

  def to_protobuf(self):
    return entities_pb2.Entity(type=self.TYPE, realm_id=self.realm_id,
                               location=self.location.to_protobuf(),
                               bbox=self.bbox.to_protobuf(),
                               direction=self.direction)

  def from_protobuf(self, proto):
    self.type = proto.type
    self.realm_id = proto.realm_id
    self.location = geometry.Vector2.from_protobuf(proto.location)
    self.bbox = geometry.Rectangle.from_protobuf(proto.bbox)
    self.direction = proto.direction

  @property
  def regions(self):
    return self.realm.regions.load_contained_by(self.bbox.offset(self.location))

  @contextlib.contextmanager
  def move_transaction(self):
    initial_regions = list(self.regions)

    yield

    for region in initial_regions:
      region.entities.remove(self)

    for region in self.regions:
      region.entities.add(self)


class Actor(Entity):
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

    proto.Extensions[entities_pb2.Actor.actor_ext].MergeFrom(message)
    return proto

  def from_protobuf(self, proto):
    super().from_protobuf(proto)
    proto = proto.Extensions[entities_pb2.Actor.actor_ext]

    self.name = proto.name
    self.health = proto.health
    self.gender = proto.gender
    self.body = proto.body
    self.inventory = [items.Item.from_protobuf_polymorphic(item_proto)
                      for item_proto in proto.inventory]
    self.facial = proto.facial
    self.hair = proto.hair

    self.head_item = items.Item.from_protobuf_polymorphic(proto.head_item) \
        if proto.HasField("head_item") else None

    self.torso_item = items.Item.from_protobuf_polymorphic(proto.torso_item) \
        if proto.HasField("torso_item") else None

    self.legs_item = items.Item.from_protobuf_polymorphic(proto.legs_item) \
        if proto.HasField("legs_item") else None

    self.feet_item = items.Item.from_protobuf_polymorphic(proto.feet_item) \
        if proto.HasField("feet_item") else None

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
    message = entities_pb2.Player(online=getattr(self, "online", False))
    proto.Extensions[entities_pb2.Player.player_ext].MergeFrom(message)
    return proto

  def from_protobuf(self, proto):
    super().from_protobuf(proto)
    proto = proto.Extensions[entities_pb2.Player.player_ext]

    self.online = proto.online


@Entity.register
class Building(Entity):
  TYPE = "building"


@Entity.register
class Drop(Entity):
  TYPE = "drop"

  def to_protobuf(self):
    proto = super().to_protobuf()
    message = entities_pb2.Drop(item=self.item.to_protobuf())
    proto.Extensions[entities_pb2.Drop.drop_ext].MergeFrom(message)
    return proto

  def from_protobuf(self, proto):
    super().from_protobuf(proto)
    proto = proto.Extensions[entities_pb2.Drop.drop_ex]

    self.item = items.Item.from_protobuf_polymorphic(proto.item)
