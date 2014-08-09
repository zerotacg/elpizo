import sqlalchemy

from sqlalchemy import func, inspect, event
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext import hybrid
from sqlalchemy.ext.declarative import declarative_base, declared_attr
from sqlalchemy.orm import backref, relationship, remote, foreign
from sqlalchemy.types import *

from ... import game_pb2
from .. import Base, basic_primary_key
from ..base import Entity
from ..actors import Player


class Item(Base):
  __tablename__ = "items"

  id = basic_primary_key()
  type = sqlalchemy.Column(String, nullable=False)

  owner_player_id = sqlalchemy.Column(Integer,
                                      sqlalchemy.ForeignKey("players.id"),
                                      nullable=True)
  owner = relationship("Player", backref="inventory")

  @declared_attr
  def __mapper_args__(cls):
    return {
        "polymorphic_on": cls.type,
        "polymorphic_identity": cls.__name__
    }


class Drop(Entity):
  __tablename__ = "drops"

  id = sqlalchemy.Column(Integer, sqlalchemy.ForeignKey("entities.id"),
                         primary_key=True)
  item_id = sqlalchemy.Column(Integer, sqlalchemy.ForeignKey("items.id"),
                              nullable=False, unique=True)
  item = relationship("Item", backref="drop")
