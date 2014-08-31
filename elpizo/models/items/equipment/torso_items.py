from elpizo.models.items import equipment


class TorsoItem(equipment.Equipment):
  SLOT = 1


class WhiteLongsleeveShirt(TorsoItem):
  TYPE = "white_longsleeve_shirt"
