import json

from .models import CreatureKind, BuildingKind, ItemKind, FacilityKind, Terrain
from .web import get, post

@get
def names(handler):
  handler.set_header("Content-Type", "application/javascript")
  return "window._names=" + json.dumps({
      "creature": {creature_kind.id: creature_kind.name
                   for creature_kind
                   in handler.application.sqla_session.query(CreatureKind)},

      "building": {building_kind.id: building_kind.name
                   for building_kind
                   in handler.application.sqla_session.query(BuildingKind)},

      "item": {item_kind.id: item_kind.name
               for item_kind
               in handler.application.sqla_session.query(ItemKind)},


      "facility": {facility_kind.id: facility_kind.name
                   for facility_kind
                   in handler.application.sqla_session.query(FacilityKind)},

      "terrain": {terrain.id: terrain.name
                  for terrain
                  in handler.application.sqla_session.query(Terrain)}
  }, separators=",:")


ROUTES = [
  (r"/names\.js", names)
]
