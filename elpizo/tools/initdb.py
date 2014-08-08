import logging
from lxml import etree
from itertools import product
import json

from elpizo import make_application
from elpizo.models.base import Base, User
from elpizo.models.entities import Entity, Player
from elpizo.models.realm import Realm, Region, Terrain
from elpizo.models.fixtures import Fixture, Tree
from elpizo.tools import mapgen


def initialize_schema(app):
  engine = app.sqla_factory().bind

  Base.metadata.drop_all(bind=engine)
  Base.metadata.create_all(bind=engine)
  logging.info("Initialized database schema.")


def initialize_realm(app):
  sqla = app.sqla_factory()

  realm = Realm(name="Windvale", aw=128, ah=128)
  sqla.add(realm)

  ocean = Terrain(name="ocean", passable=False)
  sqla.add(ocean)

  grassland = Terrain(name="grassland", passable=True)
  sqla.add(grassland)

  sqla.commit()

  logging.info("Created realm.")

  for ary in range(realm.ah // Region.SIZE):
    for arx in range(realm.aw // Region.SIZE):
      region = Region(arx=arx, ary=ary, realm=realm,
                      corners=[grassland.id] * ((16 + 1) * (16 + 1)))
      region.corners[3 * 17 + 1] = ocean.id
      region.corners[3 * 17 + 2] = ocean.id
      region.corners[4 * 17 + 1] = ocean.id
      region.corners[4 * 17 + 2] = ocean.id
      sqla.add(region)

  sqla.commit()
  logging.info("Created realm regions.")
  return realm


def initialize_fixtures(app, realm):
  sqla = app.sqla_factory()

  Fixture.initialize_type_table(sqla)

  sqla.add(Tree(realm=realm, ax=7, ay=7))
  sqla.commit()

  logging.info("Created fixtures.")


def initialize_players(app, realm):
  sqla = app.sqla_factory()

  victor_hugo = User(name="victor_hugo")
  sqla.add(victor_hugo)

  valjean = Player(name="Valjean", level=1, user=victor_hugo,
                   body="male.light",
                   facial="beard.brown",
                   direction=1,
                   hp=100, mp=100, xp=100,
                   realm=realm, arx=0, ary=0, rx=0, ry=0)
  sqla.add(valjean)

  dumas = User(name="dumas")
  sqla.add(dumas)

  athos = Player(name="Athos", level=1, user=dumas,
                 body="male.light",
                 direction=1,
                 hp=100, mp=100, xp=10,
                 realm=realm, arx=0, ary=0, rx=0, ry=0)
  sqla.add(athos)

  aramis = Player(name="Aramis", level=1, user=dumas,
                  body="male.light",
                  direction=1,
                  hp=100, mp=100, xp=10,
                  realm=realm, arx=0, ary=0, rx=0, ry=0)
  sqla.add(aramis)

  porthos = Player(name="Porthos", level=1, user=dumas,
                   body="male.light",
                   direction=1,
                   hp=100, mp=100, xp=10,
                   realm=realm, arx=0, ary=0, rx=0, ry=0)
  sqla.add(porthos)

  sqla.commit()

  logging.info("Created test users.")


def main():
  app = make_application()

  input("This will DELETE ALL DATA! Press ENTER to continue or CTRL+C to abort. ")

  initialize_schema(app)
  realm = initialize_realm(app)
  initialize_fixtures(app, realm)
  initialize_players(app, realm)


if __name__ == "__main__":
  main()
