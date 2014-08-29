import asyncio
import contextlib
import functools
import greenlet
import logging
import time

logger = logging.getLogger(__name__)


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
      try:
        next_r = yield from r
      except BaseException as e:
        r = g.throw(e)
      else:
        r = g.switch(next_r)
    return r

  return _wrapper


@contextlib.contextmanager
def locking(lock):
  start_time = time.monotonic()
  await_coro(lock.acquire())
  critical_section_start_time = time.monotonic()

  acquire_time = critical_section_start_time - start_time
  if acquire_time > 2.0:
    logger.warn("Waited too long on lock: %.2fs", acquire_time)

  try:
    yield
  finally:
    lock.release()
  end_time = time.monotonic()

  critical_section_time = end_time - critical_section_start_time
  if critical_section_time > 2.0:
    logger.warn("Held lock for too long: %.2fs", critical_section_time)
