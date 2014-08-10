from . import chat, move, viewport, item
from ..game_pb2 import Packet


def basic_mq_endpoint(ctx, origin, message):
  if origin != ctx.player.id:
    ctx.send(origin, message)


def configure(application):
  application.on_open_hooks = [
      chat.on_open,
      viewport.on_open
  ]

  application.on_close_hooks = [
      viewport.on_close
  ]

  application.ws_endpoints = {
      Packet.CHAT: chat.socket_chat,
      Packet.VIEWPORT: viewport.viewport,
      Packet.MOVE: move.socket_move,
      Packet.STOP_MOVE: move.socket_stop_move,
      Packet.PICK_UP: item.socket_pick_up
  }

  application.amqp_endpoints = {
      Packet.CHAT: basic_mq_endpoint,
      Packet.ERROR: basic_mq_endpoint,
      Packet.MOVE: basic_mq_endpoint,
      Packet.STOP_MOVE: basic_mq_endpoint,
      Packet.STATUS: basic_mq_endpoint,
      Packet.DESPAWN_ENTITY: basic_mq_endpoint
  }
