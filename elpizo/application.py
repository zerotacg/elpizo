import logging
import os
import pika

from tornado.web import Application, StaticFileHandler, RequestHandler
from pika.adapters.tornado_connection import TornadoConnection
from sockjs.tornado import SockJSRouter
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .mint import Mint
from .models import Base
from .net import makeMultiplexConnection

from .chat import CHANNELS as CHAT_CHANNELS
from .explore import CHANNELS as EXPLORE_CHANNELS, \
                     ROUTES as EXPLORE_ROUTES
from .player import ROUTES as PLAYER_ROUTES
from .names import ROUTES as NAMES_ROUTES


class SockJSRouter(SockJSRouter):
  def __init__(self, application, *args, **kwargs):
    self.application = application
    super().__init__(*args, **kwargs)


class Application(Application):
  def __init__(self, **kwargs):
    routes = [
      (r"/static/(.*)", StaticFileHandler, {
          "path": os.path.join(os.path.dirname(__file__), "static")
      })
    ]

    channels = {}
    channels.update(CHAT_CHANNELS)
    channels.update(EXPLORE_CHANNELS)

    routes += PLAYER_ROUTES
    routes += EXPLORE_ROUTES
    routes += NAMES_ROUTES

    routes += SockJSRouter(self, makeMultiplexConnection(channels),
                           "/events").urls

    super().__init__(routes, **kwargs)

    self.amqp = TornadoConnection(pika.ConnectionParameters(
        self.settings["amqp_server"]), stop_ioloop_on_close=False)

    engine = create_engine(self.settings["dsn"])
    Session = sessionmaker(bind=engine)

    self.sqla_session = Session()

    with open(self.settings["mint_public_key"]) as f:
      self.mint = Mint(f)
