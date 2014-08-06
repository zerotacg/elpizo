from .models.realm import Terrain
from .models.fixtures import Fixture


def get_exports(application):
  return {
      "terrain": {terrain.id: terrain.to_js()
          for terrain in application.sqla.query(Terrain)},
      "fixtureTypes": {fixture.NAME: fixture.to_js()
          for fixture in Fixture.__subclasses__()}
  }
