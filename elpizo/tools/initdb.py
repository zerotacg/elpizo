import asyncio
import coloredlogs
import logging
import yaml

from elpizo import server
from elpizo.models import entities
from elpizo.models import geometry
from elpizo.util import green


def initdb(server):
  loop = asyncio.get_event_loop()

  player = entities.Player(name="Valjean", gender="male", body="light",
                           hair="brown_messy_1", facial="brown_beard",
                           direction=1, health=10, realm_id=1,
                           location=geometry.Vector2(0, 0),
                           bbox=geometry.Rectangle(0, 0, 1, 1),
                           inventory=[])
  player.save(server.store.entities.kvs)

  loop.close()


def main():
  coloredlogs.install()

  with open("elpizo.conf") as config_file:
    config = yaml.load(config_file)

  s = server.Server(config)

  loop = asyncio.get_event_loop()
  loop.run_until_complete(s.run())
  loop.call_soon_threadsafe(green.coroutine(initdb), s)

  try:
    loop.run_forever()
  finally:
    s.on_close()
    loop.close()


if __name__ == "__main__":
  main()
