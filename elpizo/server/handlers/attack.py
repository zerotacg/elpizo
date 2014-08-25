from elpizo.protos import packets_pb2


def on_attack(protocol, actor, message):
  target = protocol.server.store.entities.load(message.actor_id)

  # TODO: implement the rest of this

  actor.broadcast_to_regions(protocol.server.bus, message)
