import sqlalchemy

from sqlalchemy import types
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


def primary_key():
  return sqlalchemy.Column(types.Integer, primary_key=True, nullable=False)


class User(Base):
  __tablename__ = "users"

  id = primary_key()
  name = sqlalchemy.Column(types.String, unique=True, nullable=False)
  current_player_id = sqlalchemy.Column(types.Integer,
                                        sqlalchemy.ForeignKey(
                                            "players.id",
                                            use_alter=True,
                                            name="fk_users_players_id"),
                                        nullable=True)
  current_player = relationship("Player", foreign_keys="User.current_player_id")


class Player(Base):
  __tablename__ = "players"

  id = primary_key()
  name = sqlalchemy.Column(types.String, unique=True, nullable=False)
  user_id = sqlalchemy.Column(types.Integer,
                              sqlalchemy.ForeignKey("users.id"),
                              nullable=False)
  user = relationship("User", foreign_keys="Player.user_id", backref="players")
