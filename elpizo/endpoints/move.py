from .. import game_pb2
from ..green import sleep
from ..models.realm import Region, Terrain
from ..models.fixtures import Fixture


def get_direction_vector(d):
  return {
    0: ( 0, -1), # N
    1: (-1,  0), # W
    2: ( 0,  1), # S
    3: ( 1,  0)  # E
  }[d]


def socket_move(ctx, message):
  try:
    direction = message.direction

    dax, day = get_direction_vector(direction)
    ctx.player.direction = direction
    ctx.sqla.commit()

    ctx.player.ax += dax
    ctx.player.ay += day

    region = ctx.player.region

    if region is None:
      ctx.sqla.rollback()
      return

    corners = [
        region.corners[(ctx.player.ry + 0) * (Region.SIZE + 1) +
                       (ctx.player.rx + 0)],
        region.corners[(ctx.player.ry + 0) * (Region.SIZE + 1) +
                       (ctx.player.rx + 1)],
        region.corners[(ctx.player.ry + 1) * (Region.SIZE + 1) +
                       (ctx.player.rx + 0)],
        region.corners[(ctx.player.ry + 1) * (Region.SIZE + 1) +
                       (ctx.player.rx + 1)]
    ]
    terrain_map = {terrain.id: terrain
                   for terrain
                   in ctx.sqla.query(Terrain).filter(Terrain.id.in_(corners))}

    if sum([terrain_map[corner].passable for corner in corners]) <= 1:
      ctx.sqla.rollback()
      return

    if ctx.sqla.query(ctx.sqla.query(Fixture).filter(
        Fixture.bbox_contains(ctx.player.realm_id, ctx.player.ax, ctx.player.ay)
    ).exists()).scalar():
      ctx.sqla.rollback()
      return

    ctx.sqla.commit()
  finally:
    ctx.publish(ctx.player.region.routing_key, game_pb2.Packet.MOVE, message)


def mq_move(ctx, origin, message):
  if origin.id != ctx.player.id:
    ctx.send(game_pb2.Packet.MOVE, origin, message)


def socket_stop_move(ctx, message):
  ctx.publish(ctx.player.region.routing_key,
              game_pb2.Packet.STOP_MOVE, message)


def mq_stop_move(ctx, origin, message):
  if origin.id != ctx.player.id:
    ctx.send(game_pb2.Packet.STOP_MOVE, origin, message)
