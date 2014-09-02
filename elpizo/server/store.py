import logging

from elpizo.models import entities
from elpizo.models import geometry
from elpizo.models import realm
from elpizo.server.util import kvs
from elpizo.util import green
from elpizo.util import record


logger = logging.getLogger(__name__)


class StoreError(Exception):
  pass


class GameStore(object):
  _LOCK_KEY = "lock"

  def __init__(self, redis):
    self.redis = redis

    self.realms = realm.RealmStore(self, self._make_kvs("realms"))
    self.entities = entities.EntityStore(self, self._make_kvs("entities"))
    self.item_counter = self._make_counter("items.serial")

    self.is_lock_acquired = False

  def lock(self):
    # this acquires an advisory lock -- locking is not mandatory, but I don't
    # suggest you try bypassing it.
    if not green.await_coro(
        self.redis.set(self._LOCK_KEY.encode("utf-8"), b"",
                       only_if_not_exists=True)):
      raise StoreError("""\
Store is locked. This generally occurs if the server was uncleanly shut down, \
or another copy of the server is running. If you are sure another copy of the \
server is not running, please run:

    python -m elpizo.tools.repairdb
""")
    self.is_lock_acquired = True

  def unlock(self):
    unlocked = green.await_coro(
        self.redis.delete([self._LOCK_KEY.encode("utf-8")])) == 1

    if not self.is_lock_acquired and unlocked:
      logger.warn("Store lock was BROKEN!")

    if self.is_lock_acquired and not unlocked:
      raise StoreError("""\
Lock was acquired but could not be unlocked. This is VERY BAD! Please repair \
the database IMMEDIATELY!

    python -m elpizo.tools.repairdb
""")

    self.is_lock_acquired = False

  def is_locked(self):
    return green.await_coro(self.redis.exists(self._LOCK_KEY.encode("utf-8")))

  def _make_kvs(self, hash_key):
    return kvs.AsyncRedisHashAdapter(hash_key, self.redis)

  def _make_counter(self, key):
    return kvs.AsyncRedisCounterAdapter(key, self.redis)

  def make_region_store(self, r):
    assert r.id is not None
    return realm.RegionStore(r, self.entities,
                             self._make_kvs("realms.{id}.regions".format(
                                 id=r.id)))

  def create_item(self, item):
    item.id = self.item_counter.next_serial()
    return item

  def save_all(self):
    if not self.is_lock_acquired:
      raise StoreError("Lock not acquired.")

    self.realms.save_all()
    self.entities.save_all()
