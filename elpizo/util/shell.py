import asyncio
import logging
import os
import sys
import threading

from concurrent import futures
from elpizo.util import green
from IPython.terminal import embed
from IPython.utils import warn


logger = logging.getLogger(__name__)


class ShellThread(threading.Thread):
  daemon = True

  def __init__(self, app_factory, config, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.app_factory = app_factory
    self.config = config
    self.ready_event = threading.Event()

  def run(self):
    self.loop = asyncio.new_event_loop()
    asyncio.set_event_loop(self.loop)

    # We make the app in here to associate it with the correct thread.
    self.app = self.app_factory(self.config)

    self.ready_event.set()

    try:
      self.app.run()
    except Exception:
      logger.critical("App did not start!", exc_info=True)
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
  def __init__(self, app_factory, config, *args, **kwargs):
    self.thread = ShellThread(app_factory, config)
    self.thread.start()
    self.thread.ready_event.wait()

    user_ns = kwargs.pop("user_ns", {})
    user_ns["app"] = self.thread.app

    super().__init__(*args, user_ns=user_ns, **kwargs)

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
