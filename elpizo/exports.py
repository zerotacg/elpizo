from .models import Terrain


def get_exports(application):
  return {
      "terrain": {terrain.id: terrain.to_js()
          for terrain in application.sqla.query(Terrain)}
  }
