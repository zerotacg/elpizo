from . import Item
from . import equipment, restorative


def initialize():
  Item.register(equipment.WhiteLongsleeveShirt)
  Item.register(equipment.TealPants)
  Item.register(equipment.BrownShoes)
  Item.register(restorative.Carrot)
