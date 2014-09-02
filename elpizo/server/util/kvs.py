import logging

from elpizo.util import green

logger = logging.getLogger(__name__)


class AsyncRedisHashAdapter(object):
  _SERIAL_KEY = "serial"

  def __init__(self, hash_key, redis):
    self.hash_key = hash_key
    self.redis = redis
    self.counter = AsyncRedisCounterAdapter(
        "{}.{}".format(self.hash_key, self._SERIAL_KEY), self.redis)

  def get(self, key):
    v = green.await_coro(self.redis.hget(self.hash_key.encode("utf-8"),
                                         str(key).encode("utf-8")))
    if v is None:
      raise KeyError(key)
    return v

  def set(self, key, value):
    green.await_coro(self.redis.hset(self.hash_key.encode("utf-8"),
                                     str(key).encode("utf-8"), value))

  def delete(self, key):
    green.await_coro(self.redis.hdel(self.hash_key.encode("utf-8"),
                                     [str(key).encode("utf-8")]))

  def next_serial(self):
    return self.counter.next_serial()

  def keys(self):
    for fut in green.await_coro(self.redis.hkeys(self.hash_key.encode("utf-8"))):
      key = green.await(fut).decode("utf-8")
      if key != self._SERIAL_KEY:
        yield key


class AsyncRedisCounterAdapter(object):
  def __init__(self, key, redis):
    self.key = key
    self.redis = redis

  def next_serial(self):
    return int(green.await_coro(self.redis.incr(self.key.encode("utf-8"))))
