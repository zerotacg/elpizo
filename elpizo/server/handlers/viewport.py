from elpizo.models import geometry
from elpizo.protos import packets_pb2


def on_viewport(protocol, origin, message):
  bounds = geometry.Rectangle.from_protobuf(message.bounds)
  for region in protocol.player.realm.regions.load_intersecting(bounds):
    protocol.send(None, packets_pb2.RegionPacket(
        location=region.location.to_protobuf(),
        region=region.to_public_protobuf()))

    for entity in region:
      if entity.id != protocol.player.id:
        protocol.send(
            entity.id,
            packets_pb2.EntityPacket(entity=entity.to_public_protobuf()))
