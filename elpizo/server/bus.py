import collections
import logging

logger = logging.getLogger(__name__)


class Bus(object):
  def __init__(self):
    self.protocols = {}
    self.channels = collections.defaultdict(set)
    self.subscriptions = collections.defaultdict(set)

  def add(self, id, protocol):
    logger.debug("Added ID to bus: %d", id)
    self.protocols[id] = protocol

  def remove(self, id):
    logger.debug("Removed ID from bus: %d", id)

    for channel in list(self.subscriptions[id]):
      self.unsubscribe(id, channel)

    del self.protocols[id]
    del self.subscriptions[id]

  def get(self, id):
    return self.protocols[id]

  def has(self, id):
    return id in self.protocols

  def subscribe(self, id, channel):
    self.channels[channel].add(id)
    self.subscriptions[id].add(channel)

  def unsubscribe(self, id, channel):
    self.channels[channel].remove(id)
    self.subscriptions[id].remove(channel)

  def broadcast(self, channel, origin, message):
    for id in self.channels[channel]:
      if id == origin:
        continue
      self.get(id).send(origin, message)
