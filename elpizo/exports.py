from .models.fixtures import FixtureType


def get_exports(application):
  sqla = application.sqla_factory()
  return {
      "fixtureTypes": {fixtureType.id: fixtureType.to_js()
          for fixtureType in sqla.query(FixtureType)}
  }
