export class Sprite {
  constructor(resourceName, sw, sh, speed, frames) {
    this.resourceName = resourceName;
    this.sw = sw;
    this.sh = sh;
    this.speed = speed;
    this.frames = frames;

    this._frameIndex = 0;
  }

  update(dt) {
    this._frameIndex += this.speed * dt;
  }

  render(resources, ctx) {
    var frame = this.speed > 0
                ? this.frames[Math.floor(this._frame) % this.frames.length]
                : this.frames[0];

    ctx.drawImage(resources.get(this.resourceName),
                  frame.sx, frame.sy,
                  this.sw, this.sh,
                  0, 0,
                  this.sw, this.sh);
  }
}

export class EntityDef {
  constructor(makeSprite, baseBox) {
    this.makeSprite = makeSprite;
    this.baseBox = baseBox;
  }
}
