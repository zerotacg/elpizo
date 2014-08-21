import math

from elpizo import models
from elpizo.models import geometry
from elpizo.protos import realm_pb2
from elpizo.server.util import kvs
from elpizo.util import record


class Realm(models.ProtobufRecord):
  PROTOBUF_TYPE = realm_pb2.Realm

  def to_protobuf(self):
    return realm_pb2.Realm(name=self.name, size=self.size.to_protobuf())

  def from_protobuf(self, proto):
    self.name = proto.name
    self.size = geometry.Vector2.from_protobuf(proto.size)


class Region(models.ProtobufRecord):
  PROTOBUF_TYPE = realm_pb2.Region

  SIZE = 16

  @classmethod
  def floor(cls, x):
    return (x // cls.SIZE) * cls.SIZE

  @classmethod
  def ceil(cls, x):
    return math.ceil(x / cls.SIZE) * cls.SIZE

  @property
  def id(self):
    return "{x},{y}".format(x=self.location.x, y=self.location.y)

  @id.setter
  def id(self, v):
    if v is None:
      return

    x, y = v.split(",")
    self.location = geometry.Vector2(int(x), int(y))

  def to_protobuf(self):
    return realm_pb2.Region(layers=[layer.to_protobuf()
                                    for layer in self.layers],
                            passabilities=self.passabilities,
                            entity_ids=[entity.id for entity in self.entities])

  def to_public_protobuf(self):
    proto = self.to_protobuf()
    proto.ClearField("entity_ids")
    return proto

  def from_protobuf(self, proto):
    self.layers = [Layer.from_protobuf(layer) for layer in proto.layers]
    self.passabilities = list(proto.passabilities)
    self.entity_ids = list(proto.entity_ids)


class Layer(object):
  def __init__(self, **kwargs):
    for k, v in kwargs.items():
      setattr(self, k, v)

  def to_protobuf(self):
    return realm_pb2.Layer(terrain=self.terrain, tiles=self.tiles)

  @classmethod
  def from_protobuf(cls, proto):
    return Layer(terrain=proto.terrain, tiles=list(proto.tiles))
