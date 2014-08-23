import logging

from elpizo.protos import packets_pb2
from elpizo.models import geometry
from elpizo.server.handlers import chat
from elpizo.server.handlers import echo
from elpizo.server.handlers import hello
from elpizo.server.handlers import item
from elpizo.server.handlers import move
from elpizo.server.handlers import viewport
from elpizo.util import net

logger = logging.getLogger(__name__)


class Dispatcher(net.Protocol):
  HANDLERS = {}

  @classmethod
  def register(cls, type, f):
    cls.HANDLERS[type] = f

  def on_open(self):
    self.player = None

    self.cache_bounds = geometry.Rectangle(0, 0, 0, 0)
    self.last_move_time = 0

  def on_message(self, origin, message):
    type = message.DESCRIPTOR.GetOptions().Extensions[packets_pb2.packet_type]

    try:
      handler = self.HANDLERS[type]
    except KeyError:
      packet_name = Dispatcher.PACKET_NAMES.get(
          type, "opcode {}".format(type))
      logger.warn("Unhandled packet: %s", packet_name)
    else:
      handler(self, message)

  def on_close(self):
    if self.player is not None:
      self.player.save()
      self.server.bus.remove(self.player.id)


Dispatcher.register(packets_pb2.Packet.CHAT, chat.on_chat)
Dispatcher.register(packets_pb2.Packet.ECHO, echo.on_echo)
Dispatcher.register(packets_pb2.Packet.HELLO, hello.on_hello)
Dispatcher.register(packets_pb2.Packet.PICK_UP, item.on_pick_up)
Dispatcher.register(packets_pb2.Packet.MOVE, move.on_move)
Dispatcher.register(packets_pb2.Packet.STOP_MOVE, move.on_stop_move)
Dispatcher.register(packets_pb2.Packet.VIEWPORT, viewport.on_viewport)
