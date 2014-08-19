import {Sprite, makeHumanoidSprite, makeAutotile} from "../graphics/sprite";
import {Vector2} from "../util/geometry";

export default = {
  "fixture.tree":
      new Sprite("fixture/tree.png", new Vector2(96, 96), [new Vector2(0, 0)],
                 new Vector2(32, 64), 0),

  "item.carrot":
      new Sprite("item/carrot.png", new Vector2(32, 32), [new Vector2(0, 0)],
                 new Vector2(0, 0), 0),

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
      makeAutotile("tiles/TileA2.png", new Vector2(8 * 32, 6 * 32)),

  "tile.dirt":
      makeAutotile("tiles/TileA4.png", new Vector2(0 * 32, 10 * 32)),

  "tile.dirt_wall":
      makeAutotile("tiles/TileA4.png", new Vector2(0 * 32, 12 * 32)),

  "building.roof":
      makeAutotile("tiles/TileA3.png", new Vector2(0 * 32, -1 * 32)),

  "building.wall":
      makeAutotile("tiles/TileA3.png", new Vector2(0 * 32, 1 * 32)),

  "building.ceiling":
      makeAutotile("tiles/TileA4.png", new Vector2(4 * 32, 5 * 32)),

  "building.wall_internal":
      makeAutotile("tiles/TileA4.png", new Vector2(4 * 32, 7 * 32))
};
