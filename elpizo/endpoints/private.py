def on_open(mq):
  # Bind to the relevant channels.
  mq.subscribe(mq.player.actor.routing_key)
