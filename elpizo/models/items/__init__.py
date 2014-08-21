from elpizo import models
from elpizo.protos import items_pb2
from elpizo.util import record


class Item(object):
  KEY_PREFIX = "item"
  REGISTRY = {}

  def __init__(self, **kwargs):
    for k, v in kwargs.items():
      setattr(self, k, v)

  @classmethod
  def register(cls, subclass):
    cls.REGISTRY[subclass.TYPE] = subclass
    return subclass

  def to_protobuf(self):
    return items_pb2.Item(type=self.TYPE)

  @classmethod
  def from_protobuf(cls, proto):
    return cls(type=proto.type)

  @classmethod
  def from_protobuf_polymorphic(cls, proto):
    return cls.REGISTRY[proto.type].from_protobuf(proto)
