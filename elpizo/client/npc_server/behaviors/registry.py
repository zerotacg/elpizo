from elpizo.client.npc_server import behaviors
from elpizo.client.npc_server.behaviors import mob


def initialize():
  behaviors.Behavior.register(mob.Pursue)
