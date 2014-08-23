module sprite from "client/graphics/sprite";
module geometry from "client/util/geometry";

export default = {
  "fixture.tree":
      new sprite.Sprite("fixture/tree.png", new geometry.Vector2(96, 96),
                        [new geometry.Vector2(0, 0)],
                        new geometry.Vector2(32, 64), 0),

  "item.carrot":
      new sprite.Sprite("item/carrot.png", new geometry.Vector2(32, 32),
                        [new geometry.Vector2(0, 0)],
                        new geometry.Vector2(0, 0), 0),

  "body.male.light":
      sprite.makeHumanoidSprite("body/male/light.png"),

  "facial.male.brown_beard":
      sprite.makeHumanoidSprite("facial/male/brown_beard.png"),

  "hair.male.brown_messy_1":
      sprite.makeHumanoidSprite("hair/male/brown_messy_1.png"),

  "equipment.male.white_longsleeve_shirt":
      sprite.makeHumanoidSprite("equipment/male/white_longsleeve_shirt.png"),

  "equipment.male.teal_pants":
      sprite.makeHumanoidSprite("equipment/male/teal_pants.png"),

  "equipment.male.brown_shoes":
      sprite.makeHumanoidSprite("equipment/male/brown_shoes.png"),

  "tile.grassland":
      sprite.makeAutotile("tiles/TileA2.png",
                          new geometry.Vector2(8 * 32, 6 * 32)),

  "tile.dirt":
      sprite.makeAutotile("tiles/TileA4.png",
                          new geometry.Vector2(0 * 32, 10 * 32)),

  "tile.dirt_wall":
      sprite.makeAutotile("tiles/TileA4.png",
                          new geometry.Vector2(0 * 32, 12 * 32)),

  "tile.stairs":
      sprite.makeAutotile("tiles/TileA5.png",
                          new geometry.Vector2(3 * 32, 8 * 32)),

  "building.roof":
      sprite.makeAutotile("tiles/TileA3.png",
                          new geometry.Vector2(0 * 32, -1 * 32)),

  "building.wall":
      sprite.makeAutotile("tiles/TileA3.png",
                          new geometry.Vector2(0 * 32, 1 * 32)),

  "building.ceiling":
      sprite.makeAutotile("tiles/TileA4.png",
                          new geometry.Vector2(4 * 32, 5 * 32)),

  "building.wall_internal":
      sprite.makeAutotile("tiles/TileA4.png",
                          new geometry.Vector2(4 * 32, 7 * 32))
};
