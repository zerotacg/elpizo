from .. import game_pb2


def on_open(ctx):
  ctx.subscribe("chatroom.global")
  ctx.subscribe("conversation.{name}".format(name=ctx.player.name))


def socket_chat(ctx, message):
  text = message["text"]

  ns, _ = message.target.split(".")

  if ns not in ["chatroom", "conversation"]:
    ctx.error("unknown chat namespace: {ns}".format(ns=ns))
    return

  ctx.publish(target, game_pb2.ChatPacket(target=target, text=text))
