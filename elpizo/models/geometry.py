from elpizo.models import record
from elpizo.protos import geometry_pb2
from elpizo.util import geometry


class Vector2(geometry.Vector2, record.ProtobufRecord):
  PROTOBUF_TYPE = geometry_pb2.Vector2
  FIELDS = [
      record.Field("x", record.Scalar),
      record.Field("y", record.Scalar),
  ]

  def __init__(self, x=None, y=None):
    # We need to make the x and y parameters optional for deserialization to
    # work.
    super().__init__(x, y)

  def __repr__(self):
    return "models.geometry." + super().__repr__()


class Rectangle(geometry.Rectangle, record.ProtobufRecord):
  PROTOBUF_TYPE = geometry_pb2.Rectangle
  FIELDS = [
      record.Field("left", record.Scalar),
      record.Field("top", record.Scalar),
      record.Field("width", record.Scalar),
      record.Field("height", record.Scalar),
  ]


  def __init__(self, left=None, top=None, width=None, height=None):
    # We need to make all the parameters optional for deserialization to work.
    super().__init__(left, top, width, height)

  def __repr__(self):
    return "models.geometry." + super().__repr__()
