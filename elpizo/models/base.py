import sqlalchemy

from sqlalchemy import func, inspect
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext import hybrid
from sqlalchemy.ext.declarative import declarative_base, declared_attr
from sqlalchemy.orm import backref, relationship, Session, remote, foreign
from sqlalchemy.types import *

from .. import game_pb2

from . import Base, basic_primary_key
from .realm import Realm, Region


class User(Base):
  __tablename__ = "users"

  id = basic_primary_key()
  name = sqlalchemy.Column(String, unique=True, nullable=False)

  current_player_id = sqlalchemy.Column(
      Integer,
      sqlalchemy.ForeignKey("players.id", use_alter=True,
                            name="user_current_player_id"),
      nullable=True)
  current_player = relationship("Player",
                                foreign_keys="User.current_player_id")

  players = relationship("Player", foreign_keys="Player.user_id",
                         backref="user")

  @property
  def queue_name(self):
    return "users.{id}".format(id=self.id)

  @property
  def routing_key(self):
    return "users.{id}".format(id=self.id)


class Entity(Base):
  __tablename__ = "entities"

  id = basic_primary_key()
  type = sqlalchemy.Column(String, nullable=False)
  direction = sqlalchemy.Column(Integer, nullable=False, default=0)

  realm_id = sqlalchemy.Column(Integer,
                               sqlalchemy.ForeignKey("realms.id"),
                               nullable=False, index=True)
  arx = sqlalchemy.Column(Integer, nullable=False)
  ary = sqlalchemy.Column(Integer, nullable=False)

  rx = sqlalchemy.Column(Integer, nullable=False)
  ry = sqlalchemy.Column(Integer, nullable=False)

  realm = relationship("Realm", backref="entities")

  region = relationship("Region",
      primaryjoin=
          (realm_id == Realm.id) & (Region.realm_id == Realm.id) &
          (arx == foreign(Region.arx)) & (ary == foreign(Region.ary)),
      viewonly=True,
      uselist=False,
      backref=backref("entities", uselist=True))

  @hybrid.hybrid_property
  def ax(self):
    return self.arx * Region.SIZE + self.rx

  @ax.setter
  def ax(self, v):
    self.arx = v // Region.SIZE
    self.rx = v % Region.SIZE

  @hybrid.hybrid_property
  def ay(self):
    return self.ary * Region.SIZE + self.ry

  @ay.setter
  def ay(self, v):
    self.ary = v // Region.SIZE
    self.ry = v % Region.SIZE

  @hybrid.hybrid_property
  def point(self):
    return func.point(self.ax, self.ay)

  @hybrid.hybrid_method
  def contained_by(self, a_left, a_top, a_bottom, a_right):
    return func.box(func.point(a_left, a_top),
                    func.point(a_bottom - 1, a_right - 1)).op("@>")(self.point)

  def location_to_protobuf(self):
    return game_pb2.AbsoluteLocation(realm_id=self.realm_id,
                                     ax=self.ax, ay=self.ay)

  def to_protobuf(self):
    return game_pb2.Entity(id=self.id, type=self.type,
                           location=self.location_to_protobuf(),
                           direction=self.direction)

  @property
  def routing_key(self):
    return "entity.{id}".format(id=self.id)

  __mapper_args__ = {
      "polymorphic_on": type,
      "polymorphic_identity": "entity"
  }

  __table_args__ = (
      sqlalchemy.Index("ix_entities_region_location", realm_id, arx, ary),
      sqlalchemy.ForeignKeyConstraint(
          [realm_id, arx, ary],
          [Region.realm_id, Region.arx, Region.ary],
          name="entities_location_fk"),
  )


Entity.__table_args__ += (
    sqlalchemy.Index("ix_entities_point", Entity.point,
                     postgresql_using="gist"),
)


class Building(Entity):
  __tablename__ = "buildings"

  id = sqlalchemy.Column(Integer, sqlalchemy.ForeignKey("entities.id"),
                         primary_key=True)

  a_width = sqlalchemy.Column(Integer, nullable=False)
  a_height = sqlalchemy.Column(Integer, nullable=False)

  @hybrid.hybrid_property
  def bbox(self):
    # Buildings must not exceed one region in size (or they may not be
    # consistently rendered).
    return func.box(func.point(0, 0),
                    func.point(self.a_width, self.a_height))

  def to_protobuf(self):
    protobuf = super().to_protobuf()
    message = game_pb2.Building(a_width=self.a_width, a_height=self.a_height)

    protobuf.Extensions[game_pb2.Building.building_ext].MergeFrom(message)
    return protobuf

  __mapper_args__ = {
      "polymorphic_identity": "building"
  }


Building.__table_args__ = (
    sqlalchemy.Index("ix_buildings_bbox", Building.bbox,
                     postgresql_using="gist"),
)


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

  __mapper_args__ = {
      "polymorphic_identity": "drop"
  }
