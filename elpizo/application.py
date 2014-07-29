import json
import logging
import os
import pika

from pika.adapters.tornado_connection import TornadoConnection
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from tornado.web import Application, RequestHandler, StaticFileHandler

from . import endpoints
from .mint import Mint
from .models import ActorKind
from .net import Connection, Router


class GameHandler(RequestHandler):
  def get(self):
    self.render("index.html")


class ExportsHandler(RequestHandler):
  def _get_exports(self):
    return {
        "names": {
            "actor": {
                actor.id: actor.name
                for actor in self.application.sqla.query(ActorKind)}
        }
    }

  def get(self):
    self.set_header("Content-Type", "application/javascript")
    self.finish("window._exports=" + json.dumps(self._get_exports()))


class Application(Application):
  def __init__(self, **kwargs):
    self.sockjs = Router(self, Connection, "/sockjs")

    routes = [
      (r"/static/(.*)", StaticFileHandler, {
          "path": os.path.join(os.path.dirname(__file__), "static")
      }),
      (r"/exports\.js", ExportsHandler),
      (r"/", GameHandler),
    ] + self.sockjs.urls

    super().__init__(
        routes,
        template_path=os.path.join(os.path.dirname(__file__), "templates"),
        **kwargs)

    self.amqp = TornadoConnection(pika.ConnectionParameters(
        self.settings["amqp_server"]), stop_ioloop_on_close=False)

    self.sqla = sessionmaker(bind=create_engine(self.settings["dsn"]))()

    with open(self.settings["mint_public_key"]) as f:
      self.mint = Mint(f)

    endpoints.configure(self)
