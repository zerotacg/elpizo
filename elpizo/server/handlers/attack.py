from elpizo.protos import packets_pb2


def on_attack(protocol, actor, message):
  for actor_id in message.actor_ids:
    target = protocol.server.store.entities.load(actor_id)

    protocol.send(target.id,
                  packets_pb2.ChatPacket(actor_name=target.name, text="Ow!"))

  actor.broadcast_to_regions(protocol.server.bus, message)
