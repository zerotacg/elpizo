from elpizo.models.items import equipment
from elpizo.protos import items_pb2


class Weapon(equipment.Equipment):
  SLOT = 4

  def to_protobuf(self):
    proto = super().to_protobuf()
    proto.Extensions[items_pb2.Weapon.ext].MergeFrom(items_pb2.Weapon())
    return proto

  @classmethod
  def from_protobuf(cls, proto):
    record = super().from_protobuf(proto)
    proto = proto.Extensions[items_pb2.Weapon.ext]
    return record


class Dagger(Weapon):
  TYPE = "dagger"
