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

  @property
  def bounds(self):
    return geometry.Rectangle(0, 0, self.size.x, self.size.y)

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

  def is_passable(self, bounds, direction):
    if not self.bounds.contains(bounds):
      return False

    regions = []

    for y in range(Region.floor(bounds.top), Region.ceil(bounds.bottom),
                   Region.SIZE):
      for x in range(Region.floor(bounds.left), Region.ceil(bounds.right),
                     Region.SIZE):
        try:
          region = self.regions.load(geometry.Vector2(x, y))
        except KeyError:
          return False
        else:
          regions.append(region)

    for region in regions:
      if not region.is_passable(bounds, direction):
        return False

      for entity in region.entities:
        if entity.bounds.intersects(bounds) and \
           not entity.is_passable(direction):
         return False

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

  @property
  def bounds(self):
    return geometry.Rectangle(self.location.x, self.location.y,
                              self.SIZE, self.SIZE)

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

  def is_passable(self, bounds, direction):
    bounds = bounds.offset(self.location.negate())

    for y in range(bounds.top, bounds.bottom):
      for x in range(bounds.left, bounds.right):
        if 0 <= x < Region.SIZE and 0 <= y < Region.SIZE and \
          not ((self.passabilities[y * Region.SIZE + x] >> direction) & 0x1):
          return False

    return True


class Layer(object):
  def __init__(self, **kwargs):
    for k, v in kwargs.items():
      setattr(self, k, v)

  def to_protobuf(self):
    return realm_pb2.Layer(terrain=self.terrain, tiles=self.tiles)

  @classmethod
  def from_protobuf(cls, proto):
    return cls(terrain=proto.terrain, tiles=list(proto.tiles))


class RealmStore(record.Store):
  def __init__(self, parent, kvs):
    self.parent = parent
    super().__init__(Realm.find, kvs)

  def add(self, realm):
    super().add(realm)
    realm.regions = self.parent.make_region_store(realm)

  def expire(self, realm):
    super().expire(realm)
    realm.regions.expire_all()


class RegionStore(record.Store):
  def __init__(self, entities, kvs):
    self.entities = entities
    super().__init__(self.find, kvs)

  def load(self, vec):
    return super().load("{x},{y}".format(x=vec.x, y=vec.y))

  def load_closest(self, location):
    return self.load(location.map(Region.floor))

  def find(self, id, kvs):
    region = Region.find(id, kvs)
    region.entities = {self.entities.load(entity_id)
                       for entity_id in region.entity_ids}
    return region

  def keys(self):
    for key in super().keys():
      x, y = key.split(",")
      yield geometry.Vector2(int(x), int(y))
