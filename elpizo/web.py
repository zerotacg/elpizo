import json
import traceback

from sqlalchemy.orm.exc import NoResultFound
from tornado.web import RequestHandler

from .models import User, Player, Creature


class RequestHandler(RequestHandler):
  def prepare(self):
    if self.get_cookie("elpizo_user") is None:
      self.send_error(403)
      return

    self.user_id = int(self.get_secure_cookie("elpizo_user"))
    self.player = self._get_player()

    if self.player is None:
      self.send_error(403)
      return

    self.body = json.loads(self.request.body.decode("utf-8")) \
                if self.request.body else None

  def write_error(self, status_code, **kwargs):
    payload = {"error": status_code}

    if self.settings.get("serve_traceback") and "exc_info" in kwargs:
      payload["debug_trace"] = traceback.format_exception(*kwargs["exc_info"])

    self.finish(payload)

  def _get_player(self):
    try:
      return self.application.sqla_session.query(Player) \
          .filter(User.current_creature_id == Creature.id,
                  Player.user_id == self.user_id,
                  Player.creature_id == Creature.id,
                  User.id == self.user_id) \
          .one()
    except NoResultFound:
      return None

  def get(self):
    try:
      self.finish(self.actually_get())
    except NoResultFound:
      self.send_error(404)

  def post(self):
    try:
      self.finish(self.actually_post())
    except NoResultFound:
      self.send_error(404)


def _make_handler(name, methods):
  return type(name, (RequestHandler,), methods)


def get(method):
  return _make_handler(method.__name__, {"actually_get": method})


def post(method):
  return _make_handler(method.__name__, {"actually_post": method})
