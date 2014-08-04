def on_open(ctx):
  ctx.subscribe("chatroom.global")


def socket_chat(ctx, message):
  target = message["target"]
  text = message["text"]

  ns, _ = target.split(".")

  if ns not in ["chatroom", "entity"]:
    ctx.send({
        "type": "error",
        "text": "unknown chat namespace: {ns}".format(ns=ns)
    })
    return

  ctx.publish(target, {
      "type": "chat",
      "origin": ctx.player.entity.name,
      "target": target,
      "text": text
  })


def mq_chat(ctx, message):
  ctx.send(message)
