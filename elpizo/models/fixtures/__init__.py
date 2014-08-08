import sqlalchemy

from sqlalchemy import func, inspect, event
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext import hybrid
from sqlalchemy.ext.declarative import declarative_base, declared_attr
from sqlalchemy.orm import backref, relationship, remote, foreign
from sqlalchemy.types import *

from ... import game_pb2
from .. import Base, basic_primary_key
from ..base import Entity


class FixtureType(Base):
  __tablename__ = "fixture_types"

  id = basic_primary_key()
  name = sqlalchemy.Column(String, nullable=False, unique=True)
  a_left = sqlalchemy.Column(Integer, nullable=False)
  a_top = sqlalchemy.Column(Integer, nullable=False)
  a_right = sqlalchemy.Column(Integer, nullable=False)
  a_bottom = sqlalchemy.Column(Integer, nullable=False)

  def to_js(self):
    return {
        "name": self.name,
        "size": {
            "aLeft": self.a_left,
            "aTop": self.a_top,
            "aRight": self.a_right,
            "aBottom": self.a_bottom
        }
    }

  @hybrid.hybrid_property
  def bbox(self):
    return func.box(func.point(self.a_left, self.a_top),
                    func.point(self.a_right - 1, self.a_bottom - 1))

FixtureType.__table_args__ = (
    sqlalchemy.Index("ix_fixture_types_bbox", FixtureType.bbox,
                     postgresql_using="gist"),
)


class Fixture(Entity):
  __tablename__ = "fixtures"

  id = sqlalchemy.Column(Integer, sqlalchemy.ForeignKey("entities.id"),
                         primary_key=True)
  fixture_type_id = sqlalchemy.Column(Integer,
                                      sqlalchemy.ForeignKey("fixture_types.id"),
                                      nullable=False)
  fixture_type = relationship("FixtureType")

  @declared_attr
  def __mapper_args__(cls):
    return {
        "polymorphic_identity": ".".join(["Fixture", cls.__name__])
    }

  def to_protobuf(self):
    protobuf = super().to_protobuf()
    protobuf.type = Fixture.__name__

    message = game_pb2.Fixture(fixture_type_id=self.fixture_type_id)
    protobuf.Extensions[game_pb2.Fixture.fixture_ext].MergeFrom(message)

    return protobuf

  @hybrid.hybrid_method
  def bbox_contains(self, realm_id, ax, ay):
    offset = func.point(self.ax, self.ay)
    point = func.point(ax, ay)

    return (self.realm_id == realm_id) & \
        (self.fixture_type.bbox).op("@>")(point - offset)

  @bbox_contains.expression
  def bbox_contains(cls, realm_id, ax, ay):
    offset = func.point(cls.ax, cls.ay)
    point = func.point(ax, ay)

    return (cls.realm_id == realm_id) & \
        (FixtureType.id == cls.fixture_type_id) & \
        (FixtureType.bbox).op("@>")(point - offset)

  @classmethod
  def initialize_type_table(cls, sqla):
    for subclass in Fixture.__subclasses__():
      a_left, a_top, a_right, a_bottom = subclass.BBOX

      sqla.add(FixtureType(name=subclass.__name__,
                           a_left=a_left, a_top=a_top,
                           a_right=a_right, a_bottom=a_bottom))
    sqla.commit()

  @classmethod
  def get_class_fixture_type(cls, sqla):
    return sqla.query(FixtureType) \
        .filter(FixtureType.name == cls.__name__).one()


@event.listens_for(Fixture, "before_insert", propagate=True)
def set_fixture_type_id(mapper, connection, target):
  target.fixture_type_id = \
      target.get_class_fixture_type(inspect(target).session).id
