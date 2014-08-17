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

  REGISTRY = {}
  REGISTRY_TYPE = "unknown"

  id = basic_primary_key()
  type = sqlalchemy.Column(String, nullable=False)

  @classmethod
  def register(cls, c2):
    cls.REGISTRY[c2.REGISTRY_TYPE] = c2
    return c2

  owner_actor_id = sqlalchemy.Column(Integer,
                                     sqlalchemy.ForeignKey("actors.id"),
                                     nullable=True)
  owner = relationship("Actor", foreign_keys=[owner_actor_id],
                       backref="inventory")

  @declared_attr
  def __mapper_args__(cls):
    return {
        "polymorphic_on": cls.type,
        "polymorphic_identity": cls.REGISTRY_TYPE
    }

  def to_protobuf(self):
    return game_pb2.Item(id=self.id, type=self.type)
