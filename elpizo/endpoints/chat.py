from .. import game_pb2


def on_open(ctx):
  ctx.subscribe("chatroom.global")
  ctx.subscribe("conversation.{name}".format(name=ctx.player.name))


def socket_chat(ctx, message):
  ns, _ = message.target.split(".")

  if ns not in ["chatroom", "conversation"]:
    ctx.error("unknown chat namespace: {ns}".format(ns=ns))
    return

  ctx.publish(message.target,
              game_pb2.ChatPacket(target=message.target,
                                  actor_name=ctx.player.name,
                                  text=message.text))
