from .web import get


@get
def player(handler):
  return handler.player.to_js()


ROUTES = [
    (r"/player", player)
]
