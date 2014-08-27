import asyncio
import contextlib
import functools
import greenlet


def await(fut):
  """
  Wait for a future to complete. This must be run in a child greenlet of a
  parent greenlet.
  """

  g_self = greenlet.getcurrent()
  assert g_self.parent is not None, "there is no parent greenlet"
  g_self.parent.switch(fut)
  assert fut.done(), "future was not done when it returned from the greenlet"
  return fut.result()


def await_coro(coro, *, loop=None):
  """
  Wait for an asyncio coroutine to complete.
  """
  return await(asyncio.async(coro, loop=loop))


def coroutine(f):
  """
  Make a coroutine. Returns a function that creates an asyncio coroutine.
  """

  @functools.wraps(f)
  def _wrapper(*args, **kwargs):
    g = greenlet.greenlet(f)
    r = g.switch(*args, **kwargs)
    while isinstance(r, asyncio.Future):
      r = g.switch((yield from r))
    return r

  return _wrapper


@contextlib.contextmanager
def locking(lock):
  await_coro(lock.acquire())
  try:
    yield
  finally:
    lock.release()
