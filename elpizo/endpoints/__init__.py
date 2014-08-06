from . import chat, error, move, private
from ..game_pb2 import Packet


def configure(application):
  application.on_open_hooks = [
      chat.on_open,
      private.on_open
  ]

  application.sockjs_endpoints = {
      Packet.CHAT: chat.socket_chat,
      Packet.VIEWPORT: private.viewport,
      Packet.MOVE: move.socket_move,
      Packet.STOP_MOVE: move.socket_stop_move
  }

  application.amqp_endpoints = {
      Packet.CHAT: chat.mq_chat,
      Packet.ERROR: error.mq_error,
      Packet.MOVE: move.mq_move,
      Packet.STOP_MOVE: move.mq_stop_move
  }
