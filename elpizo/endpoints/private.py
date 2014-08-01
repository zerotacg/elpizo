def on_open(ctx):
  # Bind to the relevant channels.
  ctx.subscribe(ctx.player.actor.routing_key)
