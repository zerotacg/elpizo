import asyncio
import logging
import uuid

from elpizo import client
from elpizo.client.npc_server import behaviors
from elpizo.client.npc_server import handlers
from elpizo.client.npc_server import store
from elpizo.client.npc_server.behaviors import registry
from elpizo.util import green

registry.initialize()


logger = logging.getLogger(__name__)


def make_config_parser(*args, **kwargs):
  parser = client.make_config_parser(*args, **kwargs)
  parser.add_argument("--id", action="store", default=None,
                      help="The ID of the server.")
  return parser


class NPCServer(client.Client):
  def on_start(self):
    logger.info("Behaviors registered: %d", len(behaviors.Behavior.REGISTRY))

    self.store = store.Store()

    self.npcs = {}

    if self.config.id is None:
      self.id = uuid.uuid4().hex
      logger.warn("ID not specified in config, generated ID %s.", self.id)
    else:
      self.id = self.config.id

    logger.info("I am NPC server %s.", self.id)
    super().on_start()

  def make_protocol(self, transport):
    return handlers.Dispatcher(self, transport)

  def start_behavior(self, behavior):
    logger.info("Starting behavior for NPC %s.", behavior.npc.id)
    self.npcs[behavior.npc.id] = behavior
    asyncio.async(green.coroutine(behavior.run)(), loop=self.loop)

  def stop_npc(self, npc):
    logger.info("Stopping behavior for NPC %s.", npc.id)
    behavior = self.npcs.pop(npc.id)
    behavior.stop()


def main():
  NPCServer(make_config_parser().parse_args()).run()


if __name__ == "__main__":
  main()
