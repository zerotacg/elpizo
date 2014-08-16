from . import Fixture
from . import resource_sources


def initialize():
  Fixture.register(resource_sources.Tree)
