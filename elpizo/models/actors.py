import sqlalchemy

from sqlalchemy import func, inspect
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext import hybrid
from sqlalchemy.ext.declarative import declarative_base, declared_attr
from sqlalchemy.orm import backref, relationship, Session, remote, foreign
from sqlalchemy.types import *

from .. import game_pb2

from .base import Entity


class Actor(Entity):
  __tablename__ = "actors"

  id = sqlalchemy.Column(Integer, sqlalchemy.ForeignKey("entities.id"),
                         primary_key=True)

  name = sqlalchemy.Column(String, nullable=False, unique=True)
  health = sqlalchemy.Column(Integer, nullable=False, default=0)
  gender = sqlalchemy.Column(String, nullable=False)
  body = sqlalchemy.Column(String, nullable=False)
  facial = sqlalchemy.Column(String, nullable=True)
  hair = sqlalchemy.Column(String, nullable=True)

  head_item_id = sqlalchemy.Column(
      Integer,
      sqlalchemy.ForeignKey("items.id", use_alter=True,
                            name="actors_head_item_id"),
      nullable=True)
  head_item = relationship("Item", foreign_keys=[head_item_id])

  torso_item_id = sqlalchemy.Column(
      Integer,
      sqlalchemy.ForeignKey("items.id", use_alter=True,
                            name="actors_torso_item_id"),
      nullable=True)
  torso_item = relationship("Item", foreign_keys=[torso_item_id])

  legs_item_id = sqlalchemy.Column(
      Integer,
      sqlalchemy.ForeignKey("items.id", use_alter=True,
                            name="actors_legs_item_id"),
      nullable=True)
  legs_item = relationship("Item", foreign_keys=[legs_item_id])

  feet_item_id = sqlalchemy.Column(
      Integer,
      sqlalchemy.ForeignKey("items.id", use_alter=True,
                            name="actors_feet_item_id"),
      nullable=True)
  feet_item = relationship("Item", foreign_keys=[feet_item_id])

  BASE_SPEED = 5

  def get_speed(self):
    return self.BASE_SPEED

  def to_protobuf(self):
    protobuf = super().to_protobuf()
    message = game_pb2.Actor(name=self.name, health=self.health,
                             gender=self.gender, body=self.body,
                             inventory=[item.to_protobuf()
                                        for item in self.inventory])

    if self.facial is not None:
      message.facial = self.facial

    if self.hair is not None:
      message.hair = self.hair

    if self.head_item is not None:
      message.head_item.MergeFrom(self.head_item.to_protobuf())

    if self.torso_item is not None:
      message.torso_item.MergeFrom(self.torso_item.to_protobuf())

    if self.legs_item is not None:
      message.legs_item.MergeFrom(self.legs_item.to_protobuf())

    if self.feet_item is not None:
      message.feet_item.MergeFrom(self.feet_item.to_protobuf())

    protobuf.Extensions[game_pb2.Actor.actor_ext].MergeFrom(message)
    return protobuf

  __mapper_args__ = {
      "polymorphic_identity": "actor"
  }


class Player(Actor):
  __tablename__ = "players"

  id = sqlalchemy.Column(Integer, sqlalchemy.ForeignKey("actors.id"),
                         primary_key=True)

  online = sqlalchemy.Column(Boolean, nullable=False, default=False)

  @property
  def queue_name(self):
    return "players.{id}".format(id=self.id)

  __mapper_args__ = {
      "polymorphic_identity": "player"
  }
