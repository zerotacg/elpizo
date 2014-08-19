import IPython
import logging
import requests
import sys

from .. import game_pb2
from ..util.net import Protocol

from ws4py.client.threadedclient import WebSocketClient
from urllib.parse import urlencode


class GameClient(WebSocketClient):
  def opened(self):
    logging.info("Connection opened.")

  def closed(self, code, reason):
    logging.info("Connection closed.")

  def received_message(self, m):
    origin, message = Protocol.deserialize_packet(m.data)
    print(type(message).__name__)
    print(origin)
    print(message)

  def send(self, message):
    super().send(Protocol.serialize_packet(None, message), binary=True)


def main():
  if len(sys.argv) != 3:
    sys.stderr.write("usage: {argv0} user player\n".format(argv0=sys.argv[0]))
    sys.exit(1)

  logging.basicConfig(level=logging.INFO)

  token_request = requests.get("http://localhost:9999/_debug/admit/", params={
      "user": sys.argv[1], "player": sys.argv[2]})
  token_request.raise_for_status()

  token = token_request.cookies["elpizo_token"]
  ws = GameClient("ws://localhost:9999/socket",
                  headers=[("Origin", "http://localhost:9999"),
                           ("Cookie", "elpizo_token=" + token)])
  ws.connect()

  IPython.embed(user_ns={"ws": ws, "pb": game_pb2})


if __name__ == "__main__":
  main()
