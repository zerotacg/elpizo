import json

from tornado.gen import Task, engine

from .net import Protocol
from .web import RequestHandler


class NearbyHandler(RequestHandler):
  def get(self):
    self.finish({
      "name": "Tall Grass",
      "x": 32,
      "y": 64,
      "realm": "Wyrm Vale",
      "creatures": [
        {"name": "Droyer", "id": 10, "kind": "wyrm", "level": 10}
      ],
      "buildings": [
        {"name": "Spooky Mill", "id": 11, "kind": "windmill"}
      ],
      "items": [],
      "facilities": []
    })


ROUTES = [
  (r"/explore/nearby", NearbyHandler)
]


class ExploreConnection(Protocol):
  def on_authed_open(self, info):
    self.send({

    })

CHANNELS = {
  "explore": ExploreConnection
}
