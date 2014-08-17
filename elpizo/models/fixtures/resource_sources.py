from . import Fixture
from ... import game_pb2


class Tree(Fixture):
  REGISTRY_TYPE = "tree"
  BBOX = (-1, 0, 3, 1)

  def is_passable(self, location, direction):
    return True

  def on_contact(self, ctx):
    ctx.send(None, game_pb2.ChatPacket(target="chatroom.global",
                                       actor_name="a tree (server)",
                                       text="sup"))
