from tornado.web import RequestHandler

from .models import User, Player


class RequestHandler(RequestHandler):
  def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)

    user_id = int(self.get_secure_cookie("elpizo_user"))

    self.player = self.application.sqla_session.query(Player) \
        .filter((Player.id == User.current_player_id) &
                (User.id == user_id)) \
        .one()
