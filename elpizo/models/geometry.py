from elpizo.protos import geometry_pb2
from elpizo.util import geometry


class Vector2(geometry.Vector2):
  def to_protobuf(self):
    return geometry_pb2.Vector2(x=self.x, y=self.y)

  @classmethod
  def from_protobuf(cls, serialized):
    return cls(serialized.x, serialized.y)


class Rectangle(geometry.Rectangle):
  def to_protobuf(self):
    return geometry_pb2.Rectangle(left=self.left, top=self.top,
                                  width=self.width, height=self.height)

  @classmethod
  def from_protobuf(cls, serialized):
    return cls(serialized.left, serialized.top,
               serialized.width, serialized.height)
