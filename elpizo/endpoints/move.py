def on_open(mq):
  # Bind to the relevant channels.
  mq.subscribe(mq.player.actor.realm.routing_key)
  mq.subscribe(mq.player.actor.region.routing_key)
