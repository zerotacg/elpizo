from .web import RequestHandler


class PlayerHandler(RequestHandler):
  def get(self):
    player = self.get_player()
    self.finish(player.to_js())


ROUTES = [
    (r"/player", PlayerHandler)
]
