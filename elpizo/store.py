from elpizo.models import entities
from elpizo.models import realm
from elpizo.util import record


class RegionStore(record.Store):
  def __init__(self, kvs):
    super().__init__(realm.Region.find, kvs)

  def find_closest(self, realm_id, x, y):
    x = (x // realm.Region.SIZE) * realm.Region.SIZE
    y = (y // realm.Region.SIZE) * realm.Region.SIZE

    return self.find("{}.{}_{}".format(realm_id, x, y))


class GameStore(object):
  def __init__(self, kvs):
    self.realms = record.Store(realm.Realm.find, kvs)
    self.regions = RegionStore(kvs)
    self.entities = record.Store(entities.Entity.find_polymorphic, kvs)

  def save_all(self):
    self.realms.save_all()
    self.regions.save_all()
    self.entities.save_all()
