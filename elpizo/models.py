import sqlalchemy

from sqlalchemy import types
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, Session

Base = declarative_base()


def default_pkey():
  return sqlalchemy.Column(types.Integer, primary_key=True, nullable=False)


class User(Base):
  __tablename__ = "users"

  id = default_pkey()
  name = sqlalchemy.Column(types.String, unique=True, nullable=False)
  current_player_id = sqlalchemy.Column(types.Integer,
                                        sqlalchemy.ForeignKey(
                                            "players.id",
                                            use_alter=True,
                                            name="users_current_player_id_fkey"),
                                        nullable=True)
  current_player = relationship("Player", foreign_keys="User.current_player_id")


class Player(Base):
  __tablename__ = "players"

  id = default_pkey()
  name = sqlalchemy.Column(types.String, unique=True, nullable=False)
  user_id = sqlalchemy.Column(types.Integer,
                              sqlalchemy.ForeignKey("users.id"),
                              nullable=False)
  user = relationship("User", foreign_keys="Player.user_id", backref="players")

  map_tile_id = sqlalchemy.Column(types.Integer,
                                  sqlalchemy.ForeignKey("map_tiles.id"),
                                  nullable=False)
  map_tile = relationship("MapTile", backref="players")


class Realm(Base):
  __tablename__ = "realms"

  id = default_pkey()
  name = sqlalchemy.Column(types.String, nullable=False)

  width = sqlalchemy.Column(types.Integer, nullable=False)
  height = sqlalchemy.Column(types.Integer, nullable=False)

  corners = relationship("MapCorner", backref="realm")
  tiles = relationship("MapTile", backref="realm")


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

  __table_args__ = (
      sqlalchemy.Index("map_tiles_xy_idx", "realm_id", "x", "y"),
  )
