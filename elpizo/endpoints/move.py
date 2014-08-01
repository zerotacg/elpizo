def on_open(ctx):
  # Bind to the relevant channels.
  ctx.subscribe(ctx.player.actor.realm.routing_key)
  ctx.subscribe(ctx.player.actor.region.routing_key)
