from elpizo.util import net


def on_error(protocol, origin, message):
  raise net.ProtocolError(message.text)
