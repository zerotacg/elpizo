from elpizo.models import items
from elpizo.protos import items_pb2


class HeadItem(items.Equipment):
  SLOT = items.Equipment.HEAD_ITEM


class TorsoItem(items.Equipment):
  SLOT = items.Equipment.TORSO_ITEM


class LegsItem(items.Equipment):
  SLOT = items.Equipment.LEGS_ITEM


class FeetItem(items.Equipment):
  SLOT = items.Equipment.FEET_ITEM


class Weapon(items.Equipment):
  SLOT = items.Equipment.WEAPON

  def to_protobuf(self):
    proto = super().to_protobuf()
    proto.Extensions[items_pb2.Weapon.ext].MergeFrom(items_pb2.Weapon())
    return proto

  @classmethod
  def from_protobuf(cls, proto):
    record = super().from_protobuf(proto)
    proto = proto.Extensions[items_pb2.Weapon.ext]
    return record


class WhiteLongsleeveShirt(TorsoItem):
  TYPE = "white_longsleeve_shirt"


class TealPants(LegsItem):
  TYPE = "teal_pants"


class BrownShoes(FeetItem):
  TYPE = "brown_shoes"
