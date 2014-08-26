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

  # Unsubscribe from last regions that aren't present in new regions.
  for location in last_region_locations - \
                  {region.location for region in new_regions}:
    protocol.server.bus.unsubscribe(actor.id,
                                    ("region", actor.realm.id, location))

  for region in new_regions:
    if region.location not in last_region_locations:
      region_channel = ("region", actor.realm.id, region.location)

      protocol.send(None, packets_pb2.RegionPacket(
          location=region.location.to_protobuf(),
          region=region.to_public_protobuf(actor.realm)))

      # BEGIN CRITICAL SECTION: We have to acquire the broadcast lock for the
      # region's channel, so that we manage to send all information about the
      # region to the actor before they are allowed to receive broadcasts on the
      # channel.
      with green.locking(
          protocol.server.bus.broadcast_lock_for(actor.id, region_channel)):
        protocol.server.bus.subscribe(actor.id, region_channel)

        for entity in region.entities:
          if entity.id != actor.id:
            protocol.send(
                entity.id,
                packets_pb2.EntityPacket(entity=entity.to_public_protobuf()))
      # END CRITICAL SECTION
