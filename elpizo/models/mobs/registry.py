from elpizo.models import entities

from elpizo.models.mobs import slime


def initialize():
  entities.Entity.register(slime.GreenSlime)
