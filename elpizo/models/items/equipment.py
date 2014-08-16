from . import Item

@Item.register
class WhiteLongsleeveShirt(Item):
  REGISTRY_TYPE = "white_longsleeve_shirt"


@Item.register
class TealPants(Item):
  REGISTRY_TYPE = "teal_pants"


@Item.register
class BrownShoes(Item):
  REGISTRY_TYPE = "brown_shoes"
