import logging

from elpizo.protos import packets_pb2
from elpizo.util import net

from elpizo.server.handlers import hello

logger = logging.getLogger(__name__)


class Dispatcher(net.Protocol):
  HANDLERS = {}

  @classmethod
  def register(cls, type, f):
    cls.HANDLERS[type] = f

  def on_open(self):
    self.player = None

  def on_message(self, origin, message):
    type = message.DESCRIPTOR.GetOptions().Extensions[packets_pb2.packet_type]

    try:
      handler = self.HANDLERS[type]
    except KeyError:
      packet_name = Dispatcher.PACKET_NAMES.get(
          type, "opcode {}".format(type))
      logger.warn("Unhandled packet: %s", packet_name)
    else:
      handler(self, origin, message)

  def on_close(self):
    if self.player is not None:
      self.player.save()
      self.server.bus.remove(self.player.id)


Dispatcher.register(packets_pb2.Packet.HELLO, hello.on_hello)
