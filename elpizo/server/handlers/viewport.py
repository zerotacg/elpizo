from elpizo.models import entities
from elpizo.models import geometry
from elpizo.protos import packets_pb2
from elpizo.util import green


def on_sight(protocol, actor, message):
  region = actor.realm.regions.load(geometry.Vector2.from_protobuf(
      message.location))

  protocol.send(None, packets_pb2.RegionPacket(
      location=region.location.to_protobuf(),
      region=region.to_public_protobuf(actor.realm)))

  # The client may receive extraneous packets regarding entities it doesn't
  # yet know about, but it will eventually receive up-to-date information
  # about them.
  region_channel = ("region", actor.realm.id, region.location)
  actor.subscribe(protocol.server.bus, region_channel)

  for entity in list(region.entities):
    if entity.id != actor.id:
      protocol.send(
        entity.id,
        packets_pb2.EntityPacket(entity=entity.to_public_protobuf()))


def on_unsight(protocol, actor, message):
  region = actor.realm.regions.load(geometry.Vector2.from_protobuf(
      message.location))

  region_channel = ("region", actor.realm.id, region.location)
  actor.unsubscribe(protocol.server.bus, region_channel)

  for entity in list(region.entities):
    if list(entity.regions) == [region]:
      # Only despawn entities that are exclusively in this region.
      protocol.send(entity.id, packets_pb2.DespawnEntityPacket())
