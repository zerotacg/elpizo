from elpizo.util import record


Record = record.Record


class ProtobufStore(record.Store):
  @classmethod
  def serialize(cls, record):
    return record.to_protobuf().SerializeToString()

  @classmethod
  def deserialize(cls, id, serialized):
    record = cls.TYPE.from_protobuf(cls.PROTOBUF_TYPE.FromString(serialized))
    record.id = id
    return record


class PolymorphicProtobufStore(ProtobufStore):
  @classmethod
  def deserialize(cls, id, serialized):
    record = cls.TYPE.from_protobuf_polymorphic(
        cls.PROTOBUF_TYPE.FromString(serialized))
    record.id = id
    return record
