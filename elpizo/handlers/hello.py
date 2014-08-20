from elpizo.protos import packets_pb2
from elpizo.util import mint
from elpizo.util import net


def on_hello(protocol, origin, message):
  try:
    token = protocol.server.mint.unmint(message.token)
  except mint.InvalidTokenError as e:
    raise net.ProtocolError(str(e))

  realm, id = token.split(".")
  id = int(id)

  if realm not in {"player"}:
    raise net.ProtocolError("unknown authentication realm")

  player = protocol.server.store.entities.find(id)
  player.protocol = protocol
