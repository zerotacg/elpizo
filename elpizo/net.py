import json

from sockjs.tornado import conn, session
from sockjs.tornado.transports import base
from sqlalchemy.orm.exc import NoResultFound
from tornado.web import decode_signed_value

from .models import User, Player, Creature


class ChannelSession(session.BaseSession):
  def __init__(self, conn, server, base, name):
    super(ChannelSession, self).__init__(conn, server)

    self.base = base
    self.name = name

  def send_message(self, msg, stats=True, binary=False):
    # TODO: Handle stats
    self.base.send(":".join([self.name, msg]))

  def on_open(self, msg):
    self.conn.on_open(msg)

  def on_message(self, msg):
    self.conn.on_message(msg)

  def close(self, code=3000, message="Go away!"):
    self._close(code, message)

  # Non-API version of the close, without sending the close message
  def _close(self, code=3000, message="Go away!"):
    super(ChannelSession, self).close(code, message)


def makeMultiplexConnection(channels):
  class MultiplexConnection(conn.SockJSConnection):
    @property
    def application(self):
      return self.session.server.application

    def get_player(self):
      try:
        return self.application.sqla_session.query(Player) \
            .filter(User.current_creature_id == Creature.id,
                    Player.user_id == self.user_id,
                    Player.creature_id == Creature.id,
                    User.id == self.user_id) \
            .one()
      except NoResultFound:
        return None

    def on_open(self, info):
      if info.get_cookie("elpizo_user") is None:
        self.close()
        return

      self.user_id = int(decode_signed_value(
          self.application.settings["cookie_secret"],
          name="elpizo_user",
          value=info.get_cookie("elpizo_user").value))

      if self.get_player() is None:
        self.close()
        return

      self.endpoints = {}

      for chan, Chan in self.channels.items():
        session = ChannelSession(Chan, self.session.server, self, chan)
        self.endpoints[chan] = session

        session.on_open(info)

    def on_message(self, msg):
      chan, payload = msg.split(":", 1)

      if chan not in self.endpoints:
        return

      self.endpoints[chan].on_message(payload)

    def on_close(self):
      for chan in self.endpoints:
        self.endpoints[chan]._close()

  MultiplexConnection.channels = channels
  return MultiplexConnection


class Protocol(conn.SockJSConnection):
  @property
  def application(self):
    return self.session.server.application

  def get_player(self):
    return self.session.base.get_player()

  def send(self, message):
    super().send(json.dumps(message))

  def on_open(self, info):
    self.on_authed_open(info)

  def on_message(self, msg):
    self.on_parsed_message(json.loads(msg))
