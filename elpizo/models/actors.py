import sqlalchemy

from sqlalchemy import func, inspect
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext import hybrid
from sqlalchemy.ext.declarative import declarative_base, declared_attr
from sqlalchemy.orm import backref, relationship, Session, remote, foreign
from sqlalchemy.types import *

from .. import game_pb2

from .base import Entity


class Actor(Entity):
  __tablename__ = "actors"

  id = sqlalchemy.Column(Integer, sqlalchemy.ForeignKey("entities.id"),
                         primary_key=True)

  health = sqlalchemy.Column(Integer, nullable=False, default=0)

  gender = sqlalchemy.Column(String, nullable=False)
  body = sqlalchemy.Column(String, nullable=False)
  facial = sqlalchemy.Column(String, nullable=True)
  hair = sqlalchemy.Column(String, nullable=True)

  speed = 2 # should probably not be hardcoded

  def to_protobuf(self):
    protobuf = super().to_protobuf()
    message = game_pb2.Actor(health=self.health, gender=self.gender,
                             body=self.body, speed=self.speed,
                             inventory=[item.to_protobuf()
                                        for item in self.inventory])

    if self.facial is not None:
      message.facial = self.facial

    if self.hair is not None:
      message.hair = self.hair

    protobuf.Extensions[game_pb2.Actor.actor_ext].MergeFrom(message)
    return protobuf


class Player(Actor):
  __tablename__ = "players"

  id = sqlalchemy.Column(Integer, sqlalchemy.ForeignKey("actors.id"),
                         primary_key=True)
  name = sqlalchemy.Column(String, nullable=False, unique=True)

  user_id = sqlalchemy.Column(Integer,
                              sqlalchemy.ForeignKey("users.id"),
                              nullable=False)

  online = sqlalchemy.Column(Boolean, nullable=False, default=False)

  def to_protobuf(self):
    protobuf = super().to_protobuf()
    message = game_pb2.Player(name=self.name)

    protobuf.Extensions[game_pb2.Player.player_ext].MergeFrom(message)
    return protobuf
