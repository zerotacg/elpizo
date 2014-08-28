import logging
import traceback
import websockets

from elpizo.protos import packets_pb2
from elpizo.models import geometry
from elpizo.server.handlers import attack
from elpizo.server.handlers import chat
from elpizo.server.handlers import echo
from elpizo.server.handlers import hello
from elpizo.server.handlers import item
from elpizo.server.handlers import move
from elpizo.server.handlers import viewport
from elpizo.server import policies
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

  def bind_actor_policy(self, policy):
    self.actor_policy = policy

  def on_open(self):
    self.bind_actor_policy(policies.UnauthenticatedPolicy())

    self.cache_bounds = geometry.Rectangle(0, 0, 0, 0)
    self.last_move_time = 0
    self.last_attack_time = 0

  def on_message(self, origin, message):
    actor = self.actor_policy.get(origin, self.server)

    if actor is None:
      actor_id = "_"
    else:
      actor_id = actor.id

    type = message.DESCRIPTOR.GetOptions().Extensions[packets_pb2.packet_type]
    packet_name = Dispatcher.PACKET_NAMES.get(
        type, "opcode {}".format(type))

    with self.server.statsd.timer("on_message"), \
         self.server.statsd.timer("packets." + packet_name), \
         self.server.statsd.timer("actors." + actor_id):
      try:
        handler = self.HANDLERS[type]
      except KeyError:
        logger.warn("Unhandled packet: %s", packet_name)
      else:
        handler(self, actor, message)

  def on_close(self):
    self.actor_policy.finish(self.server)

  def on_error(self, e, exc_info):
    if isinstance(e, net.ProtocolError):
      self.send(None, packets_pb2.ErrorPacket(text=str(e)))
      return

    text = "Internal server error. Sorry, that's all we know."

    if self.server.debug:
      text += "\n\n" + "".join(traceback.format_exception(*exc_info))

    try:
      self.send(None, packets_pb2.ErrorPacket(text=text))
    except websockets.exceptions.InvalidState:
      pass
    raise e


Dispatcher.register(packets_pb2.Packet.ATTACK, attack.on_attack)
Dispatcher.register(packets_pb2.Packet.CHAT, chat.on_chat)
Dispatcher.register(packets_pb2.Packet.ECHO, echo.on_echo)
Dispatcher.register(packets_pb2.Packet.HELLO, hello.on_hello)
Dispatcher.register(packets_pb2.Packet.PICK_UP, item.on_pick_up)
Dispatcher.register(packets_pb2.Packet.MOVE, move.on_move)
Dispatcher.register(packets_pb2.Packet.STOP_MOVE, move.on_stop_move)
Dispatcher.register(packets_pb2.Packet.TURN, move.on_turn)
Dispatcher.register(packets_pb2.Packet.VIEWPORT, viewport.on_viewport)
