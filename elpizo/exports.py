from .models import ActorKind


def get_exports(application):
  return {
      "names": {
          "actor": {
              actor.id: actor.name
              for actor in application.sqla.query(ActorKind)}
      }
  }
