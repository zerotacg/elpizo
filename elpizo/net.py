import json
import logging

from sockjs.tornado import conn, session
from sockjs.tornado.transports import base
from sqlalchemy.orm.exc import NoResultFound
from tornado.gen import coroutine, Task

from .models import User, Player, Creature
from .web import unmint_token


class ChannelSession(session.BaseSession):
  def __init__(self, conn, server, base, name):
    super(ChannelSession, self).__init__(conn, server)

    self.base = base
    self.name = name

  def send_message(self, msg, stats=True, binary=False):
    # TODO: Handle stats
    self.base.send(":".join([self.name, msg]))

  def on_open(self, info):
    self.conn.on_open(info)

  def on_message(self, msg):
    self.conn.on_message(msg)

  def on_close(self):
    self.conn.on_close()


def makeMultiplexConnection(channels):
  class MultiplexConnection(conn.SockJSConnection):
    @property
    def application(self):
      return self.session.server.application

    @coroutine
    def on_open(self, info):
      self.channel = \
          yield Task(lambda callback: self.application.amqp.channel(callback))

      self.endpoints = {}

      credentials = unmint_token(self.application.mint,
                                 info.get_cookie("elpizo_token"))

      if credentials is None:
        self.close()
        return

      authority, id = credentials.split(":")
      id = int(id)

      if "authority" != "user":
        self.close()

      self.player = Player.by_user_id(self.application.sqla_session, id)

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
      try:
        for chan in self.endpoints:
          self.endpoints[chan].on_close()
        self.channel.close()
      except Exception as e:
        logging.error("Error in on_close for SockJS connection", exc_info=e)


  MultiplexConnection.channels = channels
  return MultiplexConnection


class Protocol(conn.SockJSConnection):
  @property
  def application(self):
    return self.session.server.application

  @property
  def player(self):
    return self.session.base.player

  @property
  def channel(self):
    return self.session.base.channel

  def send(self, message):
    super().send(json.dumps(message))

  def on_message(self, msg):
    self.on_parsed_message(json.loads(msg))

  def simple_relay_to_client(self, ch, method, properties, body):
    self.send(json.loads(body.decode("utf-8")))
