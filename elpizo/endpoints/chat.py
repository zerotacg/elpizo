def on_open(mq):
  mq.subscribe("chatrooms.global")


def socket_chat(mq, message):
  target = message["target"]
  text = message["text"]

  ns, _ = target.split(".")

  if ns not in ["chatrooms", "actors"]:
    mq.send({
        "type": "error",
        "text": "unknown chat namespace: {ns}".format(ns=ns)
    })
    return

  mq.publish(target, {
      "type": "chat",
      "origin": mq.player.actor.name,
      "target": target,
      "text": text
  })


def mq_chat(socket, message):
  socket.send(message)
