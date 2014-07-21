import logging
from lxml import etree
from io import StringIO
from itertools import product
import json
import sys

from elpizo import make_application
from elpizo.models import Base, User, Player, Realm, MapTile, Terrain, Creature, CreatureKind
from elpizo.tools import mapgen


def initialize_schema(app):
  engine = app.sqla_session.bind

  Base.metadata.drop_all(bind=engine)
  Base.metadata.create_all(bind=engine)
  logging.info("Initialized database schema.")


def initialize_terrains(app):
  terrains = {}
  for terrain_id, _ in mapgen.TERRAIN_NAMES.items():
    terrain = Terrain(name=terrain_id)
    app.sqla_session.add(terrain)
    terrains[terrain_id] = terrain
  app.sqla_session.commit()

  logging.info("Initialized terrain types.")


def initialize_realm(app):
  engine = app.sqla_session.bind

  SIZE = 600
  ZOOM_FACTOR = 1.0

  REALM_SIZE = int(SIZE * ZOOM_FACTOR - 1)

  realm = Realm(name="Windvale",
                width=REALM_SIZE, height=REALM_SIZE)
  app.sqla_session.add(realm)
  app.sqla_session.commit()

  img = mapgen.make_map_image(etree.parse(sys.argv[1]), SIZE, ZOOM_FACTOR)
  raw_corners = list(mapgen.map_image_to_json(img))
  logging.info("Map generation complete.")

  conn = engine.raw_connection()

  terrains = {}
  for terrain in app.sqla_session.query(Terrain):
    terrains[terrain.name] = terrain.id

  corners = [
      (realm.id, s, t, terrains[raw_corners[t * (REALM_SIZE + 1) + s]])
      for s, t in product(range(REALM_SIZE + 1), range(REALM_SIZE + 1))
  ]
  cur = conn.cursor()
  cur.copy_from(
      StringIO("\n".join(["\t".join(str(col) for col in line)
                          for line in corners])), "map_corners",
      columns=("realm_id", "s", "t", "terrain_id"))
  logging.info("Created Windvale map corners.")

  tiles = [
      (realm.id, x, y)
      for x, y in product(range(REALM_SIZE), range(REALM_SIZE))
  ]
  cur = conn.cursor()
  cur.copy_from(
      StringIO("\n".join(["\t".join(str(col) for col in line)
                          for line in tiles])), "map_tiles",
      columns=("realm_id", "x", "y"))
  logging.info("Created Windvale map tiles.")

  conn.commit()

  logging.info("Populated Windvale.")
  return realm


def initialize_creature_kinds(app):
  for kind in ["human", "cow"]:
    creature_kind = CreatureKind(name=kind)
    app.sqla_session.add(creature_kind)
  app.sqla_session.commit()

  logging.info("Created creature kinds.")


def initialize_players(app, realm):
  tile = app.sqla_session.query(MapTile) \
      .filter(MapTile.realm == realm, MapTile.x == 0, MapTile.y == 0) \
      .one()

  human = app.sqla_session.query(CreatureKind) \
      .filter(CreatureKind.name == "human") \
      .one()

  victor_hugo = User(name="victor_hugo")
  app.sqla_session.add(victor_hugo)

  valjean = Player(user=victor_hugo,
                   creature=Creature(name="Valjean", map_tile=tile,
                                     creature_kind=human))
  app.sqla_session.add(valjean)

  dumas = User(name="dumas")
  app.sqla_session.add(dumas)

  athos = Player(user=dumas,
                 creature=Creature(name="Athos", map_tile=tile,
                                   creature_kind=human))
  app.sqla_session.add(athos)

  aramis = Player(user=dumas,
                  creature=Creature(name="Aramis", map_tile=tile,
                                    creature_kind=human))
  app.sqla_session.add(aramis)

  porthos = Player(user=dumas,
                   creature=Creature(name="Porthos", map_tile=tile,
                                     creature_kind=human))
  app.sqla_session.add(porthos)

  app.sqla_session.commit()

  logging.info("Created test users.")


def main():
  if len(sys.argv) != 2:
    sys.stderr.write("usage: {} <mapgen2 xml>\n".format(sys.argv[0]))
    sys.exit(1)

  app = make_application()

  input("This will DELETE ALL DATA! Press ENTER to continue or CTRL+C to abort. ")

  initialize_schema(app)
  initialize_terrains(app)
  realm = initialize_realm(app)
  initialize_creature_kinds(app)
  initialize_players(app, realm)


if __name__ == "__main__":
  main()
