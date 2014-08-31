from elpizo.models.items import equipment


class LegsItem(equipment.Equipment):
  SLOT = 2


class TealPants(LegsItem):
  TYPE = "teal_pants"
