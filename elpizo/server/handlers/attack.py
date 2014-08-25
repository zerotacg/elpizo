from elpizo.protos import packets_pb2


def on_attack(protocol, actor, message):
  for actor_id in message.actor_ids:
    target = protocol.server.store.entities.load(actor_id)

    # TODO: implement the rest of this

  actor.broadcast_to_regions(protocol.server.bus, message)
