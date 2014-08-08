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


class Entity(Base):
  __tablename__ = "entities"

  id = basic_primary_key()
  type = sqlalchemy.Column(String, nullable=False)
  direction = sqlalchemy.Column(Integer, nullable=False, default=0)

  realm_id = sqlalchemy.Column(Integer,
                               sqlalchemy.ForeignKey("realms.id"),
                               nullable=False)
  arx = sqlalchemy.Column(Integer, nullable=False)
  ary = sqlalchemy.Column(Integer, nullable=False)

  rx = sqlalchemy.Column(Integer, nullable=False)
  ry = sqlalchemy.Column(Integer, nullable=False)

  realm = relationship("Realm")

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

  @declared_attr
  def __mapper_args__(cls):
    return {
        "polymorphic_on": cls.type,
        "polymorphic_identity": cls.__name__
    }

  __table_args__ = (
      sqlalchemy.ForeignKeyConstraint(
          ["realm_id", "arx", "ary"],
          [Region.realm_id, Region.arx, Region.ary],
          name="entities_location_fk"),
  )


Entity.__table_args__ += (
    sqlalchemy.Index("ix_entities_point", Entity.point,
                     postgresql_using="gist"),
)
