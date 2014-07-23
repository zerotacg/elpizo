import functools
import json
from sqlalchemy.orm import Session
from tornado.gen import Task, coroutine

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
  tile = handler.player.creature.map_tile

  return {
      "map": get_map(tile),
      "tile": tile.to_js(),
      "creatures": [
          creature.to_js()
          for creature
          in handler.application.sqla_session.query(Creature).filter(
              Creature.map_tile == tile,
              Creature.id != handler.player.creature.id)
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


EXPLORE_EXCHANGE_NAME = "elpizo.explore"

def get_tile_routing_key(tile):
  return "{x}:{y}:{realm_id}".format(x=tile.x, y=tile.y, realm_id=tile.realm.id)

def get_queue_name(player):
  return "explore:{id}".format(id=player.user.id)


@coroutine
def propagate_move(prev_tile, next_tile, player, channel):
  yield Task(channel.exchange_declare, exchange=EXPLORE_EXCHANGE_NAME,
             type="direct")

  # update queue bindings
  yield Task(channel.queue_unbind, exchange=EXPLORE_EXCHANGE_NAME,
             queue=get_queue_name(player),
             routing_key=get_tile_routing_key(prev_tile))

  yield Task(channel.queue_bind, exchange=EXPLORE_EXCHANGE_NAME,
             queue=get_queue_name(player),
             routing_key=get_tile_routing_key(next_tile))

  # send a leave event to the previous tile
  channel.basic_publish(exchange=EXPLORE_EXCHANGE_NAME,
                        routing_key=get_tile_routing_key(prev_tile),
                        body=json.dumps({
                            "action": "leave",
                            "creature": {
                                "id": player.creature.id,
                                "name": player.creature.name
                            }
                        }))

  # send an enter event to the new tile
  channel.basic_publish(exchange=EXPLORE_EXCHANGE_NAME,
                        routing_key=get_tile_routing_key(next_tile),
                        body=json.dumps({
                            "action": "enter",
                            "creature": player.creature.to_js()
                        }))


@post
def move(handler):
  prev_tile = handler.player.creature.map_tile

  handler.player.creature.map_tile = handler.application \
      .sqla_session.query(MapTile) \
      .filter(MapTile.x == handler.body["x"],
              MapTile.y == handler.body["y"],
              MapTile.realm == handler.player.creature.map_tile.realm) \
      .one()
  handler.application.sqla_session.commit()
  next_tile = handler.player.creature.map_tile

  handler.application.amqp.channel(
      functools.partial(propagate_move, prev_tile, next_tile, handler.player))

  return explore.actually_get(handler)


ROUTES = [
    (r"/explore", explore),
    (r"/explore/move", move)
]


class ExploreProtocol(Protocol):
  @coroutine
  def on_open(self, info):
    yield Task(self.channel.exchange_declare, exchange=EXPLORE_EXCHANGE_NAME,
               type="direct")

    yield Task(self.channel.queue_delete, queue=get_queue_name(self.player))

    self.explore_queue = (
        yield Task(self.channel.queue_declare,
                   queue=get_queue_name(self.player),
                   exclusive=True,
                   auto_delete=True)).method.queue

    yield Task(self.channel.queue_bind, exchange=EXPLORE_EXCHANGE_NAME,
               queue=self.explore_queue,
               routing_key=get_tile_routing_key(self.player.creature.map_tile))

    self.channel.basic_consume(self.on_queue_message,
                               queue=self.explore_queue, no_ack=True,
                               exclusive=True)

  def on_queue_message(self, ch, method, properties, body):
    payload = json.loads(body.decode("utf-8"))

    if payload["creature"]["id"] != self.player.creature.id:
      self.send(payload)



CHANNELS = {
    "explore": ExploreProtocol
}
