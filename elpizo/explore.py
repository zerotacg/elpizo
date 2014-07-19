from tornado.gen import Task, engine

from .net import Protocol
from .web import get, post


@get
def nearby(handler):
  handler.finish({
    "name": "Tall Grass",
    "x": 32,
    "y": 64,
    "realm": "Wyrm Vale",
    "creatures": [
      {"name": "Droyer", "id": 10, "kind": "wyrm", "level": 10, "variant": "1"}
    ],
    "buildings": [
      {"name": "Spooky Mill", "id": 11, "kind": "windmill", "variant": "1"}
    ],
    "items": [],
    "facilities": []
  })


@post
def move(handler):
  import random

  handler.finish({
    "name": "Tall Grass",
    "x": handler.body["x"],
    "y": handler.body["y"],
    "realm": "Wyrm Vale",
    "creatures": [
      {"name": str(id), "id": id, "kind": "wyrm", "level": 10, "variant": "1"}
      for id in range(random.randint(0, 10))
    ],
    "buildings": [
      {"name": "Spooky Mill", "id": 11, "kind": "windmill", "variant": "1"}
    ],
    "items": [],
    "facilities": []
  })


ROUTES = [
  (r"/explore/nearby", nearby),
  (r"/explore/move", move)
]


class ExploreConnection(Protocol):
  def on_authed_open(self, info):
    self.send({

    })

CHANNELS = {
  "explore": ExploreConnection
}
