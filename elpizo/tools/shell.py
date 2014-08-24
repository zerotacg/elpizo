import asyncio
import IPython
import logging
import os
import threading

from concurrent import futures

from elpizo import server
from elpizo.server import config
from elpizo.util import green


logger = logging.getLogger(__name__)


class ShellThread(threading.Thread):
  daemon = True

  def __init__(self, config, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.config = config
    self.has_server_event = threading.Event()

  def run(self):
    self.loop = asyncio.new_event_loop()
    asyncio.set_event_loop(self.loop)

    self.server = server.Application(self.config)
    self.has_server_event.set()

    try:
      self.server.run()
    except Exception:
      logger.critical("Shell server did not start!", exc_info=True)
      os._exit(1)

  def do(self, _f, *args, **kwargs):
    fut = futures.Future()

    def _wrapper():
      fut.set_result(_f(*args, **kwargs))

    self.loop.call_soon_threadsafe(green.coroutine(_wrapper))
    return fut.result()


def main():
  parser = config.make_parser()
  thread = ShellThread(parser.parse_args())
  thread.start()
  thread.has_server_event.wait()

  IPython.embed(user_ns={"do": thread.do, "server": thread.server})


if __name__ == "__main__":
  main()
