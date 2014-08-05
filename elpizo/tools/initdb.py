import logging
from lxml import etree
from itertools import product
import json
import sys

from elpizo import make_application
from elpizo.models import Base, User, Player, Realm, Region, Entity, Terrain, EntityType
from elpizo.tools import mapgen


def initialize_schema(app):
  engine = app.sqla.bind

  Base.metadata.drop_all(bind=engine)
  Base.metadata.create_all(bind=engine)
  logging.info("Initialized database schema.")


def initialize_realm(app):
  realm = Realm(name="Windvale", aw=128, ah=128)
  app.sqla.add(realm)

  ocean = Terrain(name="ocean")
  app.sqla.add(ocean)
  app.sqla.commit()

  logging.info("Created realm.")

  for ary in range(realm.ah // Region.SIZE):
    for arx in range(realm.aw // Region.SIZE):
      region = Region(arx=arx, ary=ary, realm=realm,
                      corners=[ocean.id] * ((realm.ah + 1) * (realm.aw + 1)))
      app.sqla.add(region)

  app.sqla.commit()
  logging.info("Created realm regions.")
  return realm


def initialize_entity_types(app):
  for name in [
      "fixture.tree.oak",
      "body.male.light",
      "facial.beard.brown",
      "hair.messy1.brown",
      "torso.shirt.white_longsleeve_male",
      "legs.pants.teal_pants_male",
      "feet.shoes.brown_shoes_male"
  ]:
    type = EntityType(name=name)
    app.sqla.add(type)

  app.sqla.commit()
  logging.info("Created entity types.")

  return {type.name: type.id for type in app.sqla.query(EntityType)}

def initialize_players(app, types, realm):
  victor_hugo = User(name="victor_hugo")
  app.sqla.add(victor_hugo)

  valjean = Player(user=victor_hugo,
                   entity=Entity(name="Valjean", level=1,
                                 types=[types["body.male.light"],
                                        types["facial.beard.brown"],
                                        types["hair.messy1.brown"]],
                                 direction=1,
                                 hp=100, mp=100, xp=100,
                                 realm=realm, arx=0, ary=0, rx=0, ry=0))
  app.sqla.add(valjean)

  dumas = User(name="dumas")
  app.sqla.add(dumas)

  athos = Player(user=dumas,
                 entity=Entity(name="Athos", level=1,
                               types=[types["body.male.light"],
                                      types["facial.beard.brown"],
                                      types["hair.messy1.brown"]],
                               direction=1,
                               hp=100, mp=100, xp=10,
                               realm=realm, arx=0, ary=0, rx=0, ry=0))
  app.sqla.add(athos)

  aramis = Player(user=dumas,
                  entity=Entity(name="Aramis", level=1,
                                types=[types["body.male.light"],
                                       types["facial.beard.brown"],
                                       types["hair.messy1.brown"]],
                                direction=1,
                                hp=100, mp=100, xp=10,
                                realm=realm, arx=0, ary=0, rx=0, ry=0))
  app.sqla.add(aramis)

  porthos = Player(user=dumas,
                   entity=Entity(name="Porthos", level=1,
                                 types=[types["body.male.light"],
                                        types["facial.beard.brown"],
                                        types["hair.messy1.brown"]],
                                 direction=1,
                                 hp=100, mp=100, xp=10,
                                 realm=realm, arx=0, ary=0, rx=0, ry=0))
  app.sqla.add(porthos)

  app.sqla.commit()

  logging.info("Created test users.")


def main():
  if len(sys.argv) != 2:
    sys.stderr.write("usage: {} <mapgen2 xml>\n".format(sys.argv[0]))
    sys.exit(1)

  app = make_application()

  input("This will DELETE ALL DATA! Press ENTER to continue or CTRL+C to abort. ")

  initialize_schema(app)
  realm = initialize_realm(app)
  types = initialize_entity_types(app)
  initialize_players(app, types, realm)


if __name__ == "__main__":
  main()
