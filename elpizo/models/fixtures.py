import sqlalchemy

from sqlalchemy import func, inspect
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext import hybrid
from sqlalchemy.ext.declarative import declarative_base, declared_attr
from sqlalchemy.orm import backref, relationship, Session, remote, foreign
from sqlalchemy.types import *

from .. import game_pb2

from .entities import Entity


class Fixture(Entity):
  NAME = "unknown"

  @declared_attr
  def __mapper_args__(cls):
    return {
        "polymorphic_identity": ".".join(["fixtures", cls.NAME])
    }

  def to_protobuf(self):
    protobuf = super().to_protobuf()
    protobuf.type = "fixtures"

    _, type = self.type.split(".")
    message = game_pb2.Fixture(fixture_type=type)

    protobuf.Extensions[game_pb2.Fixture.fixture_ext].MergeFrom(message)
    return protobuf

  @classmethod
  def to_js(cls):
    aw, ah = cls.SIZE

    return {
        "name": cls.NAME,
        "size": {
            "aw": aw,
            "ah": ah
        }
    }

class Tree(Fixture):
  NAME = "tree"
  SIZE = (1, 1)
