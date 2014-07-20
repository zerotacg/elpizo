import json

from .models import Terrain
from .web import get, post

@get
def names(handler):
  handler.set_header("Content-Type", "application/javascript")
  handler.finish("window._names=" + json.dumps({
      "creature": {
          -1: "unknown",
           1: "human",
           2: "wyrm"
      },

      "building": {
          -1: "unknown",
           1: "house",
           2: "windmill"
      },

      "item": {},

      "facility": {},

      "terrain": {terrain.id: terrain.name
                  for terrain
                  in handler.application.sqla_session.query(Terrain)}
  }, separators=",:"))


ROUTES = [
  (r"/names\.js", names)
]
