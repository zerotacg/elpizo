from ..models import Region


def on_open(ctx):
  # Bind to the relevant channels.
  ctx.subscribe(ctx.player.entity.routing_key)
  ctx.subscribe(ctx.player.entity.realm.routing_key)

  # Send realm information.
  ctx.send({"type": "realm",
            "realm": ctx.player.entity.realm.to_js()})


def viewport(ctx, message):
  last_viewport = ctx.transient_storage.get("viewport", {
      "aLeft": 0, "aTop": 0, "aRight": 0, "aBottom": 0
  })

  viewport = {
      "aLeft": message["aLeft"],
      "aTop": message["aTop"],
      "aRight": message["aRight"],
      "aBottom": message["aBottom"]
  }

  ctx.transient_storage["viewport"] = viewport

  last_regions = {region.key: region
      for region in ctx.application.sqla.query(Region).filter(
      Region.bounded_by(last_viewport["aLeft"], last_viewport["aTop"],
                        last_viewport["aRight"], last_viewport["aBottom"]))}

  regions = {region.key: region
      for region in ctx.application.sqla.query(Region).filter(
      Region.bounded_by(viewport["aLeft"], viewport["aTop"],
                        viewport["aRight"], viewport["aBottom"]))}


  for added_region_key in set(regions.keys()) - set(last_regions.keys()):
    region = regions[added_region_key]

    ctx.send({"type": "region", "region": region.to_js()})
    ctx.subscribe(region.routing_key)

    for entity in region.entities:
      ctx.send({"type": "entity", "entity": entity.to_js()})

  for removed_region_key in set(last_regions.keys()) - set(regions.keys()):
    region = regions[removed_region_key]
    ctx.unsubscribe(region.routing_key)

  ctx.send({"type": "avatar", "entityId": ctx.player.entity.id})
