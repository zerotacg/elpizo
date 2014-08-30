import logging

from elpizo import server
from elpizo.server import store
from elpizo.util import green


logger = logging.getLogger(__name__)


def repair(app):
  input("Please MAKE SURE that no other instances of the server are running. "
        "Proceeding will BREAK THE LOCK! Press ENTER to continue or Ctrl+C "
        "to abort. ")

  app.store.unlock()
  app.store.lock()

  for realm in app.store.realms.load_all():
    logger.info("Checking realm %s.", realm.id)
    for region in realm.regions.load_all():
      for entity in list(region.entities):
        if not entity.bounds.intersects(region.bounds):
          logger.warn(
              "Region %r bounds entity %s, but entity's bounds are %r. " +
              "Unlinking entity from region.",
              region.location, entity.id, entity.bounds)
          region.entities.remove(entity)


def main():
  server.Application(server.make_config_parser().parse_args()).once(repair)


if __name__ == "__main__":
  main()
