from .. import game_pb2
from ..green import sleep


def get_direction_vector(d):
  return {
    0: ( 0, -1), # N
    1: (-1,  0), # W
    2: ( 0,  1), # S
    3: ( 1,  0)  # E
  }[d]


def socket_move(ctx, message):
  direction = message.direction

  dax, day = get_direction_vector(direction)
  ctx.player.actor.direction = direction

  ctx.player.actor.ax = min([max([0, ctx.player.actor.ax + dax]),
                                  ctx.player.actor.region.realm.aw - 1])
  ctx.player.actor.ay = min([max([0, ctx.player.actor.ay + day]),
                                  ctx.player.actor.region.realm.ah - 1])
  ctx.application.sqla.commit()

  ctx.publish(ctx.player.actor.region.routing_key,
              game_pb2.Packet.MOVE, message)


def mq_move(ctx, origin, message):
  if origin.id != ctx.player.actor.id:
    ctx.send(game_pb2.Packet.MOVE, origin, message)


def socket_stop_move(ctx, message):
  ctx.publish(ctx.player.actor.region.routing_key,
              game_pb2.Packet.STOP_MOVE, message)


def mq_stop_move(ctx, origin, message):
  if origin.id != ctx.player.actor.id:
    ctx.send(game_pb2.Packet.STOP_MOVE, origin, message)
