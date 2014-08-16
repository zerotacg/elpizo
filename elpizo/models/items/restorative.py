from . import Item


@Item.register
class Carrot(Item):
  REGISTRY_TYPE = "carrot"
