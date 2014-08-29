import logging
import networkx
import time

from elpizo.models import entities
from elpizo.models import realm
from elpizo.models import geometry
from elpizo.util import green
from elpizo.util import record

logger = logging.getLogger(__name__)


def on_realm(protocol, origin, message):
  r = realm.Realm.from_protobuf(message.realm)
  r.update(id=message.realm.id, path_graph=networkx.DiGraph())
  protocol.server.store.realms.add(r)


def on_region(protocol, origin, message):
  r = protocol.server.store.realms.load(message.region.realm_id)

  try:
    old_region = r.regions.load(message.region.location)
  except KeyError:
    pass
  else:
    # If we already have a region in the store, remove all its edges from the
    # path graph.
    r.path_graph.remove_edges_from(old_region.path_graph.edges())

  region = realm.Region.from_protobuf(message.region)
  region.location = geometry.Vector2.from_protobuf(message.region.location)
  region.update(entities=set(),
                path_graph=compute_path_graph(region))
  r.regions.add(region)

  start_time = time.monotonic()

  r.path_graph.add_nodes_from(region.path_graph.nodes())
  r.path_graph.add_edges_from(region.path_graph.edges())

  end_time = time.monotonic()
  logger.info("Composed path graph for realm %s, %r in %.5fs.",
              r.id, region.location, end_time - start_time)


def compute_path_graph(region):
  g = networkx.DiGraph()

  for y in range(region.location.y - 1,
                 region.location.y + realm.Region.SIZE + 1):
    for x in range(region.location.x - 1,
                   region.location.x + realm.Region.SIZE + 1):
      origin = geometry.Vector2(x, y)

      for direction, delta in entities.Entity.DIRECTION_VECTORS.items():
        target = origin.offset(delta)
        if region.is_passable(geometry.Rectangle(target.x, target.y, 1, 1),
                              direction):
          g.add_edge(origin, target)

  return g
