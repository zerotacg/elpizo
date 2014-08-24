import asyncio
import logging
import sys
import os
import threading

from concurrent import futures
from elpizo import server
from elpizo.server import config
from elpizo.util import green
from IPython.terminal import embed

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
      try:
        result = _f(*args, **kwargs)
      except BaseException as e:
        fut.set_exception(e)
      else:
        fut.set_result(result)

    self.loop.call_soon_threadsafe(green.coroutine(_wrapper))
    return fut.result()


class Shell(embed.InteractiveShellEmbed):
  def __init__(self, thread, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.thread = thread

  def run_code(self, code_obj):
    old_excepthook, sys.excepthook = sys.excepthook, self.excepthook

    self.sys_excepthook = old_excepthook
    outflag = 1
    try:
      try:
        self.hooks.pre_run_code_hook()
        self.thread.do(exec, code_obj, self.user_global_ns, self.user_ns)
      finally:
        sys.excepthook = old_excepthook
    except SystemExit:
      self.showtraceback(exception_only=True)
      warn.warn("To exit: use 'exit', 'quit', or Ctrl-D.", level=1)
    except self.custom_exceptions:
      etype, value, tb = sys.exc_info()
      self.CustomTB(etype, value, tb)
    except:
      self.showtraceback()
    else:
      outflag = 0
    return outflag

  runcode = run_code


def main():
  parser = config.make_parser()
  thread = ShellThread(parser.parse_args())
  thread.start()
  thread.has_server_event.wait()

  Shell(thread, user_ns={"server": thread.server}).mainloop()


if __name__ == "__main__":
  main()
