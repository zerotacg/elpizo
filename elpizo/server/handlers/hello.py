import functools

from elpizo.models import entities
from elpizo.server import policies
from elpizo.util import mint
from elpizo.util import net


def on_hello(protocol, actor, message):
  try:
    token = protocol.server.mint.unmint(message.token)
  except mint.InvalidTokenError as e:
    raise net.ProtocolError("Invalid login token: {}".format(e))

  auth_realm, _, id = token.decode("utf-8").partition(".")

  try:
    policy_factory = policies.REGISTRY[auth_realm]
  except KeyError:
    raise net.ProtocolError("Unknown authentication realm.")

  policy = policy_factory(id, protocol.server)
  protocol.bind_policy(policy)
  policy.on_hello(protocol)
