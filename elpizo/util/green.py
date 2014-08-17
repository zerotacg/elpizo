import greenlet
import functools

from tornado.concurrent import Future
from tornado.ioloop import IOLoop


def await(fut, ioloop=None):
  """
  Wait for a future to complete. This must be run in a child greenlet of a
  parent greenlet.
  """

  if ioloop is None:
    ioloop = IOLoop.instance()

  g_self = greenlet.getcurrent()
  assert g_self.parent is not None, "there is no parent greenlet"

  # We add the callback to the IOLoop, rather than directly switching the
  # greenlet. This is in case we acquired the future through other means (e.g.
  # via a ThreadPoolExecutor) and are in a different thread -- greenlets can
  # only run in the same thread.
  fut.add_done_callback(functools.partial(ioloop.add_callback, g_self.switch))

  # We switch to the parent greenlet, while we wait for the child greenlet to
  # switch us back in.
  fut2 = g_self.parent.switch()
  assert fut2 is fut, "unexpected future received from greenlet switch"

  # The child greenlet has switched us back in and the future should now be
  # fulfilled.
  assert fut.done(), "future was not done when it returned from the greenlet"
  return fut.result()


def async(f, ioloop=None):
  """
  Wrap a function that returns a future to run synchronously via greenlets.
  """

  @functools.wraps(f)
  def _wrapper(*args, **kwargs):
    return await(f(*args, **kwargs), ioloop=ioloop)

  return _wrapper


def async_task(f, callback_name="callback", ioloop=None):
  """
  Wrap a function that takes a callback parameter to run synchronously via
  greenlets.
  """

  @functools.wraps(f)
  def _wrapper(*args, **kwargs):
    fut = Future()
    kwargs[callback_name] = fut.set_result
    f(*args, **kwargs)
    return await(fut, ioloop=ioloop)

  return _wrapper


def root(f):
  """
  Make a root greenlet. This should be done in the request handler for each
  incoming request at the highest level.
  """

  @functools.wraps(f)
  def _wrapper(*args, **kwargs):
    g = greenlet.greenlet(functools.partial(f, *args, **kwargs))
    g.switch()
  return _wrapper


def sleep(n, ioloop=None):
  """
  Cause a greenlet to sleep for n seconds.
  """

  if ioloop is None:
    ioloop = IOLoop.instance()

  fut = Future()
  ioloop.call_later(n, fut.set_result, None)
  await(fut, ioloop=ioloop)


def yield_(ioloop=None):
  """
  Yield control temporarily to another tick of the IOLoop.
  """

  if ioloop is None:
    ioloop = IOLoop.instance()

  fut = Future()
  ioloop.add_callback(fut.set_result, None)
  await(fut, ioloop=ioloop)


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
      await(self._fut, ioloop=self.ioloop)
    else:
      sleep(timeout, ioloop=self.ioloop)
    return self.is_set()
