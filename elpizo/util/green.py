import asyncio
import functools
import greenlet


def await(fut):
  """
  Wait for a future to complete. This must be run in a child greenlet of a
  parent greenlet.
  """

  g_self = greenlet.getcurrent()
  assert g_self.parent is not None, "there is no parent greenlet"

  fut.add_done_callback(g_self.switch)

  # We switch to the parent greenlet, while we wait for the child greenlet to
  # switch us back in.
  fut2 = g_self.parent.switch()
  assert fut2 is fut, "unexpected future received from greenlet switch"

  # The child greenlet has switched us back in and the future should now be
  # fulfilled.
  assert fut.done(), "future was not done when it returned from the greenlet"
  return fut.result()


def task(coro, *, loop=None):
  """
  Wait for an AsyncIO coroutine to complete.
  """
  return await(asyncio.async(coro, loop=loop))


def coroutine(f):
  """
  Make a root coroutine.
  """

  @functools.wraps(f)
  def _wrapper(*args, **kwargs):
    fut = asyncio.Future()

    @greenlet.greenlet
    def g():
      fut.set_result(f(*args, **kwargs))

    g.switch()

    return fut
  return _wrapper
