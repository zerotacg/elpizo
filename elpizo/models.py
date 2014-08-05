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
  name = sqlalchemy.Column(String, nullable=False)

  def to_protobuf(self):
    return game_pb2.Terrain(id=self.id, name=self.name)


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
        location=game_pb2.AbsoluteRealmLocation(realmId=self.realm_id,
                                                arx=self.arx, ary=self.ary),
        corners=self.corners)


class LocationMixin(object):
  @declared_attr
  def realm_id(cls):
    return sqlalchemy.Column(Integer,
                             sqlalchemy.ForeignKey("realms.id"),
                             nullable=False)
  @declared_attr
  def realm(cls):
    return relationship("Realm")

  @declared_attr
  def region(cls):
    return relationship("Region",
        primaryjoin=lambda:
            (cls.realm_id == Realm.id) & (Region.realm_id == Realm.id) &
            (cls.arx == foreign(Region.arx)) & (cls.ary == foreign(Region.ary)),
        viewonly=True,
        uselist=False,
        backref=backref(cls.__tablename__, uselist=True))

  arx = sqlalchemy.Column(Integer, nullable=False)
  ary = sqlalchemy.Column(Integer, nullable=False)

  rx = sqlalchemy.Column(Integer, nullable=False)
  ry = sqlalchemy.Column(Integer, nullable=False)

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

  @declared_attr
  def __table_args__(cls):
    return (
        sqlalchemy.Index("realm_location_idx",
                         "realm_id", "arx", "ary", "rx", "ry"),
    )

  def location_to_protobuf(self):
    return game_pb2.AbsoluteLocation(realmId=self.realm_id,
                                     ax=self.ax, ay=self.ay)


class User(Base):
  __tablename__ = "users"

  id = basic_primary_key()
  name = sqlalchemy.Column(String, unique=True, nullable=False)

  current_entity_id = sqlalchemy.Column(
      Integer,
      sqlalchemy.ForeignKey("entities.id"),
      nullable=True)
  current_entity = relationship("Entity",
                               foreign_keys="User.current_entity_id")

  @property
  def queue_name(self):
    return "users.{id}".format(id=self.id)


class Player(Base):
  __tablename__ = "players"

  user_id = sqlalchemy.Column(Integer,
                              sqlalchemy.ForeignKey("users.id"),
                              nullable=False,
                              primary_key=True)
  user = relationship("User", foreign_keys="Player.user_id", backref="players")

  entity_id = sqlalchemy.Column(
      Integer,
      sqlalchemy.ForeignKey("entities.id"),
      nullable=False,
      unique=True,
      primary_key=True)
  entity = relationship("Entity", backref=backref("player", uselist=False))

  def to_protobuf(self):
    return game_pb2.Player(entity=self.entity.to_protobuf())

  @classmethod
  def by_user_id(cls, session, user_id):
    return session.query(cls) \
        .filter(User.current_entity_id == Entity.id,
                cls.user_id == user_id,
                cls.entity_id == Entity.id,
                User.id == user_id) \
        .one()

class Entity(LocationMixin, Base):
  __tablename__ = "entities"

  id = basic_primary_key()
  name = sqlalchemy.Column(String, unique=True, nullable=False)
  types = sqlalchemy.Column(postgresql.ARRAY(String), nullable=False)
  direction = sqlalchemy.Column(Integer, nullable=False)
  level = sqlalchemy.Column(Integer, nullable=False)

  hp = sqlalchemy.Column(Integer, nullable=False)
  mp = sqlalchemy.Column(Integer, nullable=False)
  xp = sqlalchemy.Column(Integer, nullable=False)

  def to_protobuf(self):
    return game_pb2.Entity(id=self.id, name=self.name, types=self.types,
                           location=self.location_to_protobuf(),
                           direction=self.direction, level=self.level,
                           hp=self.hp, maxHp=100, mp=self.mp, maxMp=100,
                           xp=self.xp, maxXp=100)

  def to_origin_protobuf(self):
    return game_pb2.Origin(id=self.id, name=self.name)

  @property
  def routing_key(self):
    return "entity.{id}".format(id=self.id)


User.current_player = relationship("Player",
    primaryjoin=(User.current_entity_id == remote(Entity.id)) &
                (foreign(Player.entity_id) == Entity.id),
    viewonly=True,
    uselist=False)
