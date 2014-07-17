from .web import RequestHandler


class PlayerHandler(RequestHandler):
  def get(self):
    self.finish({
        "id": self.player.id,
        "name": self.player.name,
        "kind": "human",
        "level": 10
    })


ROUTES = [
  (r"/player", PlayerHandler)
]
