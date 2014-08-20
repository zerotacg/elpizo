import asyncio
import asyncio_redis
import coloredlogs
import logging
import websockets
import yaml

from elpizo import handlers
from elpizo import store
from elpizo.models import items
from elpizo.models.items import registry as item_registry
from elpizo.util import green
from elpizo.util import kvs
from elpizo.util import mint
from elpizo.util import net

item_registry.initialize()


class Server(object):
  def __init__(self, config):
    self.config = config

  @green.coroutine
  def run(self):
    logging.info("Welcome to elpizo.server!")

    logging.info("Item types registered: %d", len(items.Item.REGISTRY))

    with open(self.config["mint_key"]) as f:
      self.mint = mint.Mint(f)
    logging.info("Initialized mint (can mint: %s)", self.mint.can_mint)

    self.store = store.Store(kvs.AsyncIORedisAdapter(
        green.task(asyncio_redis.Pool.create(**self.config["redis"]))))
    logging.info("Server starting on port %s.", self.config["bind"]["port"])

    green.task(
        websockets.serve(self.accept,
                         self.config["bind"]["host"],
                         self.config["bind"]["port"]))

  @green.coroutine
  def accept(self, websocket, path):
    protocol = handlers.Dispatcher(self, net.Transport(websocket, path))
    protocol.run()

  def on_close(self):
    logging.info("Server shutting down.")
    logging.info("Flushing stores.")
    self.store.save_all()
    logging.info("Goodbye.")


def main():
  coloredlogs.install()

  with open("elpizo.conf") as config_file:
    config = yaml.load(config_file)

  server = Server(config)

  loop = asyncio.get_event_loop()
  logging.info("Using event loop: %s", type(loop).__name__)
  loop.run_until_complete(server.run())

  try:
    loop.run_forever()
  finally:
    server.on_close()
    loop.close()


if __name__ == "__main__":
  main()
