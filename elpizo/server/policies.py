import logging

logger = logging.getLogger(__name__)


class UnauthenticatedPolicy(object):
  def get(self, origin, server):
    return None

  def finish(self, server):
    pass


class PlayerPolicy(object):
  def __init__(self, player):
    self.player = player

  def get(self, origin, server):
    return self.player

  def finish(self, server):
    self.player.save()
    logger.info("Flushing player %s to database.", self.player.id)
    server.bus.remove(self.player.id)


class NPCPolicy(object):
  def get(self, origin, server):
    return server.store.entities.load(origin)

  def finish(self, server):
    pass
