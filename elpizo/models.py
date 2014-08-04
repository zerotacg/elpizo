import sqlalchemy
from io import StringIO

from sqlalchemy import func, types
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.declarative import declarative_base, declared_attr
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import backref, relationship, Session, remote, foreign


class Base(object):
  def to_js(self):
    return {}

Base = declarative_base(cls=Base)


def default_pkey():
  return sqlalchemy.Column(types.Integer, primary_key=True, nullable=False)


class Realm(Base):
  __tablename__ = "realms"

  id = default_pkey()
  name = sqlalchemy.Column(types.String, nullable=False)

  aw = sqlalchemy.Column(types.Integer, nullable=False)
  ah = sqlalchemy.Column(types.Integer, nullable=False)

  @property
  def routing_key(self):
    return "realms.{realm_id}".format(realm_id=self.id)


class Region(Base):
  __tablename__ = "regions"

  SIZE = 16

  realm_id = sqlalchemy.Column(types.Integer,
                               sqlalchemy.ForeignKey("realms.id"),
                               nullable=False,
                               primary_key=True)
  realm = relationship("Realm", backref="regions")

  arx = sqlalchemy.Column(types.Integer, nullable=False, primary_key=True)
  ary = sqlalchemy.Column(types.Integer, nullable=False, primary_key=True)

  corners = sqlalchemy.Column(postgresql.ARRAY(types.Integer), nullable=False)

  @property
  def routing_key(self):
    return "regions.{realm_id}.{arx}_{ary}".format(realm_id=self.realm_id,
                                                   arx=self.arx, ary=self.ary)


class LocationMixin(object):
  @declared_attr
  def realm_id(cls):
    return sqlalchemy.Column(types.Integer,
                             sqlalchemy.ForeignKey("realms.id"),
                             nullable=False)
  @declared_attr
  def realm(cls):
    return relationship("Realm")

  @declared_attr
  def region(cls):
    return relationship("Region",
        primaryjoin=lambda:
            (cls.realm_id == remote(Realm.id)) &
            (Region.realm_id == remote(Realm.id)) &
            (cls.arx == foreign(Region.arx)) & (cls.ary == foreign(Region.ary)),
        viewonly=True,
        uselist=False)

  arx = sqlalchemy.Column(types.Integer, nullable=False)
  ary = sqlalchemy.Column(types.Integer, nullable=False)

  rx = sqlalchemy.Column(types.Integer, nullable=False)
  ry = sqlalchemy.Column(types.Integer, nullable=False)

  @hybrid_property
  def ax(self):
    return self.arx * Region.SIZE + self.rx

  @ax.setter
  def ax(self, v):
    self.arx = v // Region.SIZE
    self.rx = v % Region.SIZE

  @hybrid_property
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

  def to_js(self):
    return {
        "realm_id": self.realm_id,
        "ax": self.ax,
        "ay": self.ay
    }


class User(Base):
  __tablename__ = "users"

  id = default_pkey()
  name = sqlalchemy.Column(types.String, unique=True, nullable=False)

  current_actor_id = sqlalchemy.Column(
      types.Integer,
      sqlalchemy.ForeignKey("actors.id"),
      nullable=True)
  current_actor = relationship("Actor",
                               foreign_keys="User.current_actor_id")

  @property
  def queue_name(self):
    return "users.{id}".format(id=self.id)


class Player(Base):
  __tablename__ = "players"

  user_id = sqlalchemy.Column(types.Integer,
                              sqlalchemy.ForeignKey("users.id"),
                              nullable=False,
                              primary_key=True)
  user = relationship("User", foreign_keys="Player.user_id", backref="players")

  actor_id = sqlalchemy.Column(
      types.Integer,
      sqlalchemy.ForeignKey("actors.id"),
      nullable=False,
      unique=True,
      primary_key=True)
  actor = relationship("Actor", backref=backref("player", uselist=False))

  def to_js(self):
    return {
        "actor": self.actor.to_js()
    }

  @classmethod
  def by_user_id(cls, session, user_id):
    return session.query(cls) \
        .filter(User.current_actor_id == Actor.id,
                cls.user_id == user_id,
                cls.actor_id == Actor.id,
                User.id == user_id) \
        .one()

class Actor(LocationMixin, Base):
  __tablename__ = "actors"

  id = default_pkey()
  name = sqlalchemy.Column(types.String, unique=True, nullable=False)

  actor_kind_id = sqlalchemy.Column(
      types.Integer,
      sqlalchemy.ForeignKey("actor_kinds.id"),
      nullable=False)
  kind = relationship("ActorKind")

  variant = sqlalchemy.Column(types.Integer, nullable=False)

  direction = sqlalchemy.Column(types.Integer, nullable=False)

  level = sqlalchemy.Column(types.Integer, nullable=False)

  hp = sqlalchemy.Column(types.Integer, nullable=False)
  mp = sqlalchemy.Column(types.Integer, nullable=False)
  xp = sqlalchemy.Column(types.Integer, nullable=False)

  def to_js(self):
    js = super().to_js()

    js.update({
        "id": self.id,
        "name": self.name,
        "kind": self.kind.id,
        "variant": self.variant,
        "direction": self.direction,
        "level": self.level,
        "hp": self.hp,
        "maxHp": 100,
        "mp": self.mp,
        "maxMp": 100,
        "xp": self.xp,
        "maxXp": 100,
    })

    return js

  @property
  def routing_key(self):
    return "actors.{name}".format(name=self.name)


User.current_player = relationship("Player",
    primaryjoin=(User.current_actor_id == remote(Actor.id)) &
                (foreign(Player.actor_id) == Actor.id),
    viewonly=True,
    uselist=False)


class ActorKind(Base):
  __tablename__ = "actor_kinds"

  id = default_pkey()
  name = sqlalchemy.Column(types.String, unique=True, nullable=False)
