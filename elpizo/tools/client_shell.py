import IPython
import logging
import sys

from elpizo.protos import packets_pb2
from elpizo.util import mint
from elpizo.util import net

from ws4py.client import threadedclient
from urllib.parse import urlencode


class GameClient(threadedclient.WebSocketClient):
  def __init__(self, token, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.token = token

  def opened(self):
    logging.info("Connection opened.")
    self.send(packets_pb2.HelloPacket(token=self.token))

  def closed(self, code, reason):
    logging.info("Connection closed.")

  def received_message(self, m):
    origin, message = net.Protocol.deserialize_packet(m.data)
    print(type(message).__name__)
    print(origin)
    print(message)

  def send(self, message):
    super().send(net.Protocol.serialize_packet(None, message), binary=True)


def main():
  if len(sys.argv) != 2:
    sys.stderr.write("usage: {argv0} player_id\n".format(argv0=sys.argv[0]))
    sys.exit(1)

  player_id = int(sys.argv[1])

  with open("elpizo.pem") as f:
    m = mint.Mint(f)

  token = m.mint("player.{}".format(player_id).encode("utf-8"))

  logging.basicConfig(level=logging.INFO)

  ws = GameClient(token, "ws://localhost:8765/socket")
  ws.connect()

  IPython.embed(user_ns={"ws": ws, "pb": packets_pb2})


if __name__ == "__main__":
  main()
