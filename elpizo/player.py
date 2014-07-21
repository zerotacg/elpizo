from .web import RequestHandler


class PlayerHandler(RequestHandler):
  def get(self):
    player = self.get_player()

    self.finish({
        "id": player.id,
        "name": player.name,
        "kind": 1,
        "variant": 1,
        "level": 10,
        "hp": 50,
        "maxHp": 100,
        "mp": 50,
        "maxMp": 100,
        "xp": 50,
        "maxXp": 100
    })


ROUTES = [
  (r"/player", PlayerHandler)
]
