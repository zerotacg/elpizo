def on_echo(protocol, actor, message):
  protocol.send(None, message)
