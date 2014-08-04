from ..green import sleep


def get_direction_vector(d):
  return {
    0: ( 0, -1), # N
    1: (-1,  0), # W
    2: ( 0,  1), # S
    3: ( 1,  0)  # E
  }[d]


def on_open(ctx):
  ctx.subscribe(ctx.player.entity.realm.routing_key)


def socket_move(ctx, message):
  direction = message["direction"]
  dax, day = get_direction_vector(direction)
  ctx.player.entity.direction = direction
  ctx.player.entity.ax = min([max([0, ctx.player.entity.ax + dax]),
                              ctx.player.entity.region.realm.aw - 1])
  ctx.player.entity.ay = min([max([0, ctx.player.entity.ay + day]),
                              ctx.player.entity.region.realm.ah - 1])
  ctx.application.sqla.commit()

  ctx.publish(ctx.player.entity.region.routing_key, {
      "type": "move",
      "origin": ctx.player.entity.id,
      "direction": direction
  })


def mq_move(ctx, message):
  if message["origin"] != ctx.player.entity.id:
    ctx.send(message)
