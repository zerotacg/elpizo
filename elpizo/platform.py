import asyncio
import coloredlogs
import logging

from elpizo.models import entities
from elpizo.models import items
from elpizo.models.items import registry as item_registry
from elpizo.models.npcs import registry as npc_registry
from elpizo.util import green
from elpizo.util import mint

item_registry.initialize()
npc_registry.initialize()

logger = logging.getLogger(__name__)


class Application(object):
  def __init__(self, config, loop=None):
    self.config = config
    self.loop = loop or asyncio.get_event_loop()

  @property
  def debug(self):
    return self.config.debug

  def start(self):
    logger.info("Item types registered: %d", len(items.Item.REGISTRY))
    logger.info("NPC types registered: %d", len(entities.NPC.REGISTRY))

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

    self.loop.call_soon_threadsafe(green.coroutine(_wrapper))
    self.run()

  def run(self):
    coloredlogs.install(getattr(logging, self.config.log_level, None))

    logger.info("Welcome to elpizo.platform!")
    logger.info("Using event loop: %s", type(self.loop).__name__)

    self.start_event = asyncio.Event()

    self.loop.run_until_complete(green.coroutine(self.start)())

    try:
      self.loop.run_forever()
    finally:
      self.loop.run_until_complete(green.coroutine(self.on_stop)())
