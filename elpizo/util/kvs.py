from elpizo.util import green


class AsyncIORedisAdapter(object):
  def __init__(self, redis):
    self.redis = redis

  def get(self, key):
    v = green.task(self.redis.get(key))
    if v is None:
      raise KeyError(key)
    return v

  def set(self, key, value):
    green.task(self.redis.set(key, value))

  def incr(self, key):
    green.task(self.redis.incr(key))
