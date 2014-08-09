import subprocess

from .explain import explain_query
from tornado.web import RequestHandler


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
    player = session.get_player(self.application.sqla_factory())
    self.render("debug/session.html", session=session, player=player)


class PacketViewHandler(RequestHandler):
  def get(self, session_id, mode, i):
    session = self.debug_context.sessions[session_id]
    packet = session.debug_context.packets[mode][int(i)]
    self.render("debug/packet.html",
                session=session, packet=packet, i=i, mode=mode)


class QueryViewHandler(RequestHandler):
  def get(self, session_id, mode, packet_index, query_index):
    session = self.debug_context.sessions[session_id]
    packet = session.debug_context.packets[mode][int(packet_index)]

    session = self.debug_context.sessions[session_id]
    packet = session.debug_context.packets[mode][int(packet_index)]
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
                explain=img)
