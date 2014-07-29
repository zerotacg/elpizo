#!/usr/bin/env python3

"""
The admit mint will admit any users.
"""

import email
import base64
import logging

from elpizo.mint import Mint
from elpizo.models import User, Player, Actor

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from tornado.ioloop import IOLoop
from tornado.options import define, options, parse_command_line, \
                            parse_config_file
from tornado.web import Application, RequestHandler

define("mint_private_key", default="elpizo.pem", help="Private key of the mint")


class AdmitHandler(RequestHandler):
  def get(self):
    self.set_header("Content-Type", "text/plain")

    mint = self.application.mint

    user_name = self.get_argument("user")
    actor_name = self.get_argument("actor")

    player = self.application.sqla_session.query(Player) \
        .filter(Actor.name == actor_name,
                Player.actor_id == Actor.id,
                Player.user_id == User.id) \
        .one()

    user = player.user
    user.current_actor = player.actor

    self.application.sqla_session.commit()

    credentials = "user.{}".format(user.id)

    token = mint.mint(credentials.encode("utf-8"))
    self.set_cookie("elpizo_token", base64.b64encode(token))

    self.finish("""\
# credentials
{credentials}

# token
{token}

# mint info
rsa key size: {rsa_key_size}
signer: {signer}
hash: {hash}
""".format(
        credentials=mint.unmint(token).decode("utf-8"),
        token=email.base64mime.body_encode(token).strip(),
        rsa_key_size=mint.rsa_key_size * 8,
        signer=mint.signer.__class__.__name__,
        hash=mint.hashfunc.__name__))


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