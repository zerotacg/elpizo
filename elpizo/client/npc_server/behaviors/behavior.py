class Behavior(object):
  REGISTRY = {}

  def __init__(self, protocol, npc):
    self.protocol = protocol
    self.npc = npc

  @classmethod
  def register(cls, subclass):
    cls.REGISTRY[subclass.NAME] = subclass
    return subclass

  def run(self):
    pass

  def on_damage(self, damage):
    pass

  def send(self, message):
    self.protocol.send(self.npc.id, message)
