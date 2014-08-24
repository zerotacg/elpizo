from elpizo.models import entities

from elpizo.models.npcs import slime


def initialize():
  entities.Entity.register(slime.GreenSlime)
