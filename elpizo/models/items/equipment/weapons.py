from elpizo.models.items import equipment
from elpizo.protos import items_pb2


class Weapon(equipment.Equipment):
  SLOT = 4


class Dagger(Weapon):
  TYPE = "dagger"
