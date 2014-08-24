from elpizo.models import entities
from elpizo.protos import packets_pb2
from elpizo.util import mint
from elpizo.util import net


def on_hello(protocol, actor, message):
  try:
    token = protocol.server.mint.unmint(message.token)
  except mint.InvalidTokenError as e:
    raise net.ProtocolError("Invalid login token: {}".format(e))

  realm, id = token.decode("utf-8").split(".")

  if realm not in {"player", "npc"}:
    raise net.ProtocolError("Unknown authentication realm.")

  actor = protocol.server.store.entities.load(id)

  if not isinstance(actor, {
      "player": entities.Player,
      "npc": entities.NPC
  }[realm]):
    raise net.ProtocolError("Provided authentication realm is not acceptable.")

  if protocol.server.bus.has(actor.id):
    # We remove the protocol from the actor associated with the bus, since
    # we're switching the actor to a different protocol.
    last_protocol = protocol.server.bus.get(actor.id)
    last_protocol.send(None, packets_pb2.ErrorPacket(
        text="Session collision."))
    last_protocol.bind_actor(None)
    last_protocol.transport.close()
    protocol.server.bus.remove(actor.id)

  protocol.bind_actor(actor)
  protocol.server.bus.add(actor.id, protocol)

  protocol.send(
      None,
      packets_pb2.RealmPacket(realm=actor.realm.to_public_protobuf()))
  protocol.send(
      actor.id,
      packets_pb2.EntityPacket(entity=actor.to_protected_protobuf()))
  protocol.send(actor.id, packets_pb2.AvatarPacket())

  if isinstance(actor, entities.Player):
    # Only players get chat access.
    protocol.server.bus.subscribe(
        protocol.actor.id,
        ("conversation", protocol.actor.name))

    protocol.server.bus.subscribe(
        protocol.actor.id,
        ("chatroom", "global"))
