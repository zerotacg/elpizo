from elpizo.models import entities
from elpizo.models import realm
from elpizo.util import record


def find_entity_polymorphic(id, kvs):
  # Get the base entity and deserialize it to determine the type.
  base_entity = entities.Entity(id)
  base_entity._kvs = kvs
  serialized = kvs.get(base_entity.key)
  base_entity.deserialize(serialized)

  # Now, deserialize the entity proper as the correct type.
  entity = entities.Entity.REGISTRY[base_entity.type](id)
  entity._kvs = kvs
  entity.deserialize(serialized)
  return entity


class Store(object):
  def __init__(self, kvs):
    self.realms = record.Store(realm.Realm.find, kvs)
    self.entities = record.Store(find_entity_polymorphic, kvs)

  def save_all(self):
    self.realms.save_all()
    self.entities.save_all()
