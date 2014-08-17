import sqlalchemy

from sqlalchemy import func, inspect
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext import hybrid
from sqlalchemy.ext.declarative import declarative_base, declared_attr
from sqlalchemy.ext.orderinglist import ordering_list
from sqlalchemy.orm import backref, relationship, Session, remote, foreign
from sqlalchemy.types import *

from .. import game_pb2

from . import Base, basic_primary_key


class Terrain(Base):
  __tablename__ = "terrain"

  id = basic_primary_key()
  name = sqlalchemy.Column(String, nullable=False)

  def to_js(self):
    return {
        "name": self.name
    }


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


class Region(Base):
  __tablename__ = "regions"

  SIZE = 16

  id = basic_primary_key()
  realm_id = sqlalchemy.Column(Integer,
                               sqlalchemy.ForeignKey("realms.id"),
                               nullable=False, index=True)

  arx = sqlalchemy.Column(Integer, nullable=False)
  ary = sqlalchemy.Column(Integer, nullable=False)

  realm = relationship("Realm", backref=backref("regions", order_by=(ary, arx)))

  # There are two interpretations of how this bit mask works:
  #
  # * ESWN: Passability is defined by which direction you pass into the tile --
  #   e.g. if the N bit is 0, then you cannot pass into the tile if you were
  #   facing north.
  #
  # * WNES: Passability is defined by which direction you approach the tile from
  #   -- e.g. if the W bit is 0, then you cannot enter the tile from the west.
  passabilities = sqlalchemy.Column(postgresql.ARRAY(Integer), nullable=False)

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
                    func.point(self.a_right - 1, self.a_bottom - 1))

  @property
  def key(self):
    return "{realm_id}.{arx}_{ary}".format(realm_id=self.realm_id,
                                           arx=self.arx, ary=self.ary)

  @property
  def routing_key(self):
    return "region.{key}".format(key=self.key)

  @hybrid.hybrid_method
  def intersects(self, left, top, width, height):
    right = left + width
    bottom = top + height

    return self.bbox.op("&&")(func.box(
        func.point(left, top),
        func.point(right, bottom)))

  @hybrid.hybrid_method
  def bbox_contains(self, ax, ay):
    return self.bbox.op("@>")(func.point(ax, ay))

  def to_protobuf(self):
    return game_pb2.Region(
        location=game_pb2.AbsoluteRealmLocation(realm_id=self.realm_id,
                                                arx=self.arx, ary=self.ary),
        layers=[layer.to_protobuf() for layer in self.layers],
        passabilities=self.passabilities)

  __table_args__ = (
      sqlalchemy.Index("ix_region_location", realm_id, arx, ary, unique=True),
      sqlalchemy.CheckConstraint(
          func.array_length(passabilities, 1) == SIZE * SIZE),
  )

Region.__table_args__ += (
    sqlalchemy.Index("ix_regions_bbox", Region.bbox, postgresql_using="gist"),
)


class RegionLayer(Base):
  __tablename__ = "region_layers"

  region_id = sqlalchemy.Column(Integer, sqlalchemy.ForeignKey("regions.id"),
                                nullable=False, primary_key=True)
  terrain_id = sqlalchemy.Column(Integer, sqlalchemy.ForeignKey("terrain.id"),
                                 nullable=False)
  terrain = relationship("Terrain")
  tiles = sqlalchemy.Column(postgresql.ARRAY(Integer), nullable=False)
  layer_index = sqlalchemy.Column(Integer, nullable=False, primary_key=True)

  region = relationship(
      "Region",
      backref=backref("layers",
                      order_by="RegionLayer.layer_index",
                      collection_class=ordering_list("layer_index")))

  def to_protobuf(self):
    return game_pb2.Region.Layer(terrain_id=self.terrain_id,
                                 tiles=self.tiles)

  __table_args__ = (
      sqlalchemy.CheckConstraint(
          func.array_length(tiles, 1) == Region.SIZE * Region.SIZE),
  )
