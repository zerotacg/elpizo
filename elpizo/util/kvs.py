from elpizo.util import green


class AsyncIORedisAdapter(object):
  def __init__(self, redis):
    self.redis = redis

  def get(self, key):
    v = green.task(self.redis.get(key.encode("utf-8")))
    if v is None:
      raise KeyError(key)
    return v

  def set(self, key, value):
    green.task(self.redis.set(key.encode("utf-8"), value))

  def incr(self, key):
    return green.task(self.redis.incr(key.encode("utf-8")))
