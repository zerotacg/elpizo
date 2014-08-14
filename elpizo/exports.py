from .models.realm import Terrain
from .models.fixtures import FixtureType


def get_exports(application):
  sqla = application.sqla_factory()
  return {
      "terrain": {terrain.id: terrain.to_js()
          for terrain in sqla.query(Terrain)},
      "fixtureTypes": {fixtureType.id: fixtureType.to_js()
          for fixtureType in sqla.query(FixtureType)}
  }
