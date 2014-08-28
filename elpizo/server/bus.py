import asyncio
import collections
import logging
import websockets.exceptions

from elpizo.util import green


logger = logging.getLogger(__name__)


class Bus(object):
  def __init__(self):
    self.protocols = {}
    self.broadcast_locks = {}
    self.channels = collections.defaultdict(set)
    self.subscriptions = {}

  def add(self, id, protocol):
    logger.debug("Added ID to bus: %d", id)

    self.protocols[id] = protocol
    self.broadcast_locks[id] = collections.defaultdict(asyncio.Lock)
    self.subscriptions[id] = set()

  def remove(self, id):
    logger.debug("Removed ID from bus: %d", id)

    for channel in list(self.subscriptions[id]):
      self.unsubscribe(id, channel)

    del self.protocols[id]
    del self.broadcast_locks[id]
    del self.subscriptions[id]

  def get(self, id):
    return self.protocols[id]

  def has(self, id):
    return id in self.protocols

  def send(self, id, origin, message):
    try:
      protocol = self.get(id)
    except KeyError:
      return
    else:
      protocol.send(origin, message)

  def subscribe(self, id, channel):
    self.channels[channel].add(id)
    self.subscriptions[id].add(channel)

  def unsubscribe(self, id, channel):
    self.channels[channel].remove(id)
    self.subscriptions[id].remove(channel)

  def broadcast_lock_for(self, id, channel):
    return self.broadcast_locks[id][channel]

  def _send_to_channel(self, id, channel, origin, message):
    try:
      protocol = self.get(id)
    except KeyError:
      # A client disappeared while we were iterating.
      logger.warn("Client disappeared during broadcast: %d", id)
      return

    # BEGIN CRITICAL SECTION: Acquire the broadcast lock, in case someone
    # wants to run code post-subscribe.
    with green.locking(self.broadcast_lock_for(id, channel)):
      try:
        protocol.send(origin, message)
      except websockets.exceptions.InvalidState:
        logger.warn("Client transport closed during broadcast: %d", id)
        return
    # END CRITICAL SECTION

  def broadcast(self, channel, origin, message, *, exclude_origin=True):
    futures = []
    for id in list(self.channels[channel]):
      if id == origin and exclude_origin:
        continue
      futures.append(green.coroutine(self._send_to_channel)(
          id, channel, origin, message))

    green.await_coro(asyncio.gather(*futures))
