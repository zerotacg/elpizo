from elpizo.models import realm


def on_realm(protocol, origin, message):
  r = realm.Realm.from_protobuf(message.realm)
  r.update(id=message.realm.id, regions={})
  protocol.server.realms[r.id] = r


def on_region(protocol, origin, message):
  region = realm.Region.from_protobuf(message.region)
  r = protocol.server.realms[region.realm_id]
  r.regions[region.location] = region
