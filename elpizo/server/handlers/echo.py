def on_echo(protocol, message):
  protocol.send(None, message)
