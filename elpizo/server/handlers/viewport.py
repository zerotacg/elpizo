from elpizo.models import geometry
from elpizo.protos import packets_pb2


def on_viewport(protocol, message):
  last_cache_bounds = protocol.cache_bounds
  cache_bounds = geometry.Rectangle.from_protobuf(message.bounds)
  protocol.cache_bounds = cache_bounds

  known_regions = set()

  for region in \
      protocol.actor.realm.load_intersecting_regions(last_cache_bounds):
    protocol.server.bus.unsubscribe(
        protocol.actor.id,
        ("region", protocol.actor.realm.id, region.location))
    known_regions.add(region.location)

  for region in protocol.actor.realm.load_intersecting_regions(cache_bounds):
    protocol.server.bus.subscribe(
        protocol.actor.id,
        ("region", protocol.actor.realm.id, region.location))

    if region.location not in known_regions:
      protocol.send(None, packets_pb2.RegionPacket(
          location=region.location.to_protobuf(),
          region=region.to_public_protobuf(protocol.actor.realm)))

      for entity in region.entities:
        if entity.id != protocol.actor.id:
          protocol.send(
              entity.id,
              packets_pb2.EntityPacket(entity=entity.to_public_protobuf()))
