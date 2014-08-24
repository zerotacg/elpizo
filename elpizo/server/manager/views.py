import collections
import flask
import json

from elpizo.models import record as model_records
from elpizo.models import realm
from elpizo.server import store
from elpizo.util import record


def index():
  return flask.render_template("index.html")


Node = collections.namedtuple("Node", ["name", "object"])

def store_query():
  root = Node(name="Store", object=flask.current_app.manager.store)

  id = flask.request.args.get("id")
  dump_proto = flask.request.args.get("proto")

  if id is None:
    return "malformed query", 400

  node, id = _lookup(root, id)
  out = _dump(id, node)
  if dump_proto:
    out["proto"] = str(node.object.to_protobuf())

  return json.dumps([out]), 200, {"Content-Type": "application/json"}


def _lookup(root, path):
  node = root

  root, *parts = path.split(".")

  if root != "root":
    raise KeyError(root)

  current = [root]

  parts.reverse()

  while parts:
    prefix = ".".join(current)
    current.append(parts.pop())

    node = _get_children(node.object, prefix)[".".join(current)]

  return node, ".".join(current)


def _get_children(obj, prefix):
  if isinstance(obj, store.GameStore):
    return {
        ".".join([prefix, "entities"]): Node(
            name="Entities", object=obj.entities),

        ".".join([prefix, "realms"]): Node(
            name="Realms", object=obj.realms)}

  if isinstance(obj, record.Store):
      return {
          ".".join([prefix, record.id]): Node(
              name="{} (type: {})".format(record.id, type(record).__qualname__),
              object=record)
          for record in obj.load_all()}

  if isinstance(obj, realm.Realm):
    return {
        ".".join([prefix, "regions"]): Node(
            name="Regions", object=obj.regions)}

  return {}


def _dump(id, node, depth=1):
  children = _get_children(node.object, id)
  obj = node.object

  out = {
      "id": id,
      "label": "name",
      "name": node.name,
      "hasChildren": len(children) > 0,
      "isRecord": isinstance(obj, model_records.ProtobufRecord)
  }

  if depth >= 1:
    out["items"] = [_dump(k, child, depth - 1)
        for k, child in sorted(children.items(),
                               key=lambda kv: _get_sort_key(kv[1]))]

  return out


def _get_sort_key(node):
  obj = node.object

  if isinstance(obj, realm.Region):
    return (obj.location.x, obj.location.y)
  if isinstance(obj, record.Record):
    return obj.id

  return node.name
