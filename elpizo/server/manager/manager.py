import flask
import logging

from aiohttp import wsgi
from elpizo import server
from elpizo.server import config
from elpizo.server.manager import views
from elpizo.util import green


logger = logging.getLogger(__name__)


class Manager(server.Application):
  def route(self, path, handler):
    self.app.route(path)(green.coroutine(handler))

  def on_start(self):
    super().on_start()

    self.app = flask.Flask(__name__)
    self.app.manager = self

    self.route("/store.json", views.store_query)
    self.route("/", views.index)

    logger.info("Started manager.")

    green.await_coro(
        self.loop.create_server(lambda: wsgi.WSGIServerHttpProtocol(self.app),
                                self.config.bind_host,
                                self.config.bind_port))


def main():
  Manager(config.make_parser().parse_args()).run()
