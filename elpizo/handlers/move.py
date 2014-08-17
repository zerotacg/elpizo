import time

from sqlalchemy.orm.exc import NoResultFound

from .. import game_pb2
from ..models.base import Entity
from ..models.realm import Region
from ..models.fixtures import Fixture


def get_direction_vector(d):
  return {
      0: ( 0, -1), # N
      1: (-1,  0), # W
      2: ( 0,  1), # S
      3: ( 1,  0)  # E
  }[d]


def socket_move(ctx, message):
  entity_for_update = ctx.sqla.query(Entity) \
      .filter(Entity.id == ctx.player.id) \
      .with_lockmode("update") \
      .one()

  last_move_time = ctx.transient_storage.get("last_move_time", 0)
  now = time.monotonic()

  dt = now - last_move_time

  if dt < 1 / entity_for_update.get_speed() * 0.5:  # compensate for slow connections by 0.5
    ctx.send(entity_for_update.id, game_pb2.TeleportPacket(
        location=entity_for_update.location_to_protobuf(),
        direction=entity_for_update.direction))
    return

  ctx.publish(entity_for_update.region.routing_key, message)

  direction = message.direction

  dax, day = get_direction_vector(direction)
  entity_for_update.direction = direction
  ctx.sqla.commit()

  new_ax = entity_for_update.ax + dax
  new_ay = entity_for_update.ay + day

  # TODO: check bboxes
  try:
    region = ctx.sqla.query(Region) \
        .filter(Region.realm_id == entity_for_update.realm_id,
                Region.bbox_contains(new_ax, new_ay)) \
        .one()
  except NoResultFound:
    # colliding with the edge of the world
    ctx.sqla.rollback()
    return

  entity_for_update.ax = new_ax
  entity_for_update.ay = new_ay

  rx = new_ax % Region.SIZE
  ry = new_ay % Region.SIZE

  # colliding with terrain
  if not ((region.passabilities[ry * Region.SIZE + rx] >> direction) & 0b1):
    ctx.sqla.rollback()
    return

  # colliding with a fixture
  if ctx.sqla.query(ctx.sqla.query(Fixture).filter(
      Fixture.intersects(entity_for_update)).exists()).scalar():
    ctx.sqla.rollback()
    return

  ctx.transient_storage["last_move_time"] = now
  ctx.sqla.commit()


def socket_stop_move(ctx, message):
  ctx.publish(ctx.player.region.routing_key, message)
