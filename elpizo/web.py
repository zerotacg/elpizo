import base64
import json
import traceback

from sqlalchemy.orm.exc import NoResultFound
from tornado.web import RequestHandler

from .models import User, Player, Creature
from .mint import InvalidTokenError


class RequestHandler(RequestHandler):
  def prepare(self):
    credentials = unmint_token(self.application.mint,
                               self.get_cookie("elpizo_token"))

    if credentials is None:
      self.send_error(403)
      return

    authority, id = credentials.split(":")
    id = int(id)

    if authority != "user":
      self.send_error(400)

    self.player = Player.by_user_id(self.application.sqla_session, id)

    self.body = json.loads(self.request.body.decode("utf-8")) \
                if self.request.body else None

  def write_error(self, status_code, **kwargs):
    payload = {"error": status_code}

    if self.settings.get("serve_traceback") and "exc_info" in kwargs:
      payload["debug_trace"] = traceback.format_exception(*kwargs["exc_info"])

    self.finish(payload)

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


def unmint_token(mint, token):
  if token is None:
    return None

  try:
    return mint.unmint(base64.b64decode(token)).decode("utf-8")
  except InvalidTokenError:
    return None
