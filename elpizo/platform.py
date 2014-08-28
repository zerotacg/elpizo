import argparse
import asyncio
import coloredlogs
import logging

from elpizo.models import entities
from elpizo.models import items
from elpizo.models.items import registry as item_registry
from elpizo.util import green
from elpizo.util import mint

item_registry.initialize()

logger = logging.getLogger(__name__)


def make_config_parser(*args, **kwargs):
  parser = argparse.ArgumentParser(
      *args, formatter_class=argparse.ArgumentDefaultsHelpFormatter, **kwargs)
  parser.add_argument("--debug", action="store_const", default=False, const=True,
                      help="Whether or not to run the server in debug mode.")
  parser.add_argument("--log-level", action="store", default="INFO",
                      help="Logging level to use.")
  parser.add_argument("--mint-key", action="store", default="elpizo.pub",
                      help="Mint key to use.")
  return parser


class Application(object):
  def __init__(self, config, loop=None):
    self.config = config
    self.loop = loop or asyncio.get_event_loop()

  @property
  def debug(self):
    return self.config.debug

  def start(self):
    logger.info("Item types registered: %d", len(items.Item.REGISTRY))

    with open(self.config.mint_key) as f:
      self.mint = mint.Mint(f)
    logger.info("Initialized mint (can mint: %s)", self.mint.can_mint)

    self.on_start()
    self.start_event.set()

  def on_start(self):
    pass

  def on_stop(self):
    pass

  def once(self, _f, *args, **kwargs):
    def _wrapper():
      green.await_coro(self.start_event.wait())

      try:
        _f(self, *args, **kwargs)
      finally:
        self.loop.stop()

    asyncio.async(green.coroutine(_wrapper)(), loop=self.loop)
    self.run()

  def run(self):
    coloredlogs.install(getattr(logging, self.config.log_level, None))

    logger.info("Welcome to elpizo!")
    logger.info("Using event loop: %s", type(self.loop).__name__)

    self.start_event = asyncio.Event()

    self.loop.run_until_complete(green.coroutine(self.start)())

    try:
      self.loop.run_forever()
    finally:
      self.loop.run_until_complete(green.coroutine(self.on_stop)())
