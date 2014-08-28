import functools

from elpizo.models import entities
from elpizo.protos import packets_pb2
from elpizo.server import policies
from elpizo.util import mint
from elpizo.util import net


def on_hello(protocol, actor, message):
  try:
    token = protocol.server.mint.unmint(message.token)
  except mint.InvalidTokenError as e:
    raise net.ProtocolError("Invalid login token: {}".format(e))

  auth_realm, _, id = token.decode("utf-8").partition(".")

  auth = {
      "player": functools.partial(auth_as_player, id),
      "npc": auth_as_npc
  }.get(auth_realm)

  if auth is None:
    raise net.ProtocolError("Unknown authentication realm.")

  auth(protocol, message)


def auth_as_player(id, protocol, message):
  actor = protocol.server.store.entities.load(id)

  if protocol.server.bus.has(actor.id):
    # We remove the protocol from the actor associated with the bus, since
    # we're switching the actor to a different protocol.
    last_protocol = protocol.server.bus.get(actor.id)
    last_protocol.send(None, packets_pb2.ErrorPacket(
        text="Session collision."))
    last_protocol.bind_actor_policy(policies.UnauthenticatedPolcy())
    last_protocol.transport.close()
    protocol.server.bus.remove(actor.id)

  protocol.bind_actor_policy(policies.PlayerPolicy(actor))
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
        actor.id,
        ("conversation", actor.name))

    protocol.server.bus.subscribe(
        actor.id,
        ("chatroom", "global"))


def auth_as_npc(protocol, message):
  protocol.bind_actor_policy(policies.NPCPolicy())
