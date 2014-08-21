from elpizo.protos import packets_pb2
from elpizo.util import mint
from elpizo.util import net


def on_hello(protocol, origin, message):
  try:
    token = protocol.server.mint.unmint(message.token)
  except mint.InvalidTokenError as e:
    raise net.ProtocolError(str(e))

  realm, id = token.decode("utf-8").split(".")

  if realm not in {"player"}:
    raise net.ProtocolError("unknown authentication realm")

  player = protocol.server.store.entities.load(id)

  if protocol.server.bus.has(player.id):
    # We remove the protocol from the player associated with the bus, since
    # we're switching the player to a different protocol.
    last_protocol = protocol.server.bus.get(player.id)
    last_protocol.send(None, packets_pb2.ErrorPacket(text="session collision"))
    last_protocol.player = None
    protocol.server.bus.remove(player.id)

  protocol.player = player
  protocol.server.bus.add(player.id, protocol)

  for region in protocol.player.regions:
    print(region.entities, region.location, player.location, player.name)
