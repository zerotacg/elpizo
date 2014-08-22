import asyncio
import asyncio_redis
import coloredlogs
import logging
import websockets
import yaml

from asyncio_redis import encoders
from elpizo.models import items
from elpizo.models.items import registry as item_registry
from elpizo.server import bus
from elpizo.server import handlers
from elpizo.server import store
from elpizo.server.util import kvs
from elpizo.util import green
from elpizo.util import mint
from elpizo.util import net

item_registry.initialize()

logger = logging.getLogger(__name__)


class Server(object):
  def __init__(self, config):
    self.config = config
    self.start_event = asyncio.Event()

  @green.coroutine
  def start(self, serve):
    logger.info("Welcome to elpizo.server!")

    logger.info("Item types registered: %d", len(items.Item.REGISTRY))

    with open(self.config["mint_key"]) as f:
      self.mint = mint.Mint(f)
    logger.info("Initialized mint (can mint: %s)", self.mint.can_mint)

    self.bus = bus.Bus()

    self.store = store.GameStore(
        green.await_coro(asyncio_redis.Pool.create(
            encoder=encoders.BytesEncoder(), **self.config["redis"])))

    if serve:
      logger.info("Server starting on port %s.", self.config["bind"]["port"])

      green.await_coro(
          websockets.serve(self.accept,
                           self.config["bind"]["host"],
                           self.config["bind"]["port"]))

    self.start_event.set()

  @green.coroutine
  def accept(self, websocket, path):
    protocol = handlers.Dispatcher(self, net.Transport(websocket, path))
    protocol.run()

  @green.coroutine
  def on_close(self):
    logger.info("Server shutting down.")
    logger.info("Flushing stores.")
    self.store.save_all()
    logger.info("Goodbye.")

  def once(self, f, *args, **kwargs):
    loop = asyncio.get_event_loop()

    @green.coroutine
    def _wrapper():
      green.await_coro(self.start_event.wait())

      try:
        f(self, *args, **kwargs)
      finally:
        loop.stop()

    loop.call_soon_threadsafe(_wrapper)
    self.run(False)

  def run(self, serve=True):
    loop = asyncio.get_event_loop()
    logger.info("Using event loop: %s", type(loop).__name__)
    loop.run_until_complete(self.start(serve))

    try:
      loop.run_forever()
    finally:
      loop.run_until_complete(self.on_close())


def main():
  with open("elpizo.conf") as config_file:
    config = yaml.load(config_file)

  coloredlogs.install(getattr(logging, config.get("log_level", "INFO"), None))

  server = Server(config)
  server.run()
