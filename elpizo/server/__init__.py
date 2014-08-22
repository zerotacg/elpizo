import asyncio
import asyncio_redis
import coloredlogs
import logging
import websockets

from asyncio_redis import encoders
from elpizo.models import items
from elpizo.models.items import registry as item_registry
from elpizo.server import bus
from elpizo.server import config
from elpizo.server import handlers
from elpizo.server import store
from elpizo.server.util import kvs
from elpizo.util import green
from elpizo.util import mint
from elpizo.util import net

item_registry.initialize()

logger = logging.getLogger(__name__)


class Server(object):
  def __init__(self, config, loop=None):
    self.config = config
    self.start_event = asyncio.Event()
    self.loop = loop or asyncio.get_event_loop()

  @green.coroutine
  def start(self, serve):
    logger.info("Welcome to elpizo.server!")

    logger.info("Item types registered: %d", len(items.Item.REGISTRY))

    with open(self.config.mint_key) as f:
      self.mint = mint.Mint(f)
    logger.info("Initialized mint (can mint: %s)", self.mint.can_mint)

    self.bus = bus.Bus()

    self.store = store.GameStore(
        green.await_coro(asyncio_redis.Pool.create(
            host=self.config.redis_host, port=self.config.redis_port,
            encoder=encoders.BytesEncoder())))

    if serve:
      logger.info("Server starting on port %s.", self.config.bind_port)
      self.store.lock()

      green.await_coro(
          websockets.serve(self.accept,
                           self.config.bind_host,
                           self.config.bind_port))

    self.start_event.set()

  @green.coroutine
  def accept(self, websocket, path):
    handlers.Dispatcher(self, net.Transport(websocket, path)).run()

  @green.coroutine
  def on_close(self):
    logger.info("Server shutting down.")

    if self.store.is_locked:
      logger.info("Flushing stores.")
      self.store.save_all()
      self.store.unlock()
    else:
      logger.info("No store lock, cowardly refusing to flush stores.")

    logger.info("Goodbye.")

  def once(self, _f, *args, **kwargs):
    @green.coroutine
    def _wrapper():
      green.await_coro(self.start_event.wait())

      try:
        _f(self, *args, **kwargs)
      finally:
        self.loop.stop()

    self.loop.call_soon_threadsafe(_wrapper)
    self.run(False)

  def run(self, serve=True):
    logger.info("Using event loop: %s", type(self.loop).__name__)

    self.loop.run_until_complete(self.start(serve))
    try:
      self.loop.run_forever()
    finally:
      self.loop.run_until_complete(self.on_close())


def main():
  coloredlogs.install(getattr(logging, args.log_level, None))
  server = Server(config.make_parser().parse_args())
  server.run()
