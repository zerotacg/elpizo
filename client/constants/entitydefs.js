import {Sprite} from "../graphics/sprite";

class EntityDef {
  constructor(spriteDef, center, xrayable) {
    this.spriteDef = spriteDef;
    this.center = center;
    this.xrayable = xrayable;
  }
}

class SpriteDef {
  constructor(resourceName, sw, sh, speed, frames) {
    this.resourceName = resourceName;
    this.sw = sw;
    this.sh = sh;
    this.speed = speed;
    this.frames = frames;
  }
}

export default = {
  tree: {
    oak: new EntityDef(new SpriteDef("entities/tree", 96, 96, 0, [{sx: 0, sy: 0}]),
                       {ax: 1, ay: 2}, false)
  },
  human: {
    man: new EntityDef(new SpriteDef("entities/man", 32, 64, 0, [{sx: 0, sy: 0}]),
                       {ax: 0, ay: 1}, true)
  }
};
