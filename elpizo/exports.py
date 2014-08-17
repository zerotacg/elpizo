from .models.realm import Terrain


def get_exports(application):
  sqla = application.sqla_factory()
  return {
      "terrain": {terrain.id: terrain.to_js()
          for terrain in sqla.query(Terrain)}
  }
