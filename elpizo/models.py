import sqlalchemy

from sqlalchemy import func, types
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import backref, relationship, Session, remote, foreign

Base = declarative_base()


def default_pkey():
  return sqlalchemy.Column(types.Integer, primary_key=True, nullable=False)


class User(Base):
  __tablename__ = "users"

  id = default_pkey()
  name = sqlalchemy.Column(types.String, unique=True, nullable=False)

  current_creature_id = sqlalchemy.Column(
      types.Integer,
      sqlalchemy.ForeignKey("creatures.id"),
      nullable=True)
  current_creature = relationship("Creature",
                                  foreign_keys="User.current_creature_id")

class Player(Base):
  __tablename__ = "players"

  user_id = sqlalchemy.Column(types.Integer,
                              sqlalchemy.ForeignKey("users.id"),
                              nullable=False,
                              primary_key=True)
  user = relationship("User", foreign_keys="Player.user_id", backref="players")

  creature_id = sqlalchemy.Column(
      types.Integer,
      sqlalchemy.ForeignKey("creatures.id"),
      nullable=False,
      unique=True,
      primary_key=True)
  creature = relationship("Creature", backref=backref("player", uselist=False))

  def to_js(self):
    return {
        "creature": self.creature.to_js()
    }


class Creature(Base):
  __tablename__ = "creatures"

  id = default_pkey()
  name = sqlalchemy.Column(types.String, unique=True, nullable=False)

  creature_kind_id = sqlalchemy.Column(
      types.Integer,
      sqlalchemy.ForeignKey("creature_kinds.id"),
      nullable=False)
  kind = relationship("CreatureKind")

  variant = sqlalchemy.Column(types.Integer, nullable=False)

  map_tile_id = sqlalchemy.Column(types.Integer,
                                  sqlalchemy.ForeignKey("map_tiles.id"),
                                  nullable=False)
  map_tile = relationship("MapTile", backref="creatures")

  level = sqlalchemy.Column(types.Integer, nullable=False)

  hp = sqlalchemy.Column(types.Integer, nullable=False)
  mp = sqlalchemy.Column(types.Integer, nullable=False)
  xp = sqlalchemy.Column(types.Integer, nullable=False)

  def to_js(self):
    return {
        "id": self.id,
        "name": self.name,
        "kind": self.kind.id,
        "variant": self.variant,
        "level": self.level,
        "hp": self.hp,
        "maxHp": 100,
        "mp": self.mp,
        "maxMp": 100,
        "xp": self.xp,
        "maxXp": 100
    }

User.current_player = relationship("Player",
    primaryjoin=(User.current_creature_id == remote(Creature.id)) &
                (foreign(Player.creature_id) == Creature.id),
    viewonly=True,
    uselist=False)


class CreatureKind(Base):
  __tablename__ = "creature_kinds"

  id = default_pkey()
  name = sqlalchemy.Column(types.String, unique=True, nullable=False)


class Realm(Base):
  __tablename__ = "realms"

  id = default_pkey()
  name = sqlalchemy.Column(types.String, nullable=False)

  width = sqlalchemy.Column(types.Integer, nullable=False)
  height = sqlalchemy.Column(types.Integer, nullable=False)

  corners = relationship("MapCorner", backref="realm")
  tiles = relationship("MapTile", backref="realm")

  def to_js(self):
    return {
        "id": self.id,
        "name": self.name
    }


class Terrain(Base):
  __tablename__ = "terrains"

  id = default_pkey()
  name = sqlalchemy.Column(types.String, nullable=False)


class MapCorner(Base):
  """
  Corners define the terrain type at each point, such that the marching squares
  algorithm can correctly determine the tile transitions.
  """

  __tablename__ = "map_corners"

  id = default_pkey()

  realm_id = sqlalchemy.Column(types.Integer,
                               sqlalchemy.ForeignKey("realms.id"),
                               nullable=False)

  # The corner coordinate system is labeled with s and t rather than x and y to
  # prevent confusion. (s, t) corresponds to the top-left corner of a tile in
  # xy-space.
  s = sqlalchemy.Column(types.Integer, nullable=False)
  t = sqlalchemy.Column(types.Integer, nullable=False)

  terrain_id = sqlalchemy.Column(types.Integer,
                                 sqlalchemy.ForeignKey("terrains.id"),
                                 nullable=False)
  terrain = relationship("Terrain")

  __table_args__ = (
      sqlalchemy.Index("map_corners_st_idx", "realm_id", "s", "t"),
  )


class MapTile(Base):
  """
  Map tiles are the duals of map corners, and are used for positioning entities.

  Tiles always have four corresponding corners, but corners might not have four
  corresponding tiles.
  """

  __tablename__ = "map_tiles"

  id = default_pkey()
  realm_id = sqlalchemy.Column(types.Integer,
                               sqlalchemy.ForeignKey("realms.id"),
                               nullable=False)
  x = sqlalchemy.Column(types.Integer, nullable=False)
  y = sqlalchemy.Column(types.Integer, nullable=False)

  def get_corners(self):
    """
    Get corners in clockwise order, starting from (0, 0).
    """
    session = Session.object_session(self)

    corners = {(corner.s - self.x, corner.t - self.y): corner
               for corner in session.query(MapCorner)
                   .filter(MapCorner.realm == self.realm,
                           (MapCorner.s == self.x + 0) |
                           (MapCorner.s == self.x + 1),
                           (MapCorner.t == self.y + 0) |
                           (MapCorner.t == self.y + 1))
    }

    return corners[0, 0], corners[1, 0], corners[1, 1], corners[0, 1]

  def to_js(self):
    return {
        "x": self.x,
        "y": self.y,
        "realm": self.realm.to_js()
    }

  __table_args__ = (
      sqlalchemy.Index("map_tiles_xy_idx", "realm_id", "x", "y"),
  )


class Building(Base):
  __tablename__ = "buildings"

  id = default_pkey()
  name = sqlalchemy.Column(types.String, nullable=False)

  building_kind_id = sqlalchemy.Column(
      types.Integer,
      sqlalchemy.ForeignKey("building_kinds.id"),
      nullable=False)
  kind = relationship("BuildingKind")

  map_tile_id = sqlalchemy.Column(types.Integer,
                                  sqlalchemy.ForeignKey("map_tiles.id"),
                                  nullable=False)
  map_tile = relationship("MapTile", backref="buildings")

  def to_js(self):
    return {
        "id": self.id,
        "name": self.name,
        "kind": self.kind.id
    }


class BuildingKind(Base):
  __tablename__ = "building_kinds"

  id = default_pkey()
  name = sqlalchemy.Column(types.String, unique=True, nullable=False)


class Facility(Base):
  __tablename__ = "facilities"

  id = default_pkey()
  name = sqlalchemy.Column(types.String, nullable=False)

  facility_kind_id = sqlalchemy.Column(
      types.Integer,
      sqlalchemy.ForeignKey("facility_kinds.id"),
      nullable=False)
  kind = relationship("FacilityKind")

  map_tile_id = sqlalchemy.Column(types.Integer,
                                  sqlalchemy.ForeignKey("map_tiles.id"),
                                  nullable=False)
  map_tile = relationship("MapTile", backref="facilities")

  def to_js(self):
    return {
        "id": self.id,
        "name": self.name,
        "kind": self.kind.id
    }


class FacilityKind(Base):
  __tablename__ = "facility_kinds"

  id = default_pkey()
  name = sqlalchemy.Column(types.String, unique=True, nullable=False)


class Item(Base):
  __tablename__ = "items"

  id = default_pkey()
  name = sqlalchemy.Column(types.String, nullable=False)

  item_kind_id = sqlalchemy.Column(
      types.Integer,
      sqlalchemy.ForeignKey("item_kinds.id"),
      nullable=False)
  kind = relationship("ItemKind")

  creature_id = sqlalchemy.Column(types.Integer,
                                  sqlalchemy.ForeignKey("creatures.id"),
                                  nullable=True)
  creature = relationship("Creature", backref="inventory")

  map_tile_id = sqlalchemy.Column(types.Integer,
                                  sqlalchemy.ForeignKey("map_tiles.id"),
                                  nullable=True)
  map_tile = relationship("MapTile", backref="items")

  def to_js(self):
    return {
        "id": self.id,
        "name": self.name,
        "kind": self.kind.id
    }

  __table_args__ = (
      sqlalchemy.CheckConstraint(
          (func.coalesce(creature_id, map_tile_id) != None) &
              ((creature_id == None) | (map_tile_id == None)),
          name="one_of_creature_id_map_tile_id_check"),
  )


class ItemKind(Base):
  __tablename__ = "item_kinds"

  id = default_pkey()
  name = sqlalchemy.Column(types.String, unique=True, nullable=False)
