import logging
import math

from elpizo.models import geometry
from elpizo.models import record
from elpizo.protos import realm_pb2


logger = logging.getLogger(__name__)


class Realm(record.ProtobufRecord):
  PROTOBUF_TYPE = realm_pb2.Realm

  def __init__(self, *args, **kwargs):
    self.regions = None
    super().__init__(*args, **kwargs)

  def to_protobuf(self):
    return realm_pb2.Realm(name=self.name, size=self.size.to_protobuf())

  @classmethod
  def from_protobuf(cls, proto):
    return cls(name=proto.name,
               size=geometry.Vector2.from_protobuf(proto.size))

  def to_public_protobuf(self):
    proto = self.to_protobuf()
    proto.id = self.id
    return proto

  def load_intersecting_regions(self, bounds):
    left = max([Region.floor(bounds.left), 0])
    top = max([Region.floor(bounds.top), 0])
    right = min([Region.ceil(bounds.right), self.size.x])
    bottom = min([Region.ceil(bounds.bottom), self.size.y])

    for y in range(top, bottom, Region.SIZE):
      for x in range(left, right, Region.SIZE):
          yield self.regions.load(geometry.Vector2(x, y))

  def save(self):
    super().save()
    if self.regions is not None:
      logger.info("Saving all child regions for realm: %s", self.id)
      self.regions.save_all()

  def is_passable(self, location, direction):
    try:
      region = self.regions.load_closest(location)
    except KeyError:
      return False

    if not region.is_passable(location, direction):
      return False

    # TODO: check entities
    return True


class Region(record.ProtobufRecord):
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

  def to_public_protobuf(self, realm):
    proto = self.to_protobuf()
    proto.ClearField("entity_ids")
    proto.realm_id = realm.id
    proto.location.MergeFrom(self.location.to_protobuf())
    return proto

  @classmethod
  def from_protobuf(cls, proto):
    return cls(layers=[Layer.from_protobuf(layer) for layer in proto.layers],
               passabilities=list(proto.passabilities),
               entity_ids=list(proto.entity_ids))

  def is_passable(self, location, direction):
    location = location.offset(self.location.negate())
    i = location.y * Region.SIZE + location.x

    return bool((self.passabilities[i] >> direction) & 0x1)


class Layer(object):
  def __init__(self, **kwargs):
    for k, v in kwargs.items():
      setattr(self, k, v)

  def to_protobuf(self):
    return realm_pb2.Layer(terrain=self.terrain, tiles=self.tiles)

  @classmethod
  def from_protobuf(cls, proto):
    return cls(terrain=proto.terrain, tiles=list(proto.tiles))
