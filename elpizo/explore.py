from sqlalchemy.orm import Session
from tornado.gen import Task, engine

from .net import Protocol
from .web import get, post

from .models import MapTile, MapCorner, Creature, Building, Item, Facility


AVATAR_X = 8
AVATAR_Y = 9

TILE_SIZE = 32
MAP_WIDTH = 1024 // TILE_SIZE
MAP_HEIGHT = 768 // TILE_SIZE

def get_map(tile):
  session = Session.object_session(tile)

  left = tile.x - AVATAR_X
  right = left + MAP_WIDTH
  top = tile.y - AVATAR_Y
  bottom = top + MAP_HEIGHT

  corners = session.query(MapCorner) \
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

  return {
      "x": left, "y": top, "w": right - left, "h": bottom - top,
      "corners": [corner.terrain.id for corner in corners]
  }


@get
def explore(handler):
  player = handler.get_player()

  tile = player.creature.map_tile

  return {
      "map": get_map(tile),
      "tile": tile.to_js(),
      "creatures": [
          creature.to_js()
          for creature
          in handler.application.sqla_session.query(Creature).filter(
              Creature.map_tile == tile, Creature.id != player.creature.id)
      ],
      "buildings": [
          building.to_js()
          for building
          in handler.application.sqla_session.query(Building).filter(
              Building.map_tile == tile)
      ],
      "items": [
          item.to_js()
          for item
          in handler.application.sqla_session.query(Item).filter(
              Item.map_tile == tile)
      ],
      "facilities": [
          facility.to_js()
          for facility
          in handler.application.sqla_session.query(Facility).filter(
              Facility.map_tile == tile)
      ]
  }


@post
def move(handler):
  player = handler.get_player()
  player.creature.map_tile = handler.application.sqla_session.query(MapTile) \
      .filter(MapTile.x == handler.body["x"],
              MapTile.y == handler.body["y"],
              MapTile.realm == player.creature.map_tile.realm) \
      .one()
  handler.application.sqla_session.commit()

  return explore.actually_get(handler)


ROUTES = [
  (r"/explore", explore),
  (r"/explore/move", move)
]


class ExploreConnection(Protocol):
  def on_authed_open(self, info):
    self.send({

    })

CHANNELS = {
  "explore": ExploreConnection
}
