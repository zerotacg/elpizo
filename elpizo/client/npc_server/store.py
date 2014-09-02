from elpizo.models import entities
from elpizo.models import geometry
from elpizo.models import realm


class DictAdapter(object):
  def __init__(self, dict):
    self.dict = dict

  def get(self, key):
    return self.dict[key]

  def set(self, key, value):
    self.dict[key] = value

  def delete(self, key):
    del self.dict[key]

  def next_serial(self):
    raise NotImplementedError

  def keys(self):
    return self.dict.keys()


class Store(object):
  def __init__(self):
    self.realms = realm.RealmStore(self, DictAdapter({}))
    self.entities = entities.EntityStore(self, DictAdapter({}))

  def make_region_store(self, r):
    assert r.id is not None
    return realm.RegionStore(r, self.entities, DictAdapter({}))
