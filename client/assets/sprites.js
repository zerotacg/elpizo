import {repeat} from "../util/collections";

class Sprite {
  constructor(resourceName, size, frames, offset, speedFactor) {
    this.resourceName = resourceName;
    this.size = size;
    this.frames = frames;
    this.offset = offset;
    this.speedFactor = speedFactor || 0;
  }

  render(resources, ctx, elapsed) {
    var frame = this.frames[
        Math.floor(elapsed * this.speedFactor) %
        this.frames.length];

    ctx.save();
    ctx.translate(-this.offset.sx, -this.offset.sy);
    ctx.drawImage(resources.get("sprites/" + this.resourceName),
                  frame.sx, frame.sy, this.size.sw, this.size.sh,
                  0, 0, this.size.sw, this.size.sh);
    ctx.restore();
  }
}

function makeStaticSprite(resourceName, size, frames, offset, speedFactor) {
  return {
      standing: {
          n: new Sprite(resourceName, size, frames, offset, speedFactor)
      }
  }
}

function makeHumanoidSprite(resourceName) {
  return {
      standing: {
          n: new Sprite(resourceName, {sw: 32, sh: 64}, [{sx: 16, sy: 64 * 0}],
                        {sx: 0, sy: 32}, 0),
          w: new Sprite(resourceName, {sw: 32, sh: 64}, [{sx: 16, sy: 64 * 1}],
                        {sx: 0, sy: 32}, 0),
          s: new Sprite(resourceName, {sw: 32, sh: 64}, [{sx: 16, sy: 64 * 2}],
                        {sx: 0, sy: 32}, 0),
          e: new Sprite(resourceName, {sw: 32, sh: 64}, [{sx: 16, sy: 64 * 3}],
                        {sx: 0, sy: 32}, 0)
      },
      walking: {
          n: new Sprite(
              resourceName, {sw: 32, sh: 64},
              repeat(8, (i) => ({sx: 16 + 64 * (i + 1), sy: 64 * 8})),
              {sx: 0, sy: 32}, 4),
          w: new Sprite(
              resourceName, {sw: 32, sh: 64},
              repeat(8, (i) => ({sx: 16 + 64 * (i + 1), sy: 64 * 9})),
              {sx: 0, sy: 32}, 4),
          s: new Sprite(
              resourceName, {sw: 32, sh: 64},
              repeat(8, (i) => ({sx: 16 + 64 * (i + 1), sy: 64 * 10})),
              {sx: 0, sy: 32}, 4),
          e: new Sprite(
              resourceName, {sw: 32, sh: 64},
              repeat(8, (i) => ({sx: 16 + 64 * (i + 1), sy: 64 * 11})),
              {sx: 0, sy: 32}, 4)
      }
  };
}

var AUTOTILE_TEXCOORDS = [
    [13, 14, 17, 18], [ 2, 14, 17, 18], [13,  3, 17, 18], [ 2,  3, 17, 18],
    [13, 14, 17,  7], [ 2, 14, 17,  7], [13,  3, 17,  7], [ 2,  3, 17,  7],
    [13, 14,  6, 18], [ 2, 14,  6, 18], [13,  3,  6, 18], [ 2,  3,  6, 18],
    [13, 14,  6,  7], [ 2, 14,  6,  7], [13,  3,  6,  7], [ 2,  3,  6,  7],
    [12, 14, 16, 18], [12,  3, 16, 18], [12, 14, 16,  7], [12,  3, 16,  7],
    [ 9, 10, 17, 18], [ 9, 10, 17,  7], [ 9, 10,  6, 18], [ 9, 10,  6,  7],
    [13, 15, 17, 19], [13, 15,  6, 19], [ 2, 15, 17, 19], [ 2, 15,  6, 19],
    [13, 14, 21, 22], [ 2, 14, 21, 22], [13,  3, 21, 22], [ 2,  3, 21, 22],
    [12, 15, 16, 19], [ 9, 10, 21, 22], [ 8,  9, 12, 13], [ 8,  9, 12,  7],
    [10, 11, 14, 15], [10, 11,  6, 15], [18, 19, 22, 23], [ 2, 19, 22, 23],
    [16, 17, 20, 21], [16,  3, 20, 21], [ 8, 11, 12, 15], [ 8,  9, 20, 21],
    [16, 19, 20, 23], [10, 11, 22, 23], [ 8, 11, 20, 23], [ 0,  1,  4,  5]
];

function makeAutotile(resourceName) {
  var SIZE = {sw: 16, sh: 16};

  return AUTOTILE_TEXCOORDS.map((coords) => {
      return coords.map((i) =>
          new Sprite(resourceName, SIZE,
                     [{sx: (i % 4) * 16, sy: Math.floor(i / 4) * 16}],
                     {sx: 0, sy: 0}, 0));
  });
}

export default = {
  "Fixture.Tree":
      new Sprite("fixture/tree.png", {sw: 96, sh: 96}, [{sx: 0, sy: 0}],
                 {sx: 32, sy: 64}, 0),

  "Item.Carrot":
      new Sprite("item/carrot.png", {sw: 32, sh: 32}, [{sx: 0, sy: 0}],
                 {sx: 0, sy: 0}, 0),

  "Body.Male.Light":
      makeHumanoidSprite("body/male/light.png"),

  "Facial.Male.BrownBeard":
      makeHumanoidSprite("facial/male/brown_beard.png"),

  "Hair.Male.BrownMessy1":
      makeHumanoidSprite("hair/male/brown_messy_1.png"),

  "Equipment.Male.WhiteLongsleeveShirt":
      makeHumanoidSprite("equipment/male/white_longsleeve_shirt.png"),

  "Equipment.Male.TealPants":
      makeHumanoidSprite("equipment/male/teal_pants.png"),

  "Equipment.Male.BrownShoes":
      makeHumanoidSprite("equipment/male/brown_shoes.png"),

  "Tiles.Grassland":
      makeAutotile("tiles/grass.png"),

  "Tiles.GrasslandWall":
      makeAutotile("tiles/grassland_wall.png")
};
