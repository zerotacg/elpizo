import logging

from elpizo.models import entities
from elpizo.models import geometry
from elpizo.models import realm
from elpizo.server.util import kvs
from elpizo.util import record


logger = logging.getLogger(__name__)


class RealmStore(record.Store):
  def __init__(self, parent, kvs):
    self.parent = parent
    super().__init__(realm.Realm.find, kvs)

  def add(self, realm):
    super().add(realm)
    realm.regions = self.parent.make_region_store(realm)

  def save(self, realm):
    super().save(realm)
    logger.info("Saving realm: %s", realm.id)
    realm.regions.save_all()

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
    return self.load(location.map(realm.Regiom.floor))

  def find(self, id, kvs):
    region = realm.Region.find(id, kvs)
    region.entities = {self.entities.load(entity_id)
                       for entity_id in region.entity_ids}
    return region

  def load_contained_by(self, bounds):
    left = realm.Region.floor(bounds.left)
    top = realm.Region.floor(bounds.top)
    right = realm.Region.ceil(bounds.right)
    bottom = realm.Region.ceil(bounds.bottom)

    for y in range(top, bottom, realm.Region.SIZE):
      for x in range(left, right, realm.Region.SIZE):
        yield self.load(geometry.Vector2(x, y))


class EntityStore(record.Store):
  def __init__(self, parent, kvs):
    self.parent = parent
    super().__init__(entities.Entity.find_polymorphic, kvs)

  def add(self, entity):
    super().add(entity)
    entity.realm = self.parent.realms.load(entity.realm_id)


class GameStore(object):
  def __init__(self, redis):
    self.redis = redis

    self.realms = RealmStore(self, kvs.RedisHashAdapter("realms", self.redis))
    self.entities = EntityStore(self,
                                kvs.RedisHashAdapter("entities", self.redis))

  def make_region_store(self, realm):
    assert realm.id is not None

    return RegionStore(
        self.entities,
        kvs.RedisHashAdapter("realms.{id}.regions".format(id=realm.id),
                             self.redis))

  def save_all(self):
    self.realms.save_all()
    self.entities.save_all()
