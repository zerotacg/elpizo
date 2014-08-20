from elpizo.util import record


class ProtobufRecord(record.Record):
  def serialize(self):
    return self.to_protobuf().SerializeToString()

  def deserialize(self, serialized):
    self.from_protobuf(self.PROTOBUF_TYPE.FromString(serialized))
