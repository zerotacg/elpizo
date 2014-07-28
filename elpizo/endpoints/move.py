from tornado.gen import coroutine


@coroutine
def on_open(mq):
  # Bind to the relevant channels.
  yield mq.subscribe(mq.player.actor.realm.routing_key)
  yield mq.subscribe(mq.player.actor.region.routing_key)
