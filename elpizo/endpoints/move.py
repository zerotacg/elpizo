import time

from sqlalchemy.orm.exc import NoResultFound

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
  last_move_time = ctx.transient_storage.get("last_move_time", 0)
  now = time.monotonic()

  dt = now - last_move_time

  if dt < 1 / ctx.player.speed * 0.8:  # compensate for slow connections by 0.8
    ctx.send(ctx.player.id, game_pb2.TeleportPacket(
        location=ctx.player.location_to_protobuf(),
        direction=ctx.player.direction))
    return

  ctx.publish(ctx.player.region.routing_key, message)

  direction = message.direction

  dax, day = get_direction_vector(direction)
  ctx.player.direction = direction
  ctx.sqla.commit()

  new_ax = ctx.player.ax + dax
  new_ay = ctx.player.ay + day

  try:
    region = ctx.sqla.query(Region) \
        .filter(Region.bbox_contains(new_ax, new_ay)) \
        .one()
  except NoResultFound:
    # colliding with the edge of the world
    ctx.sqla.rollback()
    return

  ctx.player.ax = new_ax
  ctx.player.ay = new_ay

  nw = region.corners[(ctx.player.ry + 0) * (Region.SIZE + 1) +
                      (ctx.player.rx + 0)]
  ne = region.corners[(ctx.player.ry + 0) * (Region.SIZE + 1) +
                      (ctx.player.rx + 1)]
  sw = region.corners[(ctx.player.ry + 1) * (Region.SIZE + 1) +
                      (ctx.player.rx + 0)]
  se = region.corners[(ctx.player.ry + 1) * (Region.SIZE + 1) +
                      (ctx.player.rx + 1)]

  passabilities = {terrain.id: terrain.passable
                   for terrain
                   in ctx.sqla.query(Terrain).filter(Terrain.id.in_([
                        nw, ne, sw, se
                   ]))}

  mask = ((passabilities.get(nw, False) >> direction) & 0b1) << 3 | \
         ((passabilities.get(ne, False) >> direction) & 0b1) << 2 | \
         ((passabilities.get(se, False) >> direction) & 0b1) << 1 | \
         ((passabilities.get(sw, False) >> direction) & 0b1) << 0

  # colliding with terrain
  if not {
      0x0: False,
      0x1: False,
      0x2: False,
      0x3: True,
      0x4: False,
      0x5: True,
      0x6: False,
      0x7: True,
      0x8: False,
      0x9: False,
      0xa: True,
      0xb: True,
      0xc: False,
      0xd: False,
      0xe: False,
      0xf: True
  }[mask]:
    ctx.sqla.rollback()
    return

  # colliding with a fixture
  if ctx.sqla.query(ctx.sqla.query(Fixture).filter(
      Fixture.bbox_contains(ctx.player.realm_id, ctx.player.ax, ctx.player.ay)
  ).exists()).scalar():
    ctx.sqla.rollback()
    return

  ctx.transient_storage["last_move_time"] = now
  ctx.sqla.commit()


def socket_stop_move(ctx, message):
  ctx.publish(ctx.player.region.routing_key, message)
