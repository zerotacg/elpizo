from ..models.items import Drop
from .. import game_pb2


def socket_pick_up(ctx, message):
  for drop in ctx.sqla.query(Drop).filter(
      Drop.realm_id == ctx.player.realm_id,
      Drop.ax == ctx.player.ax,
      Drop.ay == ctx.player.ay):
    drop.item.owner_actor_id = ctx.player.id

    # We have to do this at the protocol level, since the drop is the origin.
    ctx.protocol.publish(ctx.player.region.routing_key, drop.id,
                         game_pb2.DespawnEntityPacket())

    ctx.sqla.delete(drop)

  ctx.sqla.commit()
