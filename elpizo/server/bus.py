import asyncio
import collections
import logging
import websockets.exceptions

from elpizo.util import green


logger = logging.getLogger(__name__)


class Bus(object):
  def __init__(self):
    self.protocols = {}
    self.channels = collections.defaultdict(set)
    self.subscriptions = {}

  def add(self, bus_key, protocol):
    logger.debug("Added key to bus: %d", bus_key)

    self.protocols[bus_key] = protocol
    self.subscriptions[bus_key] = set()

  def remove(self, bus_key):
    logger.debug("Removed key from bus: %d", bus_key)

    for channel in list(self.subscriptions[bus_key]):
      self.unsubscribe(bus_key, channel)

    del self.protocols[bus_key]
    del self.subscriptions[bus_key]

  def get(self, bus_key):
    return self.protocols[bus_key]

  def has(self, bus_key):
    return bus_key in self.protocols

  def send(self, bus_key, origin, message):
    try:
      protocol = self.get(bus_key)
    except KeyError:
      return
    else:
      protocol.send(origin, message)

  def subscribe(self, bus_key, channel):
    self.channels[channel].add(bus_key)
    self.subscriptions[bus_key].add(channel)

  def unsubscribe(self, bus_key, channel):
    self.channels[channel].remove(bus_key)
    self.subscriptions[bus_key].remove(channel)
