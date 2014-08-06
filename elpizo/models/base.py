import sqlalchemy

from sqlalchemy import func, inspect
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext import hybrid
from sqlalchemy.ext.declarative import declarative_base, declared_attr
from sqlalchemy.orm import backref, relationship, Session, remote, foreign
from sqlalchemy.types import *

from .. import game_pb2

from . import Base, basic_primary_key

from .entities import Player


class User(Base):
  __tablename__ = "users"

  id = basic_primary_key()
  name = sqlalchemy.Column(String, unique=True, nullable=False)

  current_player_id = sqlalchemy.Column(
      Integer,
      sqlalchemy.ForeignKey("players.id", use_alter=True,
                            name="user_current_player_id -> players"),
      nullable=True)
  current_player = relationship("Player",
                                foreign_keys="User.current_player_id")

  players = relationship("Player", foreign_keys="Player.user_id",
                         backref="user")

  @property
  def queue_name(self):
    return "users.{id}".format(id=self.id)
