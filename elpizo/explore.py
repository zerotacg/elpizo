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
        {"name": "Wyrm", "id": 10}
      ],
      "buildings": [],
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
