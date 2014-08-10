from ..models.items import Drop
from .. import game_pb2


def socket_pick_up(ctx, message):
  drop = ctx.sqla.query(Drop).get(message.drop_id)

  # No such drop.
  if drop is None:
    return

  # No drop at this location.
  if drop.realm_id != ctx.player.realm_id or drop.ax != ctx.player.ax or \
     drop.ay != ctx.player.ay:
     return

  drop.item.owner_actor_id = ctx.player.id

  # We have to do this at the protocol level, since the drop is the origin.
  ctx.protocol.publish(ctx.player.region.routing_key, drop.id,
                       game_pb2.DespawnEntityPacket())

  ctx.sqla.delete(drop)
  ctx.sqla.commit()
