import asyncio
import asyncio_redis
import logging
import statsd
import websockets

from asyncio_redis import encoders
from elpizo import platform
from elpizo.server import bus
from elpizo.server import config
from elpizo.server import handlers
from elpizo.server import store
from elpizo.util import green
from elpizo.util import net

logger = logging.getLogger(__name__)


class Application(platform.Application):
  def on_start(self):
    self.bus = bus.Bus()
    self.store = store.GameStore(green.await_coro(asyncio_redis.Pool.create(
        host=self.config.redis_host, port=self.config.redis_port,
        encoder=encoders.BytesEncoder())))
    self.statsd = statsd.StatsClient(self.config.statsd_host,
                                     self.config.statsd_port,
                                     prefix="elpizo")

  def on_stop(self):
    logger.info("Application shutting down.")

    if self.store.is_lock_acquired:
      logger.info("Flushing stores.")
      self.store.save_all()
      try:
        self.store.unlock()
      except store.StoreError as e:
        logging.critical(str(e))
    else:
      logger.warn("No store lock, cowardly refusing to flush stores.")

    logger.info("Goodbye.")


class Server(Application):
  def on_start(self):
    super().on_start()
    self.listen(self.config.bind_port, self.config.bind_host)

  def listen(self, port, host):
    logger.info("Server listening on %s:%s.", host, port)
    self.store.lock()

    green.await_coro(
        websockets.serve(green.coroutine(self.accept),
                         host, port))

  def accept(self, websocket, path):
    handlers.Dispatcher(self, net.Transport(websocket)).run()


def main():
  Server(config.make_parser().parse_args()).run()


if __name__ == "__main__":
  main()
