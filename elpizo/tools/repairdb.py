import logging

from elpizo import server
from elpizo.server import store
from elpizo.util import green


def repair(app):
  input("Please MAKE SURE that no other instances of the server are running. "
        "Proceeding will BREAK THE LOCK! Press ENTER to continue or Ctrl+C "
        "to abort. ")

  app.store.unlock()
  app.store.lock()


def main():
  server.Application(server.make_config_parser().parse_args()).once(repair)


if __name__ == "__main__":
  main()
