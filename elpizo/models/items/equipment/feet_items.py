from elpizo.models.items import equipment


class FeetItem(equipment.Equipment):
  SLOT = 3


class BrownShoes(FeetItem):
  TYPE = "brown_shoes"
