import greenlet
import functools

from tornado.concurrent import Future
from tornado.gen import Task
from tornado.ioloop import IOLoop


def green(f, ioloop=None):
  """
  Wrap a future-returning function to use greenlets to resolve the future, such
  that the result of the future is returned to the caller (which must be running
  in a greenlet itself).

  This is compatible with Tornado's tornado.gen.coroutine decorator -- this will
  turn coroutines into synchronous functions.
  """

  if ioloop is None:
    ioloop = IOLoop.instance()

  @functools.wraps(f)
  def _wrapper(*args, **kwargs):
    g_self = greenlet.getcurrent()

    assert g_self.parent is not None, "there is no parent greenlet"

    fut = f(*args, **kwargs)

    # We add the callback to the IOLoop, rather than directly switching the
    # greenlet. This is in case we acquired the future through other means (e.g.
    # via a ThreadPoolExecutor) and are in a different thread -- greenlets can
    # only run in the same thread.
    fut.add_done_callback(functools.partial(ioloop.add_callback, g_self.switch))

    # We switch to the parent greenlet, while we wait for the child greenlet to
    # switch us back in.
    g_self.parent.switch()

    # The child greenlet has switched us back in and the future should now be
    # fulfilled.
    assert fut.done(), "future was not done when it returned from the greenlet"
    return fut.result()

  return _wrapper


def green_task(f, callback_name="callback", ioloop=None):
  """
  This replaces Tornado's Tasks to use green such that futures are
  transparent.
  """

  def _wrapper(*args, **kwargs):
    kwargs[callback_name] = kwargs.pop("callback")
    f(*args, **kwargs)

  return green(functools.partial(Task, _wrapper), ioloop)


def green_root(f):
  """
  Make a root greenlet. This should be done in the request handler for each
  incoming request at the highest level.
  """

  @functools.wraps(f)
  def _wrapper(*args, **kwargs):
    g = greenlet.greenlet(functools.partial(f, *args, **kwargs))
    g.switch()
  return _wrapper


@green
def sleep(n, ioloop=None):
  """
  Cause a greenlet to sleep for n seconds.
  """
  if ioloop is None:
    ioloop = IOLoop.instance()

  fut = Future()
  ioloop.call_later(n, functools.partial(fut.set_result, None))
  return fut


class Event(object):
  """
  A green version of a threading.Event.
  """

  def __init__(self, ioloop=None):
    if ioloop is None:
      ioloop = IOLoop.instance()

    self.ioloop = ioloop
    self.clear()

  def is_set(self):
    return self._fut.done()

  def set(self):
    self._fut.set_result(None)

  def clear(self):
    self._fut = Future()

  def wait(self, timeout=None):
    if timeout is None:
      green(lambda: self._fut, ioloop=self.ioloop)()
    else:
      sleep(timeout, ioloop=self.ioloop)
    return self.is_set()
