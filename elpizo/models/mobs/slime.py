from elpizo.models import entities


class GreenSlime(entities.Mob):
  SPECIES = "green_slime"

  def __init__(self, *args, **kwargs):
    self.body = "green_slime"
    self.gender = "neuter"
    super().__init__(*args, **kwargs)
