module collections from "client/util/collections";
module geometry from "client/util/geometry";

export class Sprite {
  constructor(resourceName, size, frames, offset, speedFactor) {
    this.resourceName = resourceName;
    this.size = size;
    this.frames = frames;
    this.offset = offset;
    this.speedFactor = speedFactor || 0;
  }

  getResource(resources) {
    return resources.get("sprites/" + this.resourceName);
  }

  render(resources, ctx, elapsed) {
    var frame = this.frames[
        Math.floor(elapsed * this.speedFactor) %
        this.frames.length];

    ctx.save();
    ctx.translate(-this.offset.x, -this.offset.y);
    ctx.drawImage(this.getResource(resources),
                  frame.x, frame.y, this.size.x, this.size.y,
                  0, 0, this.size.x, this.size.y);
    ctx.restore();
  }
}

export function makeStaticSprite(resourceName, size, frames, offset, speedFactor) {
  return {
      standing: {
          n: new Sprite(resourceName, size, frames, offset, speedFactor)
      }
  }
}

export function makeHumanoidSprite(resourceName) {
  return {
      standing: {
          n: new Sprite(resourceName,
                        new geometry.Vector2(64, 64),
                        [new geometry.Vector2(0, 64 * 8)],
                        new geometry.Vector2(16, 32),
                        0),
          w: new Sprite(resourceName,
                        new geometry.Vector2(64, 64),
                        [new geometry.Vector2(0, 64 * 9)],
                        new geometry.Vector2(16, 32),
                        0),
          s: new Sprite(resourceName,
                        new geometry.Vector2(64, 64),
                        [new geometry.Vector2(0, 64 * 10)],
                        new geometry.Vector2(16, 32),
                        0),
          e: new Sprite(resourceName,
                        new geometry.Vector2(64, 64),
                        [new geometry.Vector2(0, 64 * 11)],
                        new geometry.Vector2(16, 32),
                        0)
      },
      walking: {
          n: new Sprite(
              resourceName,
              new geometry.Vector2(64, 64),
              collections.repeat(8, (i) =>
                  new geometry.Vector2(64 * (i + 1), 64 * 8)),
              new geometry.Vector2(16, 32),
              3),
          w: new Sprite(
              resourceName,
              new geometry.Vector2(64, 64),
              collections.repeat(8, (i) =>
                  new geometry.Vector2(64 * (i + 1), 64 * 9)),
              new geometry.Vector2(16, 32),
              3),
          s: new Sprite(
              resourceName,
              new geometry.Vector2(64, 64),
              collections.repeat(8, (i) =>
                  new geometry.Vector2(64 * (i + 1), 64 * 10)),
              new geometry.Vector2(16, 32),
              3),
          e: new Sprite(
              resourceName,
              new geometry.Vector2(64, 64),
              collections.repeat(8, (i) =>
                  new geometry.Vector2(64 * (i + 1), 64 * 11)),
              new geometry.Vector2(16, 32),
              3)
      },
      slashing: {
          n: new Sprite(
              resourceName,
              new geometry.Vector2(64, 64),
              collections.repeat(5, (i) =>
                  new geometry.Vector2(64 * (i + 1), 64 * 12)),
              new geometry.Vector2(16, 32),
              5),
          w: new Sprite(
              resourceName,
              new geometry.Vector2(64, 64),
              collections.repeat(5, (i) =>
                  new geometry.Vector2(64 * (i + 1), 64 * 13)),
              new geometry.Vector2(16, 32),
              5),
          s: new Sprite(
              resourceName,
              new geometry.Vector2(64, 64),
              collections.repeat(5, (i) =>
                  new geometry.Vector2(64 * (i + 1), 64 * 14)),
              new geometry.Vector2(16, 32),
              5),
          e: new Sprite(
              resourceName,
              new geometry.Vector2(64, 64),
              collections.repeat(5, (i) =>
                  new geometry.Vector2(64 * (i + 1), 64 * 15)),
              new geometry.Vector2(16, 32),
              5)
      }
  };
}

export function makeMobSprite(resourceName) {
  return {
      standing: {
          n: new Sprite(resourceName,
                        new geometry.Vector2(32, 32),
                        [new geometry.Vector2(0, 32 * 0)],
                        new geometry.Vector2(0, 0),
                        0),
          w: new Sprite(resourceName,
                        new geometry.Vector2(32, 32),
                        [new geometry.Vector2(0, 32 * 1)],
                        new geometry.Vector2(0, 0),
                        0),
          s: new Sprite(resourceName,
                        new geometry.Vector2(32, 32),
                        [new geometry.Vector2(0, 32 * 2)],
                        new geometry.Vector2(0, 0),
                        0),
          e: new Sprite(resourceName,
                        new geometry.Vector2(32, 32),
                        [new geometry.Vector2(0, 32 * 3)],
                        new geometry.Vector2(0, 0),
                        0)
      },
      walking: {
          n: new Sprite(
              resourceName,
              new geometry.Vector2(32, 32),
              collections.repeat(3, (i) =>
                  new geometry.Vector2(32 * i, 32 * 0)),
              new geometry.Vector2(0, 0),
              3),
          w: new Sprite(
              resourceName,
              new geometry.Vector2(32, 32),
              collections.repeat(3, (i) =>
                  new geometry.Vector2(32 * i, 32 * 1)),
              new geometry.Vector2(0, 0),
              3),
          s: new Sprite(
              resourceName,
              new geometry.Vector2(32, 32),
              collections.repeat(3, (i) =>
                  new geometry.Vector2(32 * i, 32 * 2)),
              new geometry.Vector2(0, 0),
              3),
          e: new Sprite(
              resourceName,
              new geometry.Vector2(32, 32),
              collections.repeat(3, (i) =>
                  new geometry.Vector2(32 * i, 32 * 3)),
              new geometry.Vector2(0, 0),
              3)
      },
      slashing: {
          n: new Sprite(
              resourceName,
              new geometry.Vector2(32, 32),
              collections.repeat(3, (i) =>
                  new geometry.Vector2(32 * i, 32 * 0)),
              new geometry.Vector2(0, 0),
              3),
          w: new Sprite(
              resourceName,
              new geometry.Vector2(32, 32),
              collections.repeat(3, (i) =>
                  new geometry.Vector2(32 * i, 32 * 1)),
              new geometry.Vector2(0, 0),
              3),
          s: new Sprite(
              resourceName,
              new geometry.Vector2(32, 32),
              collections.repeat(3, (i) =>
                  new geometry.Vector2(32 * i, 32 * 2)),
              new geometry.Vector2(0, 0),
              3),
          e: new Sprite(
              resourceName,
              new geometry.Vector2(32, 32),
              collections.repeat(3, (i) =>
                  new geometry.Vector2(32 * i, 32 * 3)),
              new geometry.Vector2(0, 0),
              3)
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

export function makeAutotile(resourceName, offset) {
  return AUTOTILE_TEXCOORDS.map((coords) => {
      return coords.map((i) =>
          new Sprite(
              resourceName,
              new geometry.Vector2(16, 16),
              [(new geometry.Vector2((i % 4) * 16, Math.floor(i / 4) * 16))
                  .offset(offset)],
              new geometry.Vector2(0, 0),
              0));
  });
}
