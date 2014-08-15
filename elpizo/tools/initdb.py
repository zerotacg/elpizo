import logging
from lxml import etree
from itertools import product
import json
import random

from elpizo import make_application
from elpizo.models.actors import Player
from elpizo.models.base import Base, User, Entity, Building
from elpizo.models.realm import Realm, Region, RegionLayer, Terrain
from elpizo.models.fixtures import Fixture, resource_sources
from elpizo.models.items import restorative, equipment, Drop
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
  sqla.commit()

  ocean = Terrain(name="Ocean")
  sqla.add(ocean)

  grassland = Terrain(name="Grassland")
  sqla.add(grassland)

  grassland_wall = Terrain(name="GrasslandWall")
  sqla.add(grassland_wall)

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
      grass_layer = RegionLayer(terrain=grassland, corners=corners)

      platform_corners = [0x0] * (17 * 17)
      platform_corners[4 + 4 * (Region.SIZE + 1)] = 0x2
      platform_corners[5 + 4 * (Region.SIZE + 1)] = 0x3
      platform_corners[6 + 4 * (Region.SIZE + 1)] = 0x3
      platform_corners[7 + 4 * (Region.SIZE + 1)] = 0x1

      platform_corners[4 + 5 * (Region.SIZE + 1)] = 0x6
      platform_corners[5 + 5 * (Region.SIZE + 1)] = 0xf
      platform_corners[6 + 5 * (Region.SIZE + 1)] = 0xf
      platform_corners[7 + 5 * (Region.SIZE + 1)] = 0x9

      platform_corners[4 + 6 * (Region.SIZE + 1)] = 0x6
      platform_corners[5 + 6 * (Region.SIZE + 1)] = 0xf
      platform_corners[6 + 6 * (Region.SIZE + 1)] = 0xf
      platform_corners[7 + 6 * (Region.SIZE + 1)] = 0x9

      platform_corners[4 + 7 * (Region.SIZE + 1)] = 0x4
      platform_corners[5 + 7 * (Region.SIZE + 1)] = 0xe
      platform_corners[6 + 7 * (Region.SIZE + 1)] = 0xd
      platform_corners[7 + 7 * (Region.SIZE + 1)] = 0x8

      platform_corners[5 + 8 * (Region.SIZE + 1)] = 0x6
      platform_corners[6 + 8 * (Region.SIZE + 1)] = 0x9

      platform_layer = RegionLayer(terrain=grassland, corners=platform_corners)

      wall_corners = [0x0] * (17 * 17)
      wall_corners[4 + 7 * (Region.SIZE + 1)] = 0x2
      wall_corners[4 + 8 * (Region.SIZE + 1)] = 0x4
      wall_corners[5 + 7 * (Region.SIZE + 1)] = 0x1
      wall_corners[5 + 8 * (Region.SIZE + 1)] = 0x8

      wall_corners[6 + 7 * (Region.SIZE + 1)] = 0x2
      wall_corners[6 + 8 * (Region.SIZE + 1)] = 0x4
      wall_corners[7 + 7 * (Region.SIZE + 1)] = 0x1
      wall_corners[7 + 8 * (Region.SIZE + 1)] = 0x8
      wall_layer = RegionLayer(terrain=grassland_wall, corners=wall_corners)

      passabilities = [0b1111] * (16 * 16)

      passabilities[4 + 3 * Region.SIZE] = 0b1110
      passabilities[5 + 3 * Region.SIZE] = 0b1110
      passabilities[6 + 3 * Region.SIZE] = 0b1110

      passabilities[3 + 4 * Region.SIZE] = 0b1101
      passabilities[4 + 4 * Region.SIZE] = 0b0011
      passabilities[5 + 4 * Region.SIZE] = 0b1011
      passabilities[6 + 4 * Region.SIZE] = 0b1001
      passabilities[7 + 4 * Region.SIZE] = 0b0111

      passabilities[3 + 5 * Region.SIZE] = 0b1101
      passabilities[4 + 5 * Region.SIZE] = 0b0111
      passabilities[6 + 5 * Region.SIZE] = 0b1101
      passabilities[7 + 5 * Region.SIZE] = 0b0111

      passabilities[3 + 6 * Region.SIZE] = 0b1101
      passabilities[4 + 6 * Region.SIZE] = 0b0110
      passabilities[6 + 6 * Region.SIZE] = 0b1100
      passabilities[7 + 6 * Region.SIZE] = 0b0111

      passabilities[4 + 7 * Region.SIZE] = 0b0000
      passabilities[6 + 7 * Region.SIZE] = 0b0000

      region = Region(arx=arx, ary=ary, realm=realm,
                      layers=[grass_layer, platform_layer, wall_layer],
                      passabilities=passabilities)
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

  white_longsleeve_shirt = equipment.WhiteLongsleeveShirt()
  teal_pants = equipment.TealPants()
  brown_shoes = equipment.BrownShoes()

  valjean = Player(name="Valjean", user=victor_hugo, gender="Male",
                   body="Light",
                   hair="BrownMessy1",
                   facial="BrownBeard",
                   direction=1,
                   health=10,
                   realm=realm, arx=0, ary=0, rx=0, ry=0,
                   inventory=[teal_pants, white_longsleeve_shirt, brown_shoes])
  sqla.add(valjean)
  sqla.flush()

  valjean.torso_item = white_longsleeve_shirt
  valjean.legs_item = teal_pants
  valjean.feet_item = brown_shoes
  sqla.commit()

  dumas = User(name="dumas")
  sqla.add(dumas)

  athos = Player(name="Athos", user=dumas, gender="Male",
                 body="Light",
                 direction=1,
                 health=10,
                 realm=realm, arx=0, ary=0, rx=0, ry=0,)
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
