import asyncio
import coloredlogs
import logging
import yaml

from elpizo import server
from elpizo.models import entities
from elpizo.models import geometry
from elpizo.models import realm
from elpizo.models.items import equipment
from elpizo.util import green


def initdb(server):
  windvale = realm.Realm(name="Windvale", size=geometry.Vector2(128, 128))
  server.store.realms.save(windvale)

  for y in range(0, windvale.size.y, realm.Region.SIZE):
    for x in range(0, windvale.size.x, realm.Region.SIZE):
      region = realm.Region(
          realm_id=windvale.id, location=geometry.Vector2(x, y),
          passabilities=[0b1111] * (realm.Region.SIZE ** 2),
          layers=[realm.Layer(terrain="grassland",
                              tiles=[0] * (realm.Region.SIZE ** 2))],
          entities=set())
      windvale.regions.save(region)

  logging.info("Created Windvale.")

  valjean = entities.Player(name="Valjean", gender="male", body="light",
                            hair="brown_messy_1", facial="brown_beard",
                            direction=1, health=10, realm_id=windvale.id,
                            location=geometry.Vector2(0, 0),
                            inventory=[], legs_item=equipment.TealPants())
  server.store.entities.save(valjean)

  for region in valjean.regions:
    region.entities.add(valjean)
    region.save()

  logging.info("Created players.")


def main():
  coloredlogs.install()

  with open("elpizo.conf") as config_file:
    config = yaml.load(config_file)
  server.Server(config).once(initdb)


if __name__ == "__main__":
  main()
