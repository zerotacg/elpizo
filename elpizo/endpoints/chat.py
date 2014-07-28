from tornado.gen import coroutine


@coroutine
def on_open(mq):
  yield mq.subscribe("chatrooms.global")


def socket_chat(mq, message):
  target = message["target"]
  text = message["text"]

  ns, _ = target.split(".")

  if ns not in ["chatrooms", "actors"]:
    mq.send({
      "type": "error",
      "text": "unknown chat namespace"
    })
    return

  mq.publish(destination, {
    "type": "chat",
    "origin": mq.player.actor.name,
    "target": target,
    "text": text
  })


def mq_chat(socket, message):
  socket.send(message)
