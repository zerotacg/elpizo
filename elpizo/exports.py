import json

from tornado.web import RequestHandler

from .models import ActorKind


class ExportsHandler(RequestHandler):
  def _get_names(self):
    return {
        "actors": {actor.id: actor.name
                   for actor in self.application.sqla_session.query(ActorKind)}
    }

  def get(self):
    self.set_header("Content-Type", "application/javascript")
    self.finish("window._exports=" + json.dumps({
      "names": self._get_names()
    }, separators=",:"))
