import json

from sockjs.tornado import conn, session
from sockjs.tornado.transports import base
from tornado.web import decode_signed_value

from .models import User, Player


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

    def on_open(self, info):
      if info.get_cookie("elpizo_user") is None:
        self.close()
        return

      user_id = int(decode_signed_value(
          self.application.settings["cookie_secret"],
          name="elpizo_user",
          value=info.get_cookie("elpizo_user").value))

      self.player = self.application.sqla_session.query(Player) \
          .filter((User.current_player_id == Player.id) &
                  (User.id == user_id)) \
          .one()

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

  @property
  def player(self):
    return self.session.base.player

  def send(self, message):
    super().send(json.dumps(message))

  def on_open(self, info):
    self.on_authed_open(info)

  def on_message(self, msg):
    self.on_parsed_message(json.loads(msg))
