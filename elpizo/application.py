import json
import logging
import os
import pika

from pika.adapters.tornado_connection import TornadoConnection
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from statsd import StatsClient
from tornado.web import Application, RequestHandler, StaticFileHandler

from . import handlers, models
from .exports import get_exports
from .util.mint import Mint
from .util.net import Connection

from .models.fixtures import Fixture, registry as fixture_registry
from .models.items import Item, registry as item_registry


class GameHandler(RequestHandler):
  def get(self):
    self.render("index.html")


class ExportsHandler(RequestHandler):
  def get(self):
    self.set_header("Content-Type", "application/javascript")
    self.finish("window._exports=" + json.dumps(get_exports(self.application)))


class Application(Application):
  def __init__(self, **kwargs):
    routes = [
      (r"/static/(.*)", StaticFileHandler, {
          "path": os.path.join(os.path.dirname(__file__), "static")
      }),
      (r"/exports\.js", ExportsHandler),
      (r"/socket", Connection),
      (r"/", GameHandler),
    ]

    if kwargs["debug"]:
      from . import debug
      debug.install(self, routes)

    fixture_registry.initialize()
    item_registry.initialize()

    logging.info("Initialized {} fixtures, {} items.".format(
                 len(Fixture.REGISTRY), len(Item.REGISTRY)))

    super().__init__(routes,
                     template_path=os.path.join(os.path.dirname(__file__),
                                                "templates"),
                     **kwargs)

    self.amqp = TornadoConnection(pika.ConnectionParameters(
        self.settings["amqp_server"]), stop_ioloop_on_close=True)

    self.statsd = StatsClient(self.settings["statsd_server"], prefix="elpizo")

    self.sqla_factory = scoped_session(
        sessionmaker(bind=create_engine(self.settings["dsn"])))

    with open(self.settings["mint_public_key"]) as f:
      self.mint = Mint(f)

    handlers.install(self)
