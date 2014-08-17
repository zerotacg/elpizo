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

  bbox_left = sqlalchemy.Column(Integer, nullable=False, default=0)
  bbox_top = sqlalchemy.Column(Integer, nullable=False, default=0)
  bbox_width = sqlalchemy.Column(Integer, nullable=False, default=1)
  bbox_height = sqlalchemy.Column(Integer, nullable=False, default=1)

  @hybrid.hybrid_property
  def bbox(self):
    return func.box(func.point(self.bbox_left, self.bbox_top),
                    func.point(self.bbox_left + self.bbox_width - 1,
                               self.bbox_top + self.bbox_height - 1))

  @hybrid.hybrid_property
  def bounds(self):
    return self.bbox + self.point

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
  def intersects(self, entity):
    return (self.realm_id == entity.realm_id) & \
        (self.bounds).op("&&")(entity.bounds)

  @hybrid.hybrid_method
  def contained_by(self, left, top, width, height):
    right = left + width
    bottom = top + height

    return func.box(func.point(left, top),
                    func.point(right - 1, bottom - 1)).op("@>")(self.point)

  def is_passable(self, location, direction):
    return True

  def bbox_to_protobuf(self):
    return game_pb2.Rectangle(left=self.bbox_left, top=self.bbox_top,
                              width=self.bbox_width, height=self.bbox_height)

  def location_to_protobuf(self):
    return game_pb2.AbsoluteLocation(realm_id=self.realm_id,
                                     ax=self.ax, ay=self.ay)

  def to_protobuf(self):
    return game_pb2.Entity(id=self.id, type=self.type,
                           location=self.location_to_protobuf(),
                           bbox=self.bbox_to_protobuf(),
                           direction=self.direction)

  @property
  def routing_key(self):
    return "entity.{id}".format(id=self.id)

  def on_contact(self, ctx):
    return

  def on_containing_interact(self, ctx):
    return

  def on_adjacent_interact(self, ctx):
    return

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
    sqlalchemy.Index("ix_entities_bbox", Entity.bbox, postgresql_using="gist"),
    sqlalchemy.Index("ix_entities_point", Entity.point,
                     postgresql_using="gist"),
)


class Building(Entity):
  __tablename__ = "buildings"

  id = sqlalchemy.Column(Integer, sqlalchemy.ForeignKey("entities.id"),
                         primary_key=True)
  door_position = sqlalchemy.Column(Integer, nullable=False)

  def is_passable(self, location, direction):
    x, y = location
    if x == self.ax + self.bbox_left + self.door_position and \
       y == self.ay + self.bbox_top + self.bbox_height - 1:
      return True
    return False

  def to_protobuf(self):
    protobuf = super().to_protobuf()
    message = game_pb2.Building(door_position=self.door_position)

    protobuf.Extensions[game_pb2.Building.building_ext].MergeFrom(message)
    return protobuf

  __mapper_args__ = {
      "polymorphic_identity": "building"
  }


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
