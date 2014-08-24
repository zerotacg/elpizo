import asyncio
import IPython
import logging
import os
import sys
import threading

from elpizo import client
from elpizo.client import config
from elpizo.protos import packets_pb2
from elpizo.util import green
from elpizo.util import mint
from elpizo.util import net

from urllib.parse import urlencode


logger = logging.getLogger(__name__)


class ClientProtocol(net.Protocol):
  def on_open(self):
    logging.info("Connection opened.")

  def on_close(self):
    logging.info("Connection closed.")
    os._exit(1)

  def on_message(self, origin, message):
    print(type(message).__name__)
    print(origin)
    print(message)


class SimpleClient(client.Application):
  def on_start(self):
    self.token = self.mint.mint(self.config.credentials.encode("utf-8"),
                                self.config.token_expiry)
    super().on_start()

  def handle(self, token, websocket):
    self.protocol = ClientProtocol(websocket)
    self.protocol.send(None, packets_pb2.HelloPacket(token=self.token))
    self.protocol.run()


class ClientThread(threading.Thread):
  daemon = True

  def __init__(self, config, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.config = config

  def run(self):
    self.loop = asyncio.new_event_loop()
    asyncio.set_event_loop(self.loop)

    self.client = SimpleClient(self.config)
    self.client.run()

  def send(self, message):
    self.loop.call_soon_threadsafe(green.coroutine(self._send), message)

  def _send(self, message):
    self.client.protocol.send(None, message)


def main():
  parser = config.make_parser()
  parser.add_argument("credentials", help="Credentials to mint.")
  parser.add_argument("--token-expiry",
                      help="When to expire credentials. NOTE: Credentials "
                           "cannot be revoked without generating a new minting "
                           "key pair!", type=int, default=100)

  thread = ClientThread(parser.parse_args())
  thread.start()

  IPython.embed(user_ns={"ws": thread, "pb": packets_pb2})


if __name__ == "__main__":
  main()
