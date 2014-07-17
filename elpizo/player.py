from .web import RequestHandler


class PlayerHandler(RequestHandler):
  def get(self):
    self.finish({
        "id": self.player.id,
        "name": self.player.name
    })


ROUTES = [
  (r"/player", PlayerHandler)
]
