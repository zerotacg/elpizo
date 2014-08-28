import logging
import uuid

from elpizo import client
from elpizo.client.npc_server import handlers


logger = logging.getLogger(__name__)


def make_config_parser(*args, **kwargs):
  parser = client.make_config_parser(*args, **kwargs)
  parser.add_argument("--id", action="store", default=None,
                      help="The ID of the server.")
  return parser


class NPCServer(client.Client):
  def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)

  def on_start(self):
    self.realms = {}

    if self.config.id is None:
      self.id = uuid.uuid4().hex
      logger.warn("ID not specified in config, generated ID %s.", self.id)
    else:
      self.id = self.config.id

    logger.info("Hello, I am NPC server %s.", self.id)
    super().on_start()


  def make_protocol(self, transport):
    return handlers.Dispatcher(self, transport)


def main():
  NPCServer(make_config_parser().parse_args()).run()


if __name__ == "__main__":
  main()
