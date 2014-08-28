import asyncio
import collections
import logging
import websockets.exceptions

from elpizo.util import green


logger = logging.getLogger(__name__)


def prefixes(path):
  current = ()
  yield current

  for part in path:
    current += (part,)
    yield current


class Bus(object):
  def __init__(self):
    self.protocols = {}
    self.broadcast_locks = {}
    self.channels = collections.defaultdict(set)
    self.subscriptions = {}

  def add(self, bus_key, protocol):
    logger.debug("Added key to bus: %d", bus_key)

    self.protocols[bus_key] = protocol
    self.broadcast_locks[bus_key] = collections.defaultdict(asyncio.Lock)
    self.subscriptions[bus_key] = set()

  def remove(self, bus_key):
    logger.debug("Removed key from bus: %d", bus_key)

    for channel in list(self.subscriptions[bus_key]):
      self.unsubscribe(bus_key, channel)

    del self.protocols[bus_key]
    del self.broadcast_locks[bus_key]
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

  def broadcast_lock_for(self, bus_key, channel):
    return self.broadcast_locks[bus_key][channel]

  def _send_to_channel(self, bus_key, channel, origin, message):
    try:
      protocol = self.get(bus_key)
    except KeyError:
      # A client disappeared while we were iterating.
      logger.warn("Client disappeared during broadcast: %d", bus_key)
      return

    # BEGIN CRITICAL SECTION: Acquire the broadcast lock, in case someone
    # wants to run code post-subscribe.
    with green.locking(self.broadcast_lock_for(bus_key, channel)):
      try:
        protocol.send(origin, message)
      except websockets.exceptions.InvalidState:
        logger.warn("Client transport closed during broadcast: %d", bus_key)
        return
    # END CRITICAL SECTION

  def broadcast(self, route, origin, message, *, exclude_origin=True):
    futures = []

    for channel in prefixes(route):
      for bus_key in list(self.channels.get(channel, set())):
        if bus_key == origin and exclude_origin:
          continue
        futures.append(green.coroutine(self._send_to_channel)(
            bus_key, channel, origin, message))

    return asyncio.gather(*futures)
