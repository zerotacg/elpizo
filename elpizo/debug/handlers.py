import base64
import email
import subprocess
import traceback

from tornado.web import RequestHandler

from .explain import explain_query

from ..models.base import User, Entity
from ..models.actors import Player
from ..models.items import Item


class RequestHandler(RequestHandler):
  @property
  def debug_context(self):
    return self.application.debug_context

  def render(self, *args, **kwargs):
    kwargs["ctx"] = self.debug_context
    return super().render(*args, **kwargs)


class MainHandler(RequestHandler):
  def get(self):
    self.render("debug/index.html")


class SessionHandler(RequestHandler):
  def get(self, id):
    session = self.debug_context.sessions[id]
    sqla = self.application.sqla_factory()

    player = sqla.query(Player).get(session.player_id)

    self.render("debug/session.html", session=session, player=player)


class PacketViewHandler(RequestHandler):
  def get(self, session_id, mode, i):
    session = self.debug_context.sessions[session_id]
    packet = session.packets[mode][int(i)]
    self.render("debug/packet.html",
                session=session, packet=packet, i=i, mode=mode)


class QueryViewHandler(RequestHandler):
  def get(self, session_id, mode, packet_index, query_index):
    session = self.debug_context.sessions[session_id]
    packet = session.packets[mode][int(packet_index)]

    session = self.debug_context.sessions[session_id]
    packet = session.packets[mode][int(packet_index)]
    query = packet["query_stats"][int(query_index)]

    _, _, multiparams, params, _ = query.user_context
    graph = explain_query(self.application.sqla_factory(), query.text,
                          multiparams, params)

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
    sqla = self.application.sqla_factory()

    mint = self.application.mint

    user_name = self.get_argument("user")
    player_name = self.get_argument("player")

    player = sqla.query(Player) \
        .filter(Player.name == player_name,
                User.name == user_name,
                Player.user_id == User.id) \
        .one()

    user = player.user
    user.current_player = player

    sqla.commit()

    credentials = "user.{}".format(user.id)

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
    sqla = self.application.sqla_factory()

    self.render("debug/entity.html", entity=sqla.query(Entity).get(id))


class ItemHandler(RequestHandler):
  def get(self, id):
    sqla = self.application.sqla_factory()

    self.render("debug/item.html", item=sqla.query(Item).get(id))


class UserHandler(RequestHandler):
  def get(self, id):
    sqla = self.application.sqla_factory()

    self.render("debug/user.html", user=sqla.query(User).get(id))
