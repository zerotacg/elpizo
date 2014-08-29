from elpizo.models import entities
from elpizo.models import geometry
from elpizo.protos import packets_pb2
from elpizo.util import green


def on_viewport(protocol, actor, message):
  last_cache_bounds = protocol.cache_bounds
  cache_bounds = geometry.Rectangle.from_protobuf(message.bounds)
  protocol.cache_bounds = cache_bounds

  last_region_locations = {
      region.location
      for region in actor.realm.load_intersecting_regions(last_cache_bounds)}

  new_regions = list(actor.realm.load_intersecting_regions(cache_bounds))
  new_region_locations = {region.location for region in new_regions}

  removed_region_locations = last_region_locations - new_region_locations

  for region in new_regions:
    if region.location not in last_region_locations:
      region_channel = ("region", actor.realm.id, region.location)

      protocol.send(None, packets_pb2.RegionPacket(
          location=region.location.to_protobuf(),
          region=region.to_public_protobuf(actor.realm)))

      # The client may receive extraneous packets regarding entities it doesn't
      # yet know about, but it will eventually receive up-to-date information
      # about them.
      protocol.server.bus.subscribe(actor.bus_key, region_channel)

      for entity in list(region.entities):
        if entity.id != actor.id:
          protocol.send(
            entity.id,
            packets_pb2.EntityPacket(entity=entity.to_public_protobuf()))

  # The client should now remove all entities in regions it doesn't know about.
  for location in removed_region_locations:
    region = actor.realm.regions.load(location)
    region_channel = ("region", actor.realm.id, region.location)

    protocol.server.bus.unsubscribe(actor.bus_key, region_channel)

    for entity in list(region.entities):
      if not entity.bounds.intersects(cache_bounds):
        protocol.send(entity.id, packets_pb2.DespawnEntityPacket())
