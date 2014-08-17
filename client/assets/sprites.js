import {Sprite, makeHumanoidSprite, makeAutotile} from "../graphics/sprite";

export default = {
  "fixture.tree":
      new Sprite("fixture/tree.png", {sw: 96, sh: 96}, [{sx: 0, sy: 0}],
                 {sx: 32, sy: 64}, 0),

  "item.carrot":
      new Sprite("item/carrot.png", {sw: 32, sh: 32}, [{sx: 0, sy: 0}],
                 {sx: 0, sy: 0}, 0),

  "body.male.light":
      makeHumanoidSprite("body/male/light.png"),

  "facial.male.brown_beard":
      makeHumanoidSprite("facial/male/brown_beard.png"),

  "hair.male.brown_messy_1":
      makeHumanoidSprite("hair/male/brown_messy_1.png"),

  "equipment.male.white_longsleeve_shirt":
      makeHumanoidSprite("equipment/male/white_longsleeve_shirt.png"),

  "equipment.male.teal_pants":
      makeHumanoidSprite("equipment/male/teal_pants.png"),

  "equipment.male.brown_shoes":
      makeHumanoidSprite("equipment/male/brown_shoes.png"),

  "tile.grassland":
      makeAutotile("tiles/grass.png"),

  "tile.grassland_wall":
      makeAutotile("tiles/grassland_wall.png")
};
