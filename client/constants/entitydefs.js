import {Sprite, EntityDef} from "../graphics/sprite";

export default = {
  tree: {
    oak: new EntityDef(() => new Sprite("entities/tree", 96, 96, 0,
                                        [{sx: 0, sy: 0}]),
                       {aLeft: 1, aTop: 2, aRight: 2, aBottom: 1})
  },
  human: {
    man: new EntityDef(() => new Sprite("entities/man", 32, 64, 0,
                                        [{sx: 0, sy: 0}]),
                       {aLeft: 0, aTop: 1, aRight: 1, aBottom: 2})
  }
};
