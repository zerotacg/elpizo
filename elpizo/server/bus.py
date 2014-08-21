import logging

logger = logging.getLogger(__name__)


class Bus(object):
  def __init__(self):
    self.protocols = {}

  def add(self, id, protocol):
    logger.debug("Added ID to bus: %d", id)
    self.protocols[id] = protocol

  def remove(self, id):
    logger.debug("Removed ID from bus: %d", id)
    protocol = self.protocols[id]
    protocol.transport.close()
    del self.protocols[id]

  def get(self, id):
    return self.protocols[id]

  def has(self, id):
    return id in self.protocols
