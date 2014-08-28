import asyncio
import logging

from elpizo import server
from elpizo.models import entities
from elpizo.models import geometry
from elpizo.models import realm
from elpizo.models.items import equipment
from elpizo.models.items import restorative
from elpizo.models.items import weapons
from elpizo.models.npcs import slime
from elpizo.util import green


def initdb(app):
  app.store.lock()
  try:
    input("This will DELETE ALL DATA from the database! Press ENTER to "
          "continue, or Ctrl+C to abort. ")
  except KeyboardInterrupt:
    app.store.unlock()
    return

  green.await_coro(app.store.redis.flushdb())

  app.store.lock()

  windvale = realm.Realm(name="Windvale", size=geometry.Vector2(128, 128))
  app.store.realms.create(windvale)

  for base_y in range(0, windvale.size.y, realm.Region.SIZE):
    for base_x in range(0, windvale.size.x, realm.Region.SIZE):
      tiles = []

      for offset_y in range(realm.Region.SIZE):
        for offset_x in range(realm.Region.SIZE):
          x = base_x + offset_x
          y = base_y + offset_y

          if x == 0 and y == 0:
            tile = 34
          elif x == 0 and y == windvale.size.y - 1:
            tile = 40
          elif x == windvale.size.x - 1 and y == 0:
            tile = 36
          elif x == windvale.size.x - 1 and y == windvale.size.y - 1:
            tile = 38
          elif x == 0:
            tile = 16
          elif x == windvale.size.x - 1:
            tile = 24
          elif y == 0:
            tile = 20
          elif y == windvale.size.y - 1:
            tile = 28
          else:
            tile = 0

          tiles.append(tile)

      platform_tiles = [-1] * (realm.Region.SIZE * realm.Region.SIZE)
      platform_tiles[4 + 4 * realm.Region.SIZE] = 34
      platform_tiles[5 + 4 * realm.Region.SIZE] = 20
      platform_tiles[6 + 4 * realm.Region.SIZE] = 36
      platform_tiles[4 + 5 * realm.Region.SIZE] = 16
      platform_tiles[5 + 5 * realm.Region.SIZE] = 0
      platform_tiles[6 + 5 * realm.Region.SIZE] = 24
      platform_tiles[4 + 6 * realm.Region.SIZE] = 40
      platform_tiles[5 + 6 * realm.Region.SIZE] = 28
      platform_tiles[6 + 6 * realm.Region.SIZE] = 38

      wall_tiles = [-1] * (realm.Region.SIZE * realm.Region.SIZE)
      wall_tiles[4 + 7 * realm.Region.SIZE] = 46
      wall_tiles[6 + 7 * realm.Region.SIZE] = 46

      stairs_tiles = [-1] * (realm.Region.SIZE * realm.Region.SIZE)
      stairs_tiles[5 + 7 * realm.Region.SIZE] = 47

      passabilities = [0b1111] * (realm.Region.SIZE * realm.Region.SIZE)
      passabilities[4 + 3 * realm.Region.SIZE] = 0b1110
      passabilities[5 + 3 * realm.Region.SIZE] = 0b1110
      passabilities[6 + 3 * realm.Region.SIZE] = 0b1110
      passabilities[3 + 4 * realm.Region.SIZE] = 0b1101
      passabilities[4 + 4 * realm.Region.SIZE] = 0b0011
      passabilities[5 + 4 * realm.Region.SIZE] = 0b1011
      passabilities[6 + 4 * realm.Region.SIZE] = 0b1001
      passabilities[7 + 4 * realm.Region.SIZE] = 0b0111
      passabilities[3 + 5 * realm.Region.SIZE] = 0b1101
      passabilities[4 + 5 * realm.Region.SIZE] = 0b0111
      passabilities[6 + 5 * realm.Region.SIZE] = 0b1101
      passabilities[7 + 5 * realm.Region.SIZE] = 0b0111
      passabilities[3 + 6 * realm.Region.SIZE] = 0b1101
      passabilities[4 + 6 * realm.Region.SIZE] = 0b0110
      passabilities[6 + 6 * realm.Region.SIZE] = 0b1100
      passabilities[7 + 6 * realm.Region.SIZE] = 0b0111
      passabilities[4 + 7 * realm.Region.SIZE] = 0b0000
      passabilities[6 + 7 * realm.Region.SIZE] = 0b0000

      region = realm.Region(
          realm_id=windvale.id, location=geometry.Vector2(base_x, base_y),
          passabilities=passabilities,
          layers=[realm.Layer(terrain="grassland", tiles=tiles),
                  realm.Layer(terrain="dirt", tiles=platform_tiles),
                  realm.Layer(terrain="grassland", tiles=platform_tiles),
                  realm.Layer(terrain="dirt_wall", tiles=wall_tiles),
                  realm.Layer(terrain="stairs", tiles=stairs_tiles)],
          entities=set())
      windvale.regions.create(region)

  logging.info("Created Windvale.")

  app.store.entities.create(entities.Player(
      name="Valjean",
      gender="male",
      body="light",
      hair="brown_messy_1",
      facial="brown_beard",
      direction=1,
      health=10,
      realm_id=windvale.id,
      location=geometry.Vector2(0, 0),
      inventory=[],
      torso_item=equipment.WhiteLongsleeveShirt(),
      legs_item=equipment.TealPants(),
      feet_item=equipment.BrownShoes(),
      weapon=equipment.Dagger()))

  app.store.entities.create(entities.Player(
      name="Marius",
      gender="male",
      body="light",
      hair="brown_messy_1",
      direction=1,
      health=10,
      realm_id=windvale.id,
      location=geometry.Vector2(0, 16),
      inventory=[],
      legs_item=equipment.TealPants()))

  app.store.entities.create(entities.Player(
      name="Courfeyrac",
      gender="male",
      body="light",
      hair="brown_messy_1",
      direction=1,
      health=10,
      realm_id=windvale.id,
      location=geometry.Vector2(16, 16),
      inventory=[],
      legs_item=equipment.TealPants()))

  app.store.entities.create(entities.Player(
      name="Enjolras",
      gender="male",
      body="light",
      hair="brown_messy_1",
      direction=1,
      health=10,
      realm_id=windvale.id,
      location=geometry.Vector2(12, 16),
      inventory=[],
      legs_item=equipment.TealPants()))

  app.store.entities.create(slime.GreenSlime(
      name="Green Slime",
      direction=1,
      health=5,
      realm_id=windvale.id,
      location=geometry.Vector2(0, 2),
      inventory=[restorative.Carrot()]))

  logging.info("Created players.")


def main():
  server.Application(server.make_config_parser().parse_args()).once(initdb)


if __name__ == "__main__":
  main()
