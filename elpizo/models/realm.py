from elpizo import models
from elpizo.models import geometry
from elpizo.protos import realm_pb2


class Realm(models.ProtobufRecord):
  KEY_PREFIX = "realm"
  PROTOBUF_TYPE = realm_pb2.Realm

  def to_protobuf(self):
    return entities_pb2.Realm(name=self.name, size=self.size.to_protobuf())

  def from_protobuf(self, proto):
    self.name = proto.name
    self.size = geometry.Vector2.from_protobuf(proto.size)


class Region(models.ProtobufRecord):
  KEY_PREFIX = "region"
  PROTOBUF_TYPE = realm_pb2.Region

  def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.entities = {}

  def to_protobuf(self):
    return entities_pb2.Region()

  def from_protobuf(self, proto):
    pass

Region.SIZE = 16
