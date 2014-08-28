import logging

from elpizo.protos import packets_pb2
from elpizo.util import net

logger = logging.getLogger(__name__)


class Dispatcher(net.Protocol):
  HANDLERS = {}

  def __init__(self, server, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.server = server

  @classmethod
  def register(cls, type, f):
    cls.HANDLERS[type] = f

  def on_open(self):
    logger.info("NPC server authorizing.")
    self.send(None, packets_pb2.HelloPacket(
        token=self.server.mint.mint("npc".encode("utf-8"))))

  def on_message(self, origin, message):
    type = message.DESCRIPTOR.GetOptions().Extensions[packets_pb2.packet_type]
    packet_name = Dispatcher.PACKET_NAMES.get(type, "opcode {}".format(type))

    try:
      handler = self.HANDLERS[type]
    except KeyError:
      logger.warn("Unhandled packet: %s", packet_name)
    else:
      handler(self, origin, message)
