import functools

from elpizo.models import entities
from elpizo.protos import packets_pb2
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
    raise net.ProtocolError("Unknown authentication realm: {}".format(
        auth_realm))

  policy = policy_factory(id, protocol.server)
  protocol.bind_policy(policy)
  policy.on_hello(protocol)


def on_whoami(protocol, actor, message):
  protocol.send(
      None,
      packets_pb2.RealmPacket(realm=actor.realm.to_public_protobuf()))
  protocol.send(
      actor.id,
      packets_pb2.EntityPacket(entity=actor.to_protected_protobuf()))
  protocol.policy.on_whoami(actor, protocol)
