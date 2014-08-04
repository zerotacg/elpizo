from .models import Terrain


def get_exports(application):
  return {
      "names": {
          "terrain": {terrain.id: terrain.name
              for terrain in application.sqla.query(Terrain)}
      }
  }
