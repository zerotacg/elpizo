#!/usr/bin/env python3

"""
The admit mint will admit any users.
"""

import base64
import logging

from elpizo.mint import Mint
from elpizo.models import User, Player, Creature

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from tornado.ioloop import IOLoop
from tornado.options import define, options, parse_command_line, \
                            parse_config_file
from tornado.web import Application, RequestHandler

define("mint_private_key", default="elpizo.pem", help="Private key of the mint")


class AdmitHandler(RequestHandler):
  def get(self):
    user_name = self.get_argument("user")
    player_name = self.get_argument("player")

    player = self.application.sqla_session.query(Player) \
        .filter(Creature.name == player_name,
                Player.creature_id == Creature.id,
                Player.user_id == User.id) \
        .one()

    user = player.user
    user.current_creature = player.creature

    self.application.sqla_session.commit()

    credentials = "user:{}".format(user.id)

    self.set_cookie("elpizo_token", base64.b64encode(
        self.application.mint.mint(
            credentials.encode("utf-8"))))

    self.finish("ok, minted credentials into token: {credentials}".format(
        credentials=credentials))


class Application(Application):
  def __init__(self, **kwargs):
    routes = [
      (r"/admit", AdmitHandler)
    ]

    super().__init__(routes, **kwargs)

    engine = create_engine(self.settings["dsn"])
    Session = sessionmaker(bind=engine)

    self.sqla_session = Session()

    with open(self.settings["mint_private_key"]) as f:
      self.mint = Mint(f)


def make_application():
  # We parse the command line to get the value of --conf.
  parse_command_line()

  # We parse the config file to get all config variables.
  parse_config_file(options.conf)

  # We parse the command line again to extract overriding command line flags.
  parse_command_line()

  if options.debug:
    logging.info("Application is running in debug mode.")

  app = Application(debug=options.debug,
                    dsn=options.dsn,
                    mint_private_key=options.mint_private_key)

  return app

if __name__ == "__main__":
  app = make_application()
  app.listen(options.port)
  logging.info("Application starting on port %s.", options.port)
  IOLoop.instance().start()
