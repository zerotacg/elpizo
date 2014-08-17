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


class Fixture(Entity):
  __tablename__ = "fixtures"

  REGISTRY = {}
  REGISTRY_TYPE = "unknown"

  id = sqlalchemy.Column(Integer, sqlalchemy.ForeignKey("entities.id"),
                         primary_key=True)

  def __init__(self, *args, **kwargs):
    self.bbox_left, self.bbox_top, self.bbox_width, self.bbox_height = self.BBOX
    super().__init__(*args, **kwargs)

  @classmethod
  def register(cls, c2):
    cls.REGISTRY[c2.REGISTRY_TYPE] = c2
    return c2

  @declared_attr
  def __mapper_args__(cls):
    return {
        "polymorphic_on": Entity.type,
        "polymorphic_identity": ".".join(["fixture", cls.REGISTRY_TYPE])
    }

  def to_protobuf(self):
    protobuf = super().to_protobuf()
    protobuf.type = "fixture"

    message = game_pb2.Fixture(fixture_type=self.REGISTRY_TYPE)
    protobuf.Extensions[game_pb2.Fixture.fixture_ext].MergeFrom(message)

    return protobuf
