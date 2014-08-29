import logging

from elpizo.models import entities
from elpizo.models import geometry
from elpizo.protos import packets_pb2
from elpizo.util import green


logger = logging.getLogger(__name__)


class UnauthenticatedPolicy(object):
  def on_hello(self, protocol):
    pass

  def get_actor(self, origin):
    return None

  def can_receive_broadcasts_from(self, origin):
    return False

  def on_finish(self):
    pass


class PlayerPolicy(object):
  def __init__(self, id, server):
    self.server = server
    self.player = server.store.entities.load(id)

  def on_hello(self, protocol):
    if self.server.bus.has(self.player.bus_key):
      # We remove the protocol from the player associated with the bus, since
      # we're switching the player to a different protocol.
      last_protocol = self.server.bus.get(self.player.bus_key)
      last_protocol.send(None, packets_pb2.ErrorPacket(
          text="Session collision."))
      last_protocol.bind_policy(UnauthenticatedPolicy())
      last_protocol.transport.close()
      self.server.bus.remove(self.player.bus_key)

    self.server.bus.add(self.player.bus_key, protocol)

    protocol.send(
        None,
        packets_pb2.RealmPacket(realm=self.player.realm.to_public_protobuf()))
    protocol.send(
        self.player.id,
        packets_pb2.EntityPacket(entity=self.player.to_protected_protobuf()))
    protocol.send(self.player.id, packets_pb2.AvatarPacket())

    # Only self.players get chat access.
    self.server.bus.subscribe(self.player.bus_key, ("conversation",
                                                    self.player.name))
    self.server.bus.subscribe(self.player.bus_key, ("chatroom", "global"))
    self.player.ephemeral = entities.Ephemeral()

  def get_actor(self, origin):
    return self.player

  def can_receive_broadcasts_from(self, entity):
    # Don't receive our own broadcasts.
    return entity is not self.player

  def on_finish(self):
    self.player.save()
    logger.info("Flushing player %s to database.", self.player.id)
    self.server.bus.remove(self.player.bus_key)


class NPCPolicy(object):
  def __init__(self, id, server):
    self.server = server
    self.id = id
    self.npcs = set()

  @property
  def bus_key(self):
    return ("npc", self.id)

  def on_hello(self, protocol):
    self.server.bus.add(self.bus_key, protocol)
    logger.info("Hello, NPC server %s!", self.id)

    for realm in self.server.store.realms.load_all():
      protocol.send(
          None,
          packets_pb2.RealmPacket(realm=realm.to_public_protobuf()))

      for region in realm.regions.load_all():
        region_channel = ("region", realm.id, region.location)
        self.server.bus.subscribe(self.bus_key, region_channel)

        protocol.send(None, packets_pb2.RegionPacket(
            location=region.location.to_protobuf(),
            region=region.to_public_protobuf(realm)))

        for entity in region.entities:
          if isinstance(entity, entities.NPC):
            self.npcs.add(entity)
            entity.ephemeral = entities.Ephemeral()

            entity_protobuf = entity.to_protected_protobuf()
          else:
            entity_protobuf = entity.to_public_protobuf()

          protocol.send(entity.id, packets_pb2.EntityPacket(
              entity=entity_protobuf))

  def get_actor(self, origin):
    return self.server.store.entities.load(origin) if origin is not None else \
           None

  def can_receive_broadcasts_from(self, entity):
    # Don't receive broadcasts we sent.
    return entity not in self.npcs

  def on_finish(self):
    logger.warn("NPC server %s died!", self.id)

    self.server.bus.remove(self.bus_key)
    for npc in self.npcs:
      npc.save()
      logger.info("Flushing NPC %s to database.", npc.id)


REGISTRY = {
    "player": PlayerPolicy,
    "npc": NPCPolicy
}
