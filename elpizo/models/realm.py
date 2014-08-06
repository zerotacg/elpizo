import sqlalchemy

from sqlalchemy import func, inspect
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext import hybrid
from sqlalchemy.ext.declarative import declarative_base, declared_attr
from sqlalchemy.orm import backref, relationship, Session, remote, foreign
from sqlalchemy.types import *

from .. import game_pb2

from . import Base, basic_primary_key


class Realm(Base):
  __tablename__ = "realms"

  id = basic_primary_key()
  name = sqlalchemy.Column(String, nullable=False)

  aw = sqlalchemy.Column(Integer, nullable=False)
  ah = sqlalchemy.Column(Integer, nullable=False)

  @property
  def routing_key(self):
    return "realm.{realm_id}".format(realm_id=self.id)

  def to_protobuf(self):
    return game_pb2.Realm(id=self.id, name=self.name,
                          size=game_pb2.Realm.AbsoluteSize(aw=self.aw,
                                                           ah=self.ah))


class Terrain(Base):
  __tablename__ = "terrain"

  id = basic_primary_key()
  name = sqlalchemy.Column(String, unique=True, nullable=False)
  passable = sqlalchemy.Column(Boolean, nullable=False)

  def to_js(self):
    return {
        "name": self.name,
        "passable": self.passable
    }


class Region(Base):
  __tablename__ = "regions"

  SIZE = 16

  realm_id = sqlalchemy.Column(Integer,
                               sqlalchemy.ForeignKey("realms.id"),
                               nullable=False,
                               primary_key=True)
  realm = relationship("Realm", backref="regions")

  arx = sqlalchemy.Column(Integer, nullable=False, primary_key=True)
  ary = sqlalchemy.Column(Integer, nullable=False, primary_key=True)

  @hybrid.hybrid_property
  def a_left(self):
    return self.arx * Region.SIZE

  @hybrid.hybrid_property
  def a_top(self):
    return self.ary * Region.SIZE

  @hybrid.hybrid_property
  def a_right(self):
    return (self.arx + 1) * Region.SIZE

  @hybrid.hybrid_property
  def a_bottom(self):
    return (self.ary + 1) * Region.SIZE

  @hybrid.hybrid_property
  def bbox(self):
    return func.box(func.point(self.a_left, self.a_top),
                    func.point(self.a_right, self.a_bottom))

  # The array contains integers in the Terrain table.
  corners = sqlalchemy.Column(postgresql.ARRAY(Integer), nullable=False)

  @property
  def key(self):
    return "{realm_id}.{arx}_{ary}".format(realm_id=self.realm_id,
                                           arx=self.arx, ary=self.ary)

  @property
  def routing_key(self):
    return "region.{key}".format(key=self.key)

  @hybrid.hybrid_method
  def bounded_by(self, a_left, a_top, a_right, a_bottom):
    # We want to select 1.5x the viewport area.
    a_width = a_right - a_left
    a_height = a_bottom - a_top

    a_padding_w = a_width // 2
    a_padding_h = a_height // 2

    viewport_box = func.box(
        func.point(a_left - a_padding_w, a_top - a_padding_h),
        func.point(a_right + a_padding_w, a_bottom + a_padding_h))

    return self.bbox.op("&&")(viewport_box)

  def to_protobuf(self):
    return game_pb2.Region(
        location=game_pb2.AbsoluteRealmLocation(realm_id=self.realm_id,
                                                arx=self.arx, ary=self.ary),
        corners=self.corners)

Region.__table_args__ = (
    sqlalchemy.Index("ix_regions_bbox", Region.bbox, postgresql_using="gist"),
)
