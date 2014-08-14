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

function makeTileSheet(resourceName, offset) {
  var SIZE = {sw: 16, sh: 16};

  return {
    none: [null, null, null, null],
    neConvexCorner: [
      null,
      null,
      new Sprite(resourceName, SIZE, [{sx: 48, sy: 32}], offset, 0),
      null
    ],
    nwConvexCorner: [
      null,
      null,
      null,
      new Sprite(resourceName, SIZE, [{sx:  0, sy: 32}], offset, 0)
    ],
    goingN: [
      null,
      null,
      new Sprite(resourceName, SIZE, [{sx: 16, sy: 32}], offset, 0),
      new Sprite(resourceName, SIZE, [{sx: 32, sy: 32}], offset, 0)
    ],
    swConvexCorner: [
      null,
      new Sprite(resourceName, SIZE, [{sx:  0, sy: 80}], offset, 0),
      null,
      null
    ],
    saddleNeSw: [
      null,
      new Sprite(resourceName, SIZE, [{sx:  0, sy: 80}], offset, 0),
      new Sprite(resourceName, SIZE, [{sx: 48, sy: 32}], offset, 0),
      null
    ],
    goingW: [
      null,
      new Sprite(resourceName, SIZE, [{sx:  0, sy: 48}], offset, 0),
      null,
      new Sprite(resourceName, SIZE, [{sx:  0, sy: 64}], offset, 0)
    ],
    nwConcaveCorner: [
      null,
      new Sprite(resourceName, SIZE, [{sx:  0, sy: 64}], offset, 0),
      new Sprite(resourceName, SIZE, [{sx: 32, sy: 32}], offset, 0),
      new Sprite(resourceName, SIZE, [{sx: 32, sy:  0}], offset, 0)
    ],
    seConvexCorner: [
      new Sprite(resourceName, SIZE, [{sx: 48, sy: 80}], offset, 0),
      null,
      null,
      null
    ],
    goingE: [
      new Sprite(resourceName, SIZE, [{sx: 48, sy: 48}], offset, 0),
      null,
      new Sprite(resourceName, SIZE, [{sx: 48, sy: 64}], offset, 0),
      null
    ],
    saddleNwSe: [
      new Sprite(resourceName, SIZE, [{sx: 48, sy: 80}], offset, 0),
      null,
      null,
      new Sprite(resourceName, SIZE, [{sx:  0, sy: 32}], offset, 0)
    ],
    seConvexCorner: [
      new Sprite(resourceName, SIZE, [{sx: 48, sy: 64}], offset, 0),
      null,
      new Sprite(resourceName, SIZE, [{sx: 48, sy:  0}], offset, 0),
      new Sprite(resourceName, SIZE, [{sx: 16, sy: 32}], offset, 0)
    ],
    goingS: [
      new Sprite(resourceName, SIZE, [{sx: 16, sy: 80}], offset, 0),
      new Sprite(resourceName, SIZE, [{sx: 32, sy: 80}], offset, 0),
      null,
      null
    ],
    seConcaveCorner: [
      new Sprite(resourceName, SIZE, [{sx: 48, sy: 16}], offset, 0),
      new Sprite(resourceName, SIZE, [{sx: 16, sy: 80}], offset, 0),
      new Sprite(resourceName, SIZE, [{sx: 48, sy: 48}], offset, 0),
      null
    ],
    swConcaveCorner: [
      new Sprite(resourceName, SIZE, [{sx: 32, sy: 80}], offset, 0),
      new Sprite(resourceName, SIZE, [{sx: 32, sy: 16}], offset, 0),
      null,
      new Sprite(resourceName, SIZE, [{sx:  0, sy: 48}], offset, 0)
    ],
    full: [
      new Sprite(resourceName, SIZE, [{sx: 16, sy: 48}], offset, 0),
      new Sprite(resourceName, SIZE, [{sx: 32, sy: 48}], offset, 0),
      new Sprite(resourceName, SIZE, [{sx: 16, sy: 64}], offset, 0),
      new Sprite(resourceName, SIZE, [{sx: 32, sy: 64}], offset, 0)
    ]
  };
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
      makeTileSheet("tiles/grass.png", {sx: 0, sy: 0})
};
