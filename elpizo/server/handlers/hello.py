from elpizo.protos import packets_pb2
from elpizo.util import mint
from elpizo.util import net


def on_hello(protocol, message):
  try:
    token = protocol.server.mint.unmint(message.token)
  except mint.InvalidTokenError as e:
    raise net.ProtocolError("Invalid login token: {}".format(e))

  realm, id = token.decode("utf-8").split(".")

  if realm not in {"player"}:
    raise net.ProtocolError("Unknown authentication realm.")

  player = protocol.server.store.entities.load(id)

  if protocol.server.bus.has(player.id):
    # We remove the protocol from the player associated with the bus, since
    # we're switching the player to a different protocol.
    last_protocol = protocol.server.bus.get(player.id)
    last_protocol.send(None, packets_pb2.ErrorPacket(
        text="Session collision."))
    last_protocol.player = None
    protocol.server.bus.remove(player.id)

  protocol.player = player
  protocol.server.bus.add(player.id, protocol)

  protocol.send(
      None,
      packets_pb2.RealmPacket(realm=player.realm.to_public_protobuf()))
  protocol.send(
      player.id,
      packets_pb2.EntityPacket(entity=player.to_protected_protobuf()))
  protocol.send(player.id, packets_pb2.AvatarPacket())

  protocol.server.bus.subscribe(
      protocol.player.id,
      ("conversation", protocol.player.name))

  protocol.server.bus.subscribe(
      protocol.player.id,
      ("chatroom", "global"))
