from elpizo.protos import entities_pb2
from elpizo import models
from elpizo.models import geometry
from elpizo.models import items


class Entity(models.ProtobufRecord):
  KEY_PREFIX = "entity"
  PROTOBUF_TYPE = entities_pb2.Entity
  REGISTRY = {}

  @classmethod
  def register(cls, subclass):
    cls.REGISTRY[subclass.TYPE] = subclass

  def to_protobuf(self):
    return entities_pb2.Entity(type=self.TYPE,
                               location=self.location.to_protobuf(),
                               bbox=self.bbox.to_protobuf(),
                               direction=self.direction)

  def from_protobuf(self, proto):
    self.type = proto.type
    self.realm_id = proto.realm_id
    self.location = geometry.Vector2.from_protobuf(proto.location)
    self.bbox = geometry.Rectangle.from_protobuf(proto.bbox)
    self.direction = proto.direction


class Actor(Entity):
  def to_protobuf(self):
    proto = super().to_protobuf()
    message = entities_pb2.Actor(name=self.name, health=self.health,
                                 gender=self.gender, body=self.body,
                                 inventory=[item.to_protobuf()
                                            for item in self.inventory])

    if self.facial is not None:
      message.facial = self.facial

    if self.hair is not None:
      message.hair = self.hair

    if self.head_item is not None:
      message.head_item.MergeFrom(self.head_item.to_protobuf())

    if self.torso_item is not None:
      message.torso_item.MergeFrom(self.torso_item.to_protobuf())

    if self.legs_item is not None:
      message.legs_item.MergeFrom(self.legs_item.to_protobuf())

    if self.feet_item is not None:
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
    self.head_item = proto.head_item and \
        items.Item.from_protobuf_polymorphic(proto.head_item)
    self.torso_item = proto.torso_item and \
        items.Item.from_protobuf_polymorphic(proto.torso_item)
    self.legs_item = proto.legs_item and \
        items.Item.from_protobuf_polymorphic(proto.legs_item)
    self.feet_item = proto.feet_item and \
        items.Item.from_protobuf_polymorphic(proto.feet_item)


@Entity.register
class Player(Actor):
  TYPE = "player"

  def to_protobuf(self):
    proto = super().to_protobuf()
    message = entities_pb2.Player(online=self.online)

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
