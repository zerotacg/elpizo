import logging
import websockets

from elpizo import platform
from elpizo.util import green
from elpizo.util import net


logger = logging.getLogger(__name__)


class Application(platform.Application):
  def on_start(self):
    super().on_start()
    self.connect(self.config.connect_uri)

  def connect(self, uri):
    logger.info("Client connecting to %s", uri)

    websocket = green.await_coro(websockets.connect(uri))
    self.handle(self.token, net.Transport(websocket))
