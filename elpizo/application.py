import logging
import os
import pika

from pika.adapters.tornado_connection import TornadoConnection
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from tornado.web import Application, StaticFileHandler

from .exports import ExportsHandler
from .mint import Mint
from .net import Connection, Router

from .endpoints import chat, error, move, private


class Application(Application):
  def __init__(self, **kwargs):
    self.sockjs = Router(self, Connection, "/sockjs")

    routes = [
      (r"/static/(.*)", StaticFileHandler, {
          "path": os.path.join(os.path.dirname(__file__), "static")
      }),
      (r"/_exports\.js", ExportsHandler)
    ] + self.sockjs.urls

    super().__init__(routes, **kwargs)

    self.amqp = TornadoConnection(pika.ConnectionParameters(
        self.settings["amqp_server"]), stop_ioloop_on_close=False)

    self.sqla_session = sessionmaker(bind=create_engine(self.settings["dsn"]))()

    with open(self.settings["mint_public_key"]) as f:
      self.mint = Mint(f)

    self.configure_protocol()

  def configure_protocol(self):
    self.on_open_hooks = [
        chat.on_open,
        move.on_open,
        private.on_open
    ]

    self.sockjs_endpoints = {
        "chat": chat.socket_chat
    }

    self.amqp_endpoints = {
        "chat": chat.mq_chat,
        "error": error.mq_error
    }
