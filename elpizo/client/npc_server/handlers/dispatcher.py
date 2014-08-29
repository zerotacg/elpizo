import logging

from elpizo.client.npc_server.handlers import error
from elpizo.client.npc_server.handlers import entity
from elpizo.client.npc_server.handlers import realm
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
    logger.info("NPC server authorizing (I will crash if I fail).")
    self.send(None, packets_pb2.HelloPacket(
        token=self.server.mint.mint(".".join(["npc", self.server.id])
            .encode("utf-8"))))

  def on_message(self, origin, message):
    type = message.DESCRIPTOR.GetOptions().Extensions[packets_pb2.packet_type]
    packet_name = Dispatcher.PACKET_NAMES.get(type, "opcode {}".format(type))

    try:
      handler = self.HANDLERS[type]
    except KeyError:
      logger.warn("Unhandled packet: %s", packet_name)
    else:
      handler(self, origin, message)

  def on_close(self):
    raise net.ProtocolError("Connection closed.")


Dispatcher.register(packets_pb2.Packet.ATTACK, entity.on_attack)
Dispatcher.register(packets_pb2.Packet.DESPAWN_ENTITY, entity.on_despawn_entity)
Dispatcher.register(packets_pb2.Packet.ENTITY, entity.on_entity)
Dispatcher.register(packets_pb2.Packet.ERROR, error.on_error)
Dispatcher.register(packets_pb2.Packet.REGION, realm.on_region)
Dispatcher.register(packets_pb2.Packet.REALM, realm.on_realm)
Dispatcher.register(packets_pb2.Packet.MOVE, entity.on_move)
Dispatcher.register(packets_pb2.Packet.STOP_MOVE, entity.on_stop_move)
Dispatcher.register(packets_pb2.Packet.TELEPORT, entity.on_teleport)
Dispatcher.register(packets_pb2.Packet.TURN, entity.on_turn)
