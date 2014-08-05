from .models import Terrain, EntityType


def get_exports(application):
  return {
      "names": {
          "terrain": {terrain.id: terrain.name
              for terrain in application.sqla.query(Terrain)},
          "entityTypes": {entity_type.id: entity_type.name
              for entity_type in application.sqla.query(EntityType)}
      }
  }
