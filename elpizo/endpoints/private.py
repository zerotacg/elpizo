from ..models import Region


def on_open(ctx):
  # Bind to the relevant channels.
  ctx.subscribe(ctx.player.entity.routing_key)

  # Send realm information.
  ctx.send({"type": "realm",
            "realm": ctx.player.entity.realm.to_js()})


def viewport(ctx, message):
  # Send region and entity information.
  for region in ctx.application.sqla.query(Region).filter(
      Region.bounded_by(message["aLeft"], message["aTop"],
                        message["aRight"], message["aBottom"])):
    ctx.send({"type": "region", "region": region.to_js()})
    ctx.subscribe(region.routing_key)

    for entity in region.entities:
      ctx.send({"type": "entity", "entity": entity.to_js()})

  # Send player avatar information.
  ctx.send({"type": "avatar", "entityId": ctx.player.entity.id})
