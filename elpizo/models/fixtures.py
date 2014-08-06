import sqlalchemy

from sqlalchemy import func, inspect
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext import hybrid
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import backref, relationship, Session, remote, foreign
from sqlalchemy.types import *

from .. import game_pb2

from .entities import Entity


class Fixture(Entity):
  __tablename__ = "fixtures"
  NAME = "abstract"

  id = sqlalchemy.Column(Integer, sqlalchemy.ForeignKey("entities.id"),
                         primary_key=True)
  a_left = sqlalchemy.Column(Integer, nullable=False)
  a_top = sqlalchemy.Column(Integer, nullable=False)
  a_right = sqlalchemy.Column(Integer, nullable=False)
  a_bottom = sqlalchemy.Column(Integer, nullable=False)

  def __init__(self, *args, **kwargs):
    self.a_left, self.a_top, self.a_right, self.a_bottom = self.BBOX
    super().__init__(*args, **kwargs)

  @declared_attr
  def __mapper_args__(cls):
    return {
        "polymorphic_identity": ".".join(["fixtures", cls.NAME])
    }

  def to_protobuf(self):
    protobuf = super().to_protobuf()
    protobuf.type = "fixtures"

    _, type = self.type.split(".")
    message = game_pb2.Fixture(fixture_type=type,
                               a_left=self.a_left, a_top=self.a_top,
                               a_right=self.a_right, a_bottom=self.a_bottom)

    protobuf.Extensions[game_pb2.Fixture.fixture_ext].MergeFrom(message)
    return protobuf

  @classmethod
  def to_js(cls):
    a_left, a_top, a_right, a_bottom = cls.BBOX

    return {
        "name": cls.NAME,
        "size": {
            "aLeft": a_left,
            "aTop": a_top,
            "aRight": a_right,
            "aBottom": a_bottom
        }
    }

  @hybrid.hybrid_property
  def bbox(self):
    return func.box(func.point(self.a_left, self.a_top),
                    func.point(self.a_right - 1, self.a_bottom - 1))

  @hybrid.hybrid_method
  def bbox_contains(self, realm_id, ax, ay):
    offset = func.point(self.ax, self.ay)
    point = func.point(ax, ay)

    return (self.realm_id == realm_id) & (self.bbox).op("@>")(point - offset)


Fixture.__table_args__ = (
    sqlalchemy.Index("ix_fixtures_bbox", Fixture.bbox, postgresql_using="gist"),
)


class Tree(Fixture):
  NAME = "tree"
  BBOX = (0, 0, 1, 1)
