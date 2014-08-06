import sqlalchemy
from io import StringIO

from sqlalchemy import func, inspect
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext import hybrid
from sqlalchemy.ext.declarative import declarative_base, declared_attr
from sqlalchemy.orm import backref, relationship, Session, remote, foreign
from sqlalchemy.types import *

from . import game_pb2

Base = declarative_base()


def basic_primary_key():
  return sqlalchemy.Column(Integer, primary_key=True, nullable=False)


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
  def bounded_by(cls, a_left, a_top, a_right, a_bottom):
    # We want to select 1.5x the viewport area.
    a_width = a_right - a_left
    a_height = a_bottom - a_top

    a_padding_w = a_width // 2
    a_padding_h = a_height // 2

    return (cls.a_left >= a_left - a_padding_w) & \
           (cls.a_right <= a_right + a_padding_w) & \
           (cls.a_top >= a_top - a_padding_h) & \
           (cls.a_bottom <= a_bottom + a_padding_h)

  def to_protobuf(self):
    return game_pb2.Region(
        location=game_pb2.AbsoluteRealmLocation(realm_id=self.realm_id,
                                                arx=self.arx, ary=self.ary),
        corners=self.corners)


class User(Base):
  __tablename__ = "users"

  id = basic_primary_key()
  name = sqlalchemy.Column(String, unique=True, nullable=False)

  current_player_id = sqlalchemy.Column(
      Integer,
      sqlalchemy.ForeignKey("players.id", use_alter=True,
                            name="user_current_player_id -> players"),
      nullable=True)
  current_player = relationship("Player",
                                foreign_keys="User.current_player_id")

  @property
  def queue_name(self):
    return "users.{id}".format(id=self.id)


class Entity(Base):
  __tablename__ = "entities"

  id = basic_primary_key()
  name = sqlalchemy.Column(String, nullable=False)
  type = sqlalchemy.Column(String, nullable=False)
  direction = sqlalchemy.Column(Integer, nullable=False, default=0)
  level = sqlalchemy.Column(Integer, nullable=False, default=0)

  hp = sqlalchemy.Column(Integer, nullable=False, default=0)
  mp = sqlalchemy.Column(Integer, nullable=False, default=0)
  xp = sqlalchemy.Column(Integer, nullable=False, default=0)

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

  __table_args__ = (
        sqlalchemy.Index("realm_location_idx",
                         "realm_id", "arx", "ary", "rx", "ry"),
        sqlalchemy.Index("unique_player_name", "name",
                         postgresql_where=type == "players", unique=True)
    )

  def location_to_protobuf(self):
    return game_pb2.AbsoluteLocation(realm_id=self.realm_id,
                                     ax=self.ax, ay=self.ay)

  def to_protobuf(self):
    return game_pb2.Entity(id=self.id, name=self.name, type=self.type,
                           location=self.location_to_protobuf(),
                           direction=self.direction, level=self.level,
                           hp=self.hp, max_hp=100, mp=self.mp, max_mp=100,
                           xp=self.xp, max_xp=100)

  def to_origin_protobuf(self):
    return game_pb2.Origin(id=self.id, name=self.name)

  @property
  def routing_key(self):
    return "entity.{id}".format(id=self.id)

  __mapper_args__ = {
      "polymorphic_on": type,
      "with_polymorphic": "*"
  }


class Actor(Entity):
  __tablename__ = "actors"

  id = sqlalchemy.Column(Integer, sqlalchemy.ForeignKey("entities.id"),
                         primary_key=True)
  body = sqlalchemy.Column(String, nullable=False)
  facial = sqlalchemy.Column(String, nullable=True)

  __mapper_args__ = {
      "polymorphic_identity": __tablename__
  }

  def to_protobuf(self):
    protobuf = super().to_protobuf()
    message = game_pb2.Actor(body=self.body)

    if self.facial is not None:
      message.facial = self.facial

    protobuf.Extensions[game_pb2.Actor.actor_ext].MergeFrom(message)
    return protobuf


class Player(Actor):
  __tablename__ = "players"

  id = sqlalchemy.Column(Integer, sqlalchemy.ForeignKey("actors.id"),
                         primary_key=True)

  user_id = sqlalchemy.Column(Integer,
                              sqlalchemy.ForeignKey("users.id"),
                              nullable=False)
  user = relationship("User", foreign_keys="Player.user_id", backref="players")

  __mapper_args__ = {
      "polymorphic_identity": __tablename__
  }
