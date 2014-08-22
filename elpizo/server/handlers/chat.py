from elpizo.protos import packets_pb2
from elpizo.util import net


def on_chat(protocol, message):
  ns, name = message.target.split(".")

  if ns not in ["chatroom", "conversation"]:
    raise net.ProtocolError("unknown chat namespace: {}".format(ns))

  protocol.server.bus.broadcast(
      (ns, name), protocol.player.id,
      packets_pb2.ChatPacket(target=message.target,
                             actor_name=protocol.player.name,
                             text=message.text))
