import logging
import websockets

from elpizo import platform
from elpizo.protos import packets_pb2
from elpizo.util import green
from elpizo.util import net


logger = logging.getLogger(__name__)


def make_config_parser(*args, **kwargs):
  parser = platform.make_config_parser(*args, **kwargs)
  parser.add_argument("--connect-uri", action="store",
                      default="ws://localhost:8081/socket",
                      help="Address to connect to.")
  return parser


class Client(platform.Application):
  def make_protocol(self, transport):
    raise NotImplementedError

  def on_start(self):
    super().on_start()
    self.connect(self.config.connect_uri)

  def connect(self, uri):
    logger.info("Client connecting to %s", uri)

    websocket = green.await_coro(websockets.connect(uri))
    self.handle(net.Transport(websocket))

  def handle(self, transport):
    self.protocol = self.make_protocol(transport)
    self.protocol.run()

  def send(self, id, message):
    self.protocol.send(id, message)
