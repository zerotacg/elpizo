import json
import logging
import os
import pika
import venusian

from pika.adapters.tornado_connection import TornadoConnection
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from tornado.web import Application, RequestHandler, StaticFileHandler

from . import endpoints, models
from .exports import get_exports
from .mint import Mint
from .net import Connection


class GameHandler(RequestHandler):
  def get(self):
    self.render("index.html")


class ExportsHandler(RequestHandler):
  def get(self):
    self.set_header("Content-Type", "application/javascript")
    self.finish("window._exports=" + json.dumps(get_exports(self.application)))


class SQLTapDebugHandler(RequestHandler):
  def get(self):
    import sqltap
    self.finish(sqltap.report(self.application._sqltap_stats))


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
      routes.extend([
        (r"/_debug/sqltap", SQLTapDebugHandler)
      ])

      import sqltap
      from collections import deque

      self._sqltap_stats = deque(maxlen=1000)
      self.sqltap_profiler = sqltap.start(collect_fn=self._sqltap_stats.append)

    super().__init__(
        routes,
        template_path=os.path.join(os.path.dirname(__file__), "templates"),
        **kwargs)

    self.amqp = TornadoConnection(pika.ConnectionParameters(
        self.settings["amqp_server"]), stop_ioloop_on_close=False)

    venusian.Scanner().scan(models)
    self.sqla_factory = scoped_session(
        sessionmaker(bind=create_engine(self.settings["dsn"])))

    with open(self.settings["mint_public_key"]) as f:
      self.mint = Mint(f)

    endpoints.configure(self)
