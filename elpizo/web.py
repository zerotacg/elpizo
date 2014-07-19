import json
import traceback

from tornado.web import RequestHandler

from .models import User, Player


class RequestHandler(RequestHandler):
  def prepare(self):
    if self.get_cookie("elpizo_user") is None:
      self.send_error(403)
      return

    self.user_id = int(self.get_secure_cookie("elpizo_user"))
    self.body = json.loads(self.request.body.decode("utf-8")) \
                if self.request.body else None

  def write_error(self, status_code, **kwargs):
    payload = {"error": status_code}

    if self.settings.get("serve_traceback") and "exc_info" in kwargs:
      payload["debug_trace"] = traceback.format_exception(*kwargs["exc_info"])

    self.finish(payload)

  @property
  def player(self):
    return self.application.sqla_session.query(Player) \
        .filter((Player.id == User.current_player_id) &
                (User.id == self.user_id)) \
        .one()

def _make_handler(name, methods):
  return type(name, (RequestHandler,), methods)


def get(method):
  return _make_handler(method.__name__, {"get": method})


def post(method):
  return _make_handler(method.__name__, {"post": method})
