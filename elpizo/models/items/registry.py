from elpizo.models import items
from elpizo.models.items import restorative
from elpizo.models.items.equipment import feet_items
from elpizo.models.items.equipment import legs_items
from elpizo.models.items.equipment import torso_items
from elpizo.models.items.equipment import weapons


def initialize():
  items.Item.register(torso_items.WhiteLongsleeveShirt)
  items.Item.register(legs_items.TealPants)
  items.Item.register(feet_items.BrownShoes)
  items.Item.register(restorative.Carrot)
  items.Item.register(weapons.Dagger)
