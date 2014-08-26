import asyncio
import collections
import logging

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

  def subscribe(self, id, channel):
    self.channels[channel].add(id)
    self.subscriptions[id].add(channel)

  def unsubscribe(self, id, channel):
    self.channels[channel].remove(id)
    self.subscriptions[id].remove(channel)

  def broadcast_lock_for(self, id, channel):
    return self.broadcast_locks[id][channel]

  def broadcast(self, channel, origin, message, *, exclude_origin=True):
    for id in list(self.channels[channel]):
      if id == origin and exclude_origin:
        continue
      try:
        protocol = self.get(id)
      except KeyError:
        # A client disappeared while we were iterating.
        logger.warn("Client disappeared during broadcast: %d", id)
      else:
        if not protocol.transport.is_open:
          logger.warn("Client transport closed during broadcast: %d", id)
          continue

        # BEGIN CRITICAL SECTION: Acquire the broadcast lock, in case someone
        # wants to run code post-subscribe.
        lock = self.broadcast_lock_for(id, channel)
        green.await_coro(lock.acquire())
        try:
          protocol.send(origin, message)
        finally:
          lock.release()
        # END CRITICAL SECTION
