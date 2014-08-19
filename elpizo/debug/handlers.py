import base64
import email
import subprocess
import traceback

from tornado.web import RequestHandler

from .explain import explain_query

from ..models.base import Entity
from ..models.actors import Player
from ..models.items import Item
from ..models.realm import Realm, Region


class RequestHandler(RequestHandler):
  @property
  def debug_context(self):
    return self.application.debug_context

  def prepare(self):
    self.sqla = self.application.sqla_factory()

  def render(self, *args, **kwargs):
    kwargs["ctx"] = self.debug_context
    return super().render(*args, **kwargs)


class MainHandler(RequestHandler):
  def get(self):
    self.render("debug/index.html",
                realms=self.sqla.query(Realm), players=self.sqla.query(Player),
                can_mint=self.application.mint.can_mint)


class SessionHandler(RequestHandler):
  def get(self, id):
    session = self.debug_context.sessions[id]

    player = self.sqla.query(Player).get(session.player_id)

    self.render("debug/session.html", session=session, player=player)


class PacketHandler(RequestHandler):
  def get(self, session_id, mode, i):
    session = self.debug_context.sessions[session_id]
    packet = session.packets[mode][int(i)]
    self.render("debug/packet.html",
                session=session, packet=packet, i=i, mode=mode)


class QueryHandler(RequestHandler):
  def get(self, session_id, mode, packet_index, query_index):
    session = self.debug_context.sessions[session_id]
    packet = session.packets[mode][int(packet_index)]

    session = self.debug_context.sessions[session_id]
    packet = session.packets[mode][int(packet_index)]
    query = packet["query_stats"][int(query_index)]

    _, _, multiparams, params, _ = query.user_context
    graph = explain_query(self.sqla, query.text, multiparams, params)

    if graph is not None:
      img, _ = subprocess.Popen(["dot", "-Tsvg"],
                                stdin=subprocess.PIPE,
                                stdout=subprocess.PIPE) \
          .communicate(graph.encode("utf-8"))
    else:
      img = "(not available)"

    self.render("debug/query.html",
                session=session, packet=packet, mode=mode,
                packet_index=packet_index, query_index=query_index,
                query=packet["query_stats"][int(query_index)],
                stack="".join(traceback.format_list(query.stack)),
                explain=img)


class AdmitHandler(RequestHandler):
  def get(self):
    mint = self.application.mint

    player = self.sqla.query(Player) \
        .filter(Player.name == self.get_argument("player")) \
        .one()

    credentials = "player.{}".format(player.id)

    token = mint.mint(credentials.encode("utf-8"))
    self.set_cookie("elpizo_token", base64.b64encode(token))

    self.render("debug/admit.html",
        credentials=mint.unmint(token).decode("utf-8"),
        token=email.base64mime.body_encode(token).strip(),
        rsa_key_size=mint.rsa_key_size * 8,
        signer=mint.signer.__class__.__name__,
        hash=mint.hashfunc.__name__)


class EntityHandler(RequestHandler):
  def get(self, id):
    self.render("debug/entity.html", entity=self.sqla.query(Entity).get(id))


class ItemHandler(RequestHandler):
  def get(self, id):
    self.render("debug/item.html", item=self.sqla.query(Item).get(id))


class RealmHandler(RequestHandler):
  def get(self, id):
    self.render("debug/realm.html", realm=self.sqla.query(Realm).get(id))


class RegionHandler(RequestHandler):
  def get(self, realm_id, arx, ary):
    region = self.sqla.query(Region).filter(
        Region.realm_id == realm_id,
        Region.arx == arx,
        Region.ary == ary
    ).one()
    self.render("debug/region.html", region=region)
