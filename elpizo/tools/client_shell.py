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


class GameClient(threading.Thread):
  daemon = True

  def __init__(self, token, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.token = token

  def run(self):
    self.loop = asyncio.new_event_loop()
    asyncio.set_event_loop(self.loop)
    self.loop.run_until_complete(self._run())

  @green.coroutine
  def _run(self):
    self.websocket = green.await_coro(
        websockets.connect("ws://localhost:8765/socket"))

    self.opened()
    try:
      while True:
        packet = green.await_coro(self.websocket.recv())
        if packet is None:
          break
        self.received_message(packet)
    finally:
      self.closed()

  def opened(self):
    logging.info("Connection opened.")
    self.send(packets_pb2.HelloPacket(token=self.token))

  def closed(self):
    logging.info("Connection closed.")
    os._exit(1)

  def received_message(self, packet):
    origin, message = net.Protocol.deserialize_packet(packet)

    print(type(message).__name__)
    print(origin)
    print(message)

  @green.coroutine
  def _send(self, message):
    green.await_coro(
        self.websocket.send(net.Protocol.serialize_packet(None, message)))

  def send(self, message):
    self.loop.call_soon_threadsafe(self._send, message)


def main():
  if len(sys.argv) != 2:
    sys.stderr.write("usage: {argv0} credentials\n".format(argv0=sys.argv[0]))
    sys.exit(1)

  credentials = sys.argv[1]

  with open("elpizo.pem") as f:
    m = mint.Mint(f)

  token = m.mint(credentials.encode("utf-8"))

  logging.basicConfig(level=logging.INFO)

  ws = GameClient(token)
  ws.start()

  IPython.embed(user_ns={"ws": ws, "pb": packets_pb2})


if __name__ == "__main__":
  main()
