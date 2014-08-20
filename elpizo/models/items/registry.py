from elpizo.models import items
from elpizo.models.items import equipment
from elpizo.models.items import restorative


def initialize():
  items.Item.register(equipment.WhiteLongsleeveShirt)
  items.Item.register(equipment.TealPants)
  items.Item.register(equipment.BrownShoes)
  items.Item.register(restorative.Carrot)
