import logging

from elpizo.protos import packets_pb2
from elpizo.util import net

from elpizo.handlers import hello


class Dispatcher(net.Protocol):
  HANDLERS = {}

  @classmethod
  def register(cls, type, f):
    cls.HANDLERS[type] = f

  def on_message(self, origin, message):
    type = message.DESCRIPTOR.GetOptions().Extensions[packets_pb2.packet_type]

    try:
      handler = self.HANDLERS[type]
    except KeyError:
      packet_name = Dispatcher.PACKET_NAMES.get(
          type, "opcode {}".format(type))
      logging.warn("Unhandled packet: %s", packet_name)
    else:
      handler(self, origin, message)


Dispatcher.register(packets_pb2.Packet.HELLO, hello.on_hello)
