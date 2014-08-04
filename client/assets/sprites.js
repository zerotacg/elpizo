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

function makeStandingSpriteDef(resourceName) {
  return {
      n: new SpriteDef(resourceName, 32, 64, 0, [{sx: 16, sy: 64 * 0}],
                       {sx: 0, sy: 32}, true),
      w: new SpriteDef(resourceName, 32, 64, 0, [{sx: 16, sy: 64 * 1}],
                       {sx: 0, sy: 32}, true),
      s: new SpriteDef(resourceName, 32, 64, 0, [{sx: 16, sy: 64 * 2}],
                       {sx: 0, sy: 32}, true),
      e: new SpriteDef(resourceName, 32, 64, 0, [{sx: 16, sy: 64 * 3}],
                       {sx: 0, sy: 32}, true)
  };
}

function makeWalkingSpriteDef(resourceName) {
  return {
      n: new SpriteDef(
          resourceName, 32, 64, 4,
          repeat(8, (i) => ({sx: 16 + 64 * (i + 1), sy: 64 * 0})),
          {sx: 0, sy: 32}, true),
      w: new SpriteDef(
          resourceName, 32, 64, 4,
          repeat(8, (i) => ({sx: 16 + 64 * (i + 1), sy: 64 * 1})),
          {sx: 0, sy: 32}, true),
      s: new SpriteDef(
          resourceName, 32, 64, 4,
          repeat(8, (i) => ({sx: 16 + 64 * (i + 1), sy: 64 * 2})),
          {sx: 0, sy: 32}, true),
      e: new SpriteDef(
          resourceName, 32, 64, 4,
          repeat(8, (i) => ({sx: 16 + 64 * (i + 1), sy: 64 * 3})),
          {sx: 0, sy: 32}, true)
  };
}

export default = {
  tree: {
      oak: {
          standing: {
              n: new SpriteDef(
                  "entities/tree", 96, 96, 0,
                  [{sx: 0, sy: 0}], {sx: 32, sy: 64}, false)
          }
      }
  },
  human: {
      man: {
          standing: makeStandingSpriteDef("entities/man"),
          walking: makeWalkingSpriteDef("entities/man")
      }
  },
  equipment: {
      "man-pants": {
          standing: makeStandingSpriteDef("entities/man-pants"),
          walking: makeStandingSpriteDef("entities/man-pants")
      }
  }
};
