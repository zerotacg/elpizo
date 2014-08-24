from elpizo.util import record


class ProtobufRecord(record.Record):
  def serialize(self):
    return self.to_protobuf().SerializeToString()

  @classmethod
  def deserialize(cls, id, serialized):
    record = cls.from_protobuf(cls.PROTOBUF_TYPE.FromString(serialized))
    record.id = id
    return record


class PolymorphicProtobufRecord(record.Record):
  def serialize(self):
    return self.to_protobuf().SerializeToString()

  @classmethod
  def deserialize(cls, id, serialized):
    record = cls.from_protobuf_polymorphic(
        cls.PROTOBUF_TYPE.FromString(serialized))
    record.id = id
    return record
