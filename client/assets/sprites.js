import {repeat} from "../util/collections";

class Sprite {
  constructor(resourceName, sw, sh, speedFactor, frames, offset) {
    this.resourceName = resourceName;
    this.sw = sw;
    this.sh = sh;
    this.speedFactor = speedFactor;
    this.frames = frames;
    this.offset = offset;
  }

  render(resources, ctx, elapsed) {
    var frame = this.frames[
        Math.floor(elapsed * this.speedFactor) %
        this.frames.length];

    ctx.save();
    ctx.translate(-this.offset.sx, -this.offset.sy);
    ctx.drawImage(resources.get("sprites/" + this.resourceName),
                  frame.sx, frame.sy, this.sw, this.sh,
                  0, 0, this.sw, this.sh);
    ctx.restore();
  }
}

function makeStaticSprite(resourceName, sw, sh, speedFactor, frames, offset) {
  return {
      standing: {
          n: new Sprite(resourceName, sw, sh, speedFactor, frames, offset)
      }
  }
}

function makeHumanoidSprite(resourceName) {
  return {
      standing: {
          n: new Sprite(resourceName, 32, 64, 0, [{sx: 16, sy: 64 * 0}],
                        {sx: 0, sy: 32}),
          w: new Sprite(resourceName, 32, 64, 0, [{sx: 16, sy: 64 * 1}],
                        {sx: 0, sy: 32}),
          s: new Sprite(resourceName, 32, 64, 0, [{sx: 16, sy: 64 * 2}],
                        {sx: 0, sy: 32}),
          e: new Sprite(resourceName, 32, 64, 0, [{sx: 16, sy: 64 * 3}],
                        {sx: 0, sy: 32})
      },
      walking: {
          n: new Sprite(
              resourceName, 32, 64, 4,
              repeat(8, (i) => ({sx: 16 + 64 * (i + 1), sy: 64 * 8})),
              {sx: 0, sy: 32}),
          w: new Sprite(
              resourceName, 32, 64, 4,
              repeat(8, (i) => ({sx: 16 + 64 * (i + 1), sy: 64 * 9})),
              {sx: 0, sy: 32}),
          s: new Sprite(
              resourceName, 32, 64, 4,
              repeat(8, (i) => ({sx: 16 + 64 * (i + 1), sy: 64 * 10})),
              {sx: 0, sy: 32}),
          e: new Sprite(
              resourceName, 32, 64, 4,
              repeat(8, (i) => ({sx: 16 + 64 * (i + 1), sy: 64 * 11})),
              {sx: 0, sy: 32})
      }
  };
}

export default = {
  "Fixture.Tree":
      new Sprite("fixture/tree.png", 96, 96, 0, [{sx: 0, sy: 0}],
                 {sx: 32, sy: 64}),

  "Item.Carrot":
      new Sprite("item/carrot.png", 32, 32, 0, [{sx: 0, sy: 0}],
                 {sx: 0, sy: 0}),

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
      makeHumanoidSprite("equipment/male/brown_shoes.png")
};
