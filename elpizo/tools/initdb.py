import logging
from lxml import etree
from itertools import product
import json
import random

from elpizo import make_application
from elpizo.models.actors import Player
from elpizo.models.base import Base, User, Entity, Building
from elpizo.models.realm import Realm, Region, RegionLayer
from elpizo.models.fixtures import Fixture, resource_sources
from elpizo.models.items import restorative, Drop
from elpizo.tools import mapgen


def initialize_schema(app):
  engine = app.sqla_factory().bind

  Base.metadata.drop_all(bind=engine)
  Base.metadata.create_all(bind=engine)
  logging.info("Initialized database schema.")


def initialize_realm(app):
  sqla = app.sqla_factory()

  realm = Realm(name="Windvale", aw=128, ah=128,
                terrain_layers=["Ocean", "Grassland"])
  sqla.add(realm)
  sqla.commit()

  logging.info("Created realm.")

  for ary in range(realm.ah // Region.SIZE):
    for arx in range(realm.aw // Region.SIZE):
      corners = []

      for rt in range(Region.SIZE + 1):
        for rs in range(Region.SIZE + 1):
          a_s = arx * Region.SIZE + rs
          a_t = ary * Region.SIZE + rt

          corner = 0xf
          if a_s == 0 and a_t == 0:
            corner = 0x2
          elif a_s == realm.aw and a_t == 0:
            corner = 0x1
          elif a_s == 0 and a_t == realm.ah:
            corner = 0x4
          elif a_s == realm.aw and a_t == realm.ah:
            corner = 0x8
          elif a_s == 0:
            corner = 0x6
          elif a_t == 0:
            corner = 0x3
          elif a_s == realm.aw:
            corner = 0x9
          elif a_t == realm.ah:
            corner = 0xc
          corners.append(corner)

      grass_layer = RegionLayer(terrain_index=1, corners=corners)

      platform_corners = []

      for rt in range(Region.SIZE + 1):
        for rs in range(Region.SIZE + 1):
          corner = 0xf

          if rs < 4 or rs >= 8 or rt < 4 or rt >= 8:
            corner = 0x0
          elif rs == 4 and rt == 4:
            corner = 0x2
          elif rs == 7 and rt == 4:
            corner = 0x1
          elif rs == 4 and rt == 7:
            corner = 0x4
          elif rs == 7 and rt == 7:
            corner = 0x8
          elif rs == 4:
            corner = 0x6
          elif rt == 4:
            corner = 0x3
          elif rs == 7:
            corner = 0x9
          elif rt == 7:
            corner = 0xc
          platform_corners.append(corner)

      platform_layer = RegionLayer(terrain_index=1, corners=platform_corners)

      region = Region(arx=arx, ary=ary, realm=realm,
                      layers=[grass_layer, platform_layer],
                      passabilities=[0b1111] * (16 * 16))
      sqla.add(region)

  sqla.commit()
  logging.info("Created realm regions.")
  return realm


def initialize_fixtures(app, realm):
  sqla = app.sqla_factory()

  Fixture.initialize_type_table(sqla)

  sqla.add(resource_sources.Tree(realm=realm, ax=7, ay=7))
  sqla.add(Drop(item=restorative.Carrot(), realm=realm, ax=1, ay=0))
  sqla.add(Building(realm=realm, ax=2, ay=2, a_width=5, a_height=5))
  sqla.commit()

  logging.info("Created fixtures.")


def initialize_players(app, realm):
  sqla = app.sqla_factory()

  victor_hugo = User(name="victor_hugo")
  sqla.add(victor_hugo)

  valjean = Player(name="Valjean", user=victor_hugo, gender="Male",
                   body="Light",
                   hair="BrownMessy1",
                   facial="BrownBeard",
                   direction=1,
                   health=10,
                   realm=realm, arx=0, ary=0, rx=0, ry=0)
  sqla.add(valjean)

  dumas = User(name="dumas")
  sqla.add(dumas)

  athos = Player(name="Athos", user=dumas, gender="Male",
                 body="Light",
                 direction=1,
                 health=10,
                 realm=realm, arx=0, ary=0, rx=0, ry=0)
  sqla.add(athos)

  aramis = Player(name="Aramis", user=dumas, gender="Male",
                  body="Light",
                  direction=1,
                  health=10,
                  realm=realm, arx=0, ary=0, rx=0, ry=0)
  sqla.add(aramis)

  porthos = Player(name="Porthos", user=dumas, gender="Male",
                   body="Light",
                   direction=1,
                   health=10,
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
