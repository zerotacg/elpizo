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
  result_fut = g_self.parent.switch()
  assert result_fut is fut, \
         ("unexpected future received from greenlet switch: "
          "{} is not {}").format(fut, result_fut)

  # The child greenlet has switched us back in and the future should now be
  # fulfilled.
  assert fut.done(), "future was not done when it returned from the greenlet"
  return fut.result()


def await_coro(coro, *, loop=None):
  """
  Wait for an asyncio coroutine to complete.
  """
  return await(asyncio.async(coro, loop=loop))


def coroutine(f, *, loop=None):
  """
  Make a coroutine. Returns a future which is fulfilled upon the coroutine's
  completion.
  """

  @functools.wraps(f)
  def _wrapper(*args, **kwargs):
    fut = asyncio.Future(loop=loop)

    def _inner():
      try:
        result = f(*args, **kwargs)
      except BaseException as e:
        fut.set_exception(e)
      else:
        fut.set_result(result)

    greenlet.greenlet(_inner).switch()

    return fut
  return _wrapper
