import asyncio
import IPython
import logging
import os
import sys
import threading
import websockets

from elpizo.protos import packets_pb2
from elpizo.util import green
from elpizo.util import mint
from elpizo.util import net

from urllib.parse import urlencode


class ClientProtocol(net.Protocol):
  def __init__(self, token, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.token = token

  def on_open(self):
    logging.info("Connection opened.")
    if self.token is not None:
      self.send(None, packets_pb2.HelloPacket(token=self.token))

  def on_close(self):
    logging.info("Connection closed.")
    os._exit(1)

  def on_message(self, origin, message):
    print(type(message).__name__)
    print(origin)
    print(message)


class GameClient(threading.Thread):
  daemon = True

  def __init__(self, token, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.token = token

  def run(self):
    self.loop = asyncio.new_event_loop()
    asyncio.set_event_loop(self.loop)
    self.loop.run_until_complete(green.coroutine(self._run)())

  def _run(self):
    websocket = green.await_coro(
        websockets.connect("ws://localhost:8765/socket"))
    self.protocol = ClientProtocol(self.token, net.Transport(websocket))
    self.protocol.run()

  def send(self, message):
    self.loop.call_soon_threadsafe(green.coroutine(self._send), message)

  def _send(self, message):
    self.protocol.send(None, message)


def main():
  logging.basicConfig(level=logging.INFO)

  credentials = sys.argv[1] if len(sys.argv) >= 2 else None
  if credentials is not None:
    with open("elpizo.pem") as f:
      m = mint.Mint(f)
    token = m.mint(credentials.encode("utf-8"))
  else:
    token = None

  ws = GameClient(token)
  ws.start()

  IPython.embed(user_ns={"ws": ws, "pb": packets_pb2})


if __name__ == "__main__":
  main()
