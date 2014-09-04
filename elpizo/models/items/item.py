from elpizo import models
from elpizo.models import record
from elpizo.protos import items_pb2


class Item(record.ProtobufRecord):
  REGISTRY = {}

  PROTOBUF_TYPE = items_pb2.Item

  FIELDS = [
      record.Field("id", record.Scalar),
      record.Field("type", record.Scalar, record_field="TYPE")
  ]

  @classmethod
  def register(cls, subclass):
    cls.REGISTRY[subclass.TYPE] = subclass
    return subclass

  @classmethod
  def from_protobuf_polymorphic(cls, proto):
    return cls.REGISTRY[proto.type].from_protobuf(proto)
