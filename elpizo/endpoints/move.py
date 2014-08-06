from .. import game_pb2
from ..green import sleep
from ..models.fixtures import Fixture


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
  ctx.player.direction = direction

  if not ctx.application.sqla.query(ctx.application.sqla.query(Fixture).filter(
      Fixture.bbox_contains(ctx.player.realm_id,
                            ctx.player.ax + dax, ctx.player.ay + day)
  ).exists()).scalar():
    ctx.player.ax = min([max([0, ctx.player.ax + dax]),
                        ctx.player.region.realm.aw - 1])
    ctx.player.ay = min([max([0, ctx.player.ay + day]),
                        ctx.player.region.realm.ah - 1])
    ctx.application.sqla.commit()

  ctx.publish(ctx.player.region.routing_key,
              game_pb2.Packet.MOVE, message)


def mq_move(ctx, origin, message):
  if origin.id != ctx.player.id:
    ctx.send(game_pb2.Packet.MOVE, origin, message)


def socket_stop_move(ctx, message):
  ctx.publish(ctx.player.region.routing_key,
              game_pb2.Packet.STOP_MOVE, message)


def mq_stop_move(ctx, origin, message):
  if origin.id != ctx.player.id:
    ctx.send(game_pb2.Packet.STOP_MOVE, origin, message)
