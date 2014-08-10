import {repeat} from "../util/collections";

class SpriteDef {
  constructor(resourceName, sw, sh, speedFactor, frames, center, xrayable) {
    this.resourceName = resourceName;
    this.sw = sw;
    this.sh = sh;
    this.speedFactor = speedFactor;
    this.frames = frames;
    this.center = center;
    this.xrayable = xrayable;
  }
}

function makeHumanoidSpriteDef(resourceName) {
  return {
      standing: {
          n: new SpriteDef(resourceName, 32, 64, 0, [{sx: 16, sy: 64 * 0}],
                           {sx: 0, sy: 32}, true),
          w: new SpriteDef(resourceName, 32, 64, 0, [{sx: 16, sy: 64 * 1}],
                           {sx: 0, sy: 32}, true),
          s: new SpriteDef(resourceName, 32, 64, 0, [{sx: 16, sy: 64 * 2}],
                           {sx: 0, sy: 32}, true),
          e: new SpriteDef(resourceName, 32, 64, 0, [{sx: 16, sy: 64 * 3}],
                           {sx: 0, sy: 32}, true)
      },
      walking: {
          n: new SpriteDef(
              resourceName, 32, 64, 4,
              repeat(8, (i) => ({sx: 16 + 64 * (i + 1), sy: 64 * 8})),
              {sx: 0, sy: 32}, true),
          w: new SpriteDef(
              resourceName, 32, 64, 4,
              repeat(8, (i) => ({sx: 16 + 64 * (i + 1), sy: 64 * 9})),
              {sx: 0, sy: 32}, true),
          s: new SpriteDef(
              resourceName, 32, 64, 4,
              repeat(8, (i) => ({sx: 16 + 64 * (i + 1), sy: 64 * 10})),
              {sx: 0, sy: 32}, true),
          e: new SpriteDef(
              resourceName, 32, 64, 4,
              repeat(8, (i) => ({sx: 16 + 64 * (i + 1), sy: 64 * 11})),
              {sx: 0, sy: 32}, true)
      }
  };
}

export default = {
  "Fixture.Tree": {
      standing: {
          n: new SpriteDef("fixture/tree.png", 96, 96, 0,
                           [{sx: 0, sy: 0}], {sx: 32, sy: 64}, false)
      }
  },

  "Body.Male.Light":
      makeHumanoidSpriteDef("body/male/light.png"),

  "Facial.Male.BrownBeard":
      makeHumanoidSpriteDef("facial/male/brown_beard.png"),

  "Hair.Male.BrownMessy1":
      makeHumanoidSpriteDef("hair/male/brown_messy_1.png"),

  "Equipment.Male.WhiteLongsleeveShirt":
      makeHumanoidSpriteDef("equipment/male/white_longsleeve_shirt.png"),

  "Equipment.Male.TealPants":
      makeHumanoidSpriteDef("equipment/male/teal_pants.png"),

  "Equipment.Male.BrownShoes":
      makeHumanoidSpriteDef("equipment/male/brown_shoes.png")
};
