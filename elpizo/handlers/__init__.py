from . import chat, move, viewport, item
from .. import game_pb2
from ..game_pb2 import Packet


def on_open(ctx):
  # Bind to the relevant channels.
  ctx.subscribe(ctx.player.routing_key)
  ctx.subscribe(ctx.player.realm.routing_key)

  # Set the player to online.
  #ctx.publish(ctx.player.realm.routing_key, game_pb2.StatusPacket(online=True))

  ctx.player.online = True
  ctx.sqla.commit()

  # Send realm information.
  ctx.send(None, game_pb2.RealmPacket(realm=ctx.player.realm.to_protobuf()))
  ctx.send(ctx.player.id,
           game_pb2.EntityPacket(entity=ctx.player.to_protobuf()))
  ctx.send(ctx.player.id, game_pb2.AvatarPacket())


def on_close(ctx):
  #ctx.publish(ctx.player.realm.routing_key, game_pb2.StatusPacket(online=False))

  ctx.publish(ctx.player.realm.routing_key, game_pb2.StopMovePacket())
  ctx.player.online = False
  ctx.sqla.commit()


def basic_mq_endpoint(ctx, origin, message):
  if origin != ctx.player.id:
    ctx.send(origin, message)


def on_mq_error(ctx, origin, message):
  ctx.protocol.socket.close()
  basic_mq_endpoint(ctx, origin, message)


def install(application):
  application.on_open_hooks = [
      chat.on_open,
      on_open
  ]

  application.on_close_hooks = [
      on_close
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
      Packet.DESPAWN_ENTITY: basic_mq_endpoint,
      Packet.ENTITY: basic_mq_endpoint,
      Packet.ERROR: on_mq_error,
      Packet.REGION_CHANGE: basic_mq_endpoint
  }
