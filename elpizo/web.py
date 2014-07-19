import json
import traceback

from tornado.web import RequestHandler

from .models import User, Player


class RequestHandler(RequestHandler):
  def prepare(self):
    if self.get_cookie("elpizo_user") is None:
      self.send_error(403)
      return

    user_id = int(self.get_secure_cookie("elpizo_user"))

    self.player = self.application.sqla_session.query(Player) \
        .filter((Player.id == User.current_player_id) &
                (User.id == user_id)) \
        .one()

  def write_error(self, status_code, **kwargs):
    payload = {"error": status_code}

    if self.settings.get("serve_traceback") and "exc_info" in kwargs:
      payload["debug_trace"] = traceback.format_exception(*kwargs["exc_info"])

    self.finish(payload)
