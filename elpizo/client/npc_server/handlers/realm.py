import networkx

from elpizo.models import entities
from elpizo.models import realm
from elpizo.models import geometry as m_geometry
from elpizo.util import geometry
from elpizo.util import record


def on_realm(protocol, origin, message):
  r = realm.Realm.from_protobuf(message.realm)
  r.update(id=message.realm.id)
  protocol.server.store.realms.add(r)
  recompute_path_graph(r)


def on_region(protocol, origin, message):
  region = realm.Region.from_protobuf(message.region)
  region.location = m_geometry.Vector2.from_protobuf(message.region.location)
  region.update(entities=[])

  r = protocol.server.store.realms.load(message.region.realm_id)
  r.regions.add(region)

  recompute_path_graph(r)


def recompute_path_graph(r):
  # TODO: don't recompute the ENTIRE graph!
  g = networkx.DiGraph()

  for y in range(r.size.y):
    for x in range(r.size.x):
      location = geometry.Vector2(x, y)
      g.add_node(location)

  for y in range(r.size.y):
    for x in range(r.size.x):
      origin = geometry.Vector2(x, y)

      for direction, delta in entities.Entity.DIRECTION_VECTORS.items():
        target = origin.offset(delta)
        if r.is_passable(geometry.Rectangle(target.x, target.y, 1, 1),
                         direction):
          g.add_edge(origin, target)

  r.update(path_graph=g)
