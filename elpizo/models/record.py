from elpizo.util import record


class ProtobufStore(record.Store):
  @classmethod
  def serialize(cls, record):
    return record.to_protobuf().SerializeToString()

  @classmethod
  def deserialize(cls, id, serialized):
    record = cls.RECORD_TYPE.from_protobuf(cls.PROTOBUF_TYPE.FromString(serialized))
    record.id = id
    return record


class PolymorphicProtobufStore(ProtobufStore):
  @classmethod
  def deserialize(cls, id, serialized):
    record = cls.RECORD_TYPE.from_protobuf_polymorphic(
        cls.PROTOBUF_TYPE.FromString(serialized))
    record.id = id
    return record


class ProtobufRecord(record.Record):
  FIELDS = []

  def to_protobuf(self):
    proto = self.PROTOBUF_TYPE()

    for superclass in self.__class__.__mro__:
      if not issubclass(superclass, ProtobufRecord):
        break

      for field in superclass.FIELDS:
        field.serialize_to(proto, self)

    return proto

  @classmethod
  def from_protobuf(cls, proto):
    record = cls()

    for superclass in cls.__mro__:
      if not issubclass(superclass, ProtobufRecord):
        break

      for field in superclass.FIELDS:
        field.deserialize_to(record, proto)

    return record


class Scalar(object):
  @classmethod
  def to_protobuf(cls, value):
    return value

  @classmethod
  def from_protobuf(cls, value):
    return value


class Polymorphic(object):
  def __init__(self, type):
    self.type = type

  def to_protobuf(self, record):
    return record.to_protobuf()

  def from_protobuf(self, proto):
    return self.type.from_protobuf_polymorphic(proto)


class Field(object):
  def __init__(self, proto_field, type, record_field=None, extension=None):
    self.proto_field = proto_field
    self.type = type
    self.record_field = record_field if record_field is not None \
                                     else proto_field
    self.extension = extension

  def get_target_proto(self, proto):
      if self.extension is not None:
        proto = proto.Extensions[self.extension]
      return proto

  def serialize_to(self, proto, record):
    proto = self.get_target_proto(proto)
    value = getattr(record, self.record_field, None)

    if value is not None:
      if self.type is Scalar:
        setattr(proto, self.proto_field, self.type.to_protobuf(value))
      else:
        getattr(proto, self.proto_field).MergeFrom(self.type.to_protobuf(value))

  def deserialize_to(self, record, proto):
    proto = self.get_target_proto(proto)
    setattr(record, self.record_field,
        self.type.from_protobuf(getattr(proto, self.proto_field))
        if proto.HasField(self.proto_field)
        else None)


class RepeatedField(Field):
  def serialize_to(self, proto, record):
    proto = self.get_target_proto(proto)
    getattr(proto, self.proto_field).extend(
        self.type.to_protobuf(value)
        for value in getattr(record, self.record_field, []))

  def deserialize_to(self, record, proto):
    proto = self.get_target_proto(proto)
    setattr(record, self.record_field,
            [self.type.from_protobuf(value)
             for value in getattr(proto, self.proto_field)])
