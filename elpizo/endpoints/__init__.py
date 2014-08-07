from . import chat, move, private
from ..game_pb2 import Packet


def basic_mq_endpoint(ctx, origin, message):
  if origin.id != ctx.player.id:
    ctx.send(origin, message)


def configure(application):
  application.on_open_hooks = [
      chat.on_open,
      private.on_open
  ]

  application.on_close_hooks = [
      private.on_close
  ]

  application.sockjs_endpoints = {
      Packet.CHAT: chat.socket_chat,
      Packet.VIEWPORT: private.viewport,
      Packet.MOVE: move.socket_move,
      Packet.STOP_MOVE: move.socket_stop_move
  }

  application.amqp_endpoints = {
      Packet.CHAT: basic_mq_endpoint,
      Packet.ERROR: basic_mq_endpoint,
      Packet.MOVE: basic_mq_endpoint,
      Packet.STOP_MOVE: basic_mq_endpoint,
      Packet.STATUS: basic_mq_endpoint
  }
