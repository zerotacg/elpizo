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


class RealmStore(record.Store):
  def __init__(self, parent, kvs):
    self.parent = parent
    super().__init__(realm.Realm.find, kvs)

  def add(self, realm):
    super().add(realm)
    realm.regions = self.parent.make_region_store(realm)

  def expire(self, realm):
    super().expire(realm)
    realm.regions.expire_all()


class RegionStore(record.Store):
  def __init__(self, entities, kvs):
    self.entities = entities
    super().__init__(self.find, kvs)

  def load(self, vec):
    return super().load("{x},{y}".format(x=vec.x, y=vec.y))

  def load_closest(self, location):
    return self.load(location.map(realm.Region.floor))

  def find(self, id, kvs):
    region = realm.Region.find(id, kvs)
    region.entities = {self.entities.load(entity_id)
                       for entity_id in region.entity_ids}
    return region


class EntityStore(record.Store):
  def __init__(self, parent, kvs):
    self.parent = parent
    super().__init__(entities.Entity.find, kvs)

  def add(self, entity):
    super().add(entity)
    entity.realm = self.parent.realms.load(entity.realm_id)

  def create(self, entity):
    super().create(entity)
    for region in entity.regions:
      region.entities.add(entity)
      region.save()

  def destroy(self, entity):
    super().destroy(entity)
    for region in entity.regions:
      region.entities.remove(entity)


class GameStore(object):
  _LOCK_KEY = "lock"

  def __init__(self, redis):
    self.redis = redis

    self.realms = RealmStore(self, self._make_kvs("realms"))
    self.entities = EntityStore(self, self._make_kvs("entities"))

    self.is_locked = False

  def lock(self):
    # this acquires an advisory lock -- locking is not mandatory, but I don't
    # suggest you try bypassing it.
    if not green.await_coro(
        self.redis.setnx(self._LOCK_KEY.encode("utf-8"), b"")):
      raise StoreError("""\
Store is locked. This generally occurs if the server was uncleanly shut down, \
or another copy of the server is running. If you are sure another copy of the \
server is not running, please run:

    python -m elpizo.tools.repairdb \
""")
    self.is_locked = True

  def unlock(self):
    if self.is_locked:
      green.await_coro(self.redis.delete([self._LOCK_KEY.encode("utf-8")]))
      self.is_locked = False

  def _make_kvs(self, hash_key):
    return kvs.RedisHashAdapter(hash_key, self.redis)

  def make_region_store(self, realm):
    assert realm.id is not None

    return RegionStore(self.entities,
                       self._make_kvs("realms.{id}.regions".format(
                           id=realm.id)))

  def save_all(self):
    self.realms.save_all()
    self.entities.save_all()
