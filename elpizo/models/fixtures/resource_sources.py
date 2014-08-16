from . import Fixture


@Fixture.register
class Tree(Fixture):
  REGISTRY_TYPE = "tree"
  BBOX = (-1, -1, 2, 1)
