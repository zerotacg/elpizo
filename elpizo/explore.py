from collections import Counter

from tornado.gen import Task, engine

from .net import Protocol
from .web import get, post

from .models import MapTile, MapCorner


EXTENT = 64

@get
def map(handler):
  """
  Update the map for the player's current viewport. This is lazily run in the
  background so the client doesn't need the full map up-front, but has enough of
  the map to move around with.
  """
  tile = handler.get_player().map_tile

  left = tile.x - EXTENT
  right = tile.x + EXTENT + 1
  top = tile.y - EXTENT
  bottom = tile.y + EXTENT + 1

  corners = handler.application.sqla_session.query(MapCorner) \
      .filter(MapCorner.realm == tile.realm,
              MapCorner.s >= left, MapCorner.s <= right,
              MapCorner.t >= top, MapCorner.t <= bottom) \
      .order_by(MapCorner.t, MapCorner.s) \
      .all()

  left = float("inf")
  right = float("-inf")
  top = float("inf")
  bottom = float("-inf")

  # Find the minimum bounding box of the corners
  for corner in corners:
    left = min(corner.s, left)
    right = max(corner.s, right)
    top = min(corner.t, top)
    bottom = max(corner.t, bottom)

  handler.finish({
      "x": left, "y": top, "w": right - left, "h": bottom - top,
      "corners": [corner.terrain.id for corner in corners]
  })


@get
def nearby(handler):
  player = handler.get_player()

  tile = player.map_tile
  corner_terrains = Counter(corner.terrain_id for corner in tile.get_corners())

  handler.finish({
    "terrains": list(sorted(corner_terrains.keys(),
                            key=lambda k: -corner_terrains[k])),
    "x": tile.x,
    "y": tile.y,
    "realm": tile.realm.name,
    "creatures": [
        {"name": "Éponine", "id": 10, "kind": 2, "level": 10, "variant": 1}
    ],
    "buildings": [
        {"name": "Spooky Mill", "id": 11, "kind": 2, "variant": 1}
    ],
    "items": [],
    "facilities": []
  })


@post
def move(handler):
  player = handler.get_player()
  player.map_tile = handler.application.sqla_session.query(MapTile) \
      .filter(MapTile.x == handler.body["x"],
              MapTile.y == handler.body["y"],
              MapTile.realm == player.map_tile.realm) \
      .one()
  handler.application.sqla_session.commit()

  nearby.get(handler)


ROUTES = [
  (r"/explore/nearby", nearby),
  (r"/explore/move", move),
  (r"/explore/map", map)
]


class ExploreConnection(Protocol):
  def on_authed_open(self, info):
    self.send({

    })

CHANNELS = {
  "explore": ExploreConnection
}
