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
from ..actors import Actor, Player


class Item(Base):
  __tablename__ = "items"

  id = basic_primary_key()
  type = sqlalchemy.Column(String, nullable=False)

  owner_actor_id = sqlalchemy.Column(Integer,
                                     sqlalchemy.ForeignKey("actors.id"),
                                     nullable=True)
  owner = relationship("Actor", backref="inventory")

  @declared_attr
  def __mapper_args__(cls):
    return {
        "polymorphic_on": cls.type,
        "polymorphic_identity": cls.__name__
    }

  def to_protobuf(self):
    return game_pb2.Item(id=self.id, type=self.type)


class Drop(Entity):
  __tablename__ = "drops"

  id = sqlalchemy.Column(Integer, sqlalchemy.ForeignKey("entities.id"),
                         primary_key=True)
  item_id = sqlalchemy.Column(Integer, sqlalchemy.ForeignKey("items.id"),
                              nullable=False, unique=True)
  item = relationship("Item", backref="drop")

  def to_protobuf(self):
    protobuf = super().to_protobuf()
    message = game_pb2.Drop(item=self.item.to_protobuf())

    protobuf.Extensions[game_pb2.Drop.drop_ext].MergeFrom(message)
    return protobuf
