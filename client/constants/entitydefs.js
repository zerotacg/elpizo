import {Sprite, EntityDef} from "../graphics/sprite";

export default = {
  tree: {
    oak: new EntityDef(() => new Sprite("entities/tree", 96, 96, 0,
                                        [{sx: 0, sy: 0}]),
                       {ax: 1, ay: 2}, false)
  },
  human: {
    man: new EntityDef(() => new Sprite("entities/man", 32, 64, 0,
                                        [{sx: 0, sy: 0}]),
                       {ax: 0, ay: 1}, true)
  }
};
