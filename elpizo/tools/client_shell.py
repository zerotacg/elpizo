import asyncio
import IPython
import logging
import os
import threading

from elpizo import client
from elpizo.client import config
from elpizo.protos import packets_pb2
from elpizo.util import green
from elpizo.util import mint
from elpizo.util import net


logger = logging.getLogger(__name__)


class ClientShellProtocol(net.Protocol):
  def on_open(self):
    logger.info("Client protocol opened.")

  def on_close(self):
    logger.info("Client protocol closed.")
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

  def on_stop(self):
    os._exit(1)

  def handle(self, token, websocket):
    self.protocol = ClientShellProtocol(websocket)
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

    try:
      self.client.run()
    except Exception:
      logger.critical("Client did not start!", exc_info=True)
      os._exit(1)

  def send(self, message):
    self.loop.call_soon_threadsafe(green.coroutine(self.client.protocol.send),
                                   None, message)


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
