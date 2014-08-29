import time
import logging
import networkx

from elpizo.models import entities
from elpizo.models import realm
from elpizo.models import geometry
from elpizo.util import record

logger = logging.getLogger(__name__)


def on_realm(protocol, origin, message):
  r = realm.Realm.from_protobuf(message.realm)
  r.update(id=message.realm.id, path_graph=networkx.DiGraph())
  protocol.server.store.realms.add(r)


def on_region(protocol, origin, message):
  region = realm.Region.from_protobuf(message.region)
  region.location = geometry.Vector2.from_protobuf(message.region.location)
  region.update(entities=[])

  r = protocol.server.store.realms.load(message.region.realm_id)
  r.regions.add(region)

  start_time = time.monotonic()
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

  r.path_graph.add_nodes_from(g.nodes())
  r.path_graph.add_edges_from(g.edges())

  end_time = time.monotonic()
  logger.info("Composed path graph for realm %s, %r in %.5fs.",
              r.id, region.location, end_time - start_time)
