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
  "Tree": {
      standing: {
          n: new SpriteDef(
              "sprites.tree.small.oak", 96, 96, 0,
              [{sx: 0, sy: 0}], {sx: 32, sy: 64}, false)
      }
  },

  "body.male.light":
      makeHumanoidSpriteDef("sprites.body.male.light"),

  "facial.beard.brown":
      makeHumanoidSpriteDef("sprites.facial.beard.brown"),

  "hair.messy1.brown":
      makeHumanoidSpriteDef("sprites.hair.messy1.brown"),

  "torso.shirt.white_longsleeve_male":
      makeHumanoidSpriteDef("sprites.torso.shirt.white_longsleeve_male"),

  "legs.pants.teal_pants_male":
      makeHumanoidSpriteDef("sprites.legs.pants.teal_pants_male"),

  "feet.shoes.brown_shoes_male":
      makeHumanoidSpriteDef("sprites.feet.shoes.brown_shoes_male")
};
