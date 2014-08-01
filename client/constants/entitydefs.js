import {repeat} from "../util/collections";

class EntityDef {
  constructor(spriteDefs, center, xrayable) {
    this.spriteDefs = spriteDefs;
    this.center = center;
    this.xrayable = xrayable;
  }
}

class SpriteDef {
  constructor(resourceName, sw, sh, speedFactor, frames) {
    this.resourceName = resourceName;
    this.sw = sw;
    this.sh = sh;
    this.speedFactor = speedFactor;
    this.frames = frames;
  }
}

export default = {
  tree: {
    oak: new EntityDef({
        standing: {
            s: new SpriteDef("entities/tree", 96, 96, 0,
                [{sx: 0, sy: 0}])
        }
    }, {ax: 1, ay: 2}, false)
  },
  human: {
    man: new EntityDef({
        standing: {
            n: new SpriteDef("entities/man", 32, 64, 0,
                [{sx: 16, sy: 64 * 0}]),
            e: new SpriteDef("entities/man", 32, 64, 0,
                [{sx: 16, sy: 64 * 1}]),
            s: new SpriteDef("entities/man", 32, 64, 0,
                [{sx: 16, sy: 64 * 2}]),
            w: new SpriteDef("entities/man", 32, 64, 0,
                [{sx: 16, sy: 64 * 3}]),
        },
        walking: {
            n: new SpriteDef("entities/man", 32, 64, 4,
                repeat(8, (i) => ({sx: 16 + 64 * (i + 1), sy: 64 * 0}))),
            e: new SpriteDef("entities/man", 32, 64, 4,
                repeat(8, (i) => ({sx: 16 + 64 * (i + 1), sy: 64 * 1}))),
            s: new SpriteDef("entities/man", 32, 64, 4,
                repeat(8, (i) => ({sx: 16 + 64 * (i + 1), sy: 64 * 2}))),
            w: new SpriteDef("entities/man", 32, 64, 4,
                repeat(8, (i) => ({sx: 16 + 64 * (i + 1), sy: 64 * 3}))),
        }
    }, {ax: 0, ay: 1}, true)
  }
};
