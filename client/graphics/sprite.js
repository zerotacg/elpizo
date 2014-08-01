export class Sprite {
  constructor(def, frames) {
    this.def = def;
    this.frameIndex = 0;
  }

  render(resources, dt, ctx) {
    this.frameIndex += this.speed * dt;

    var frame = this.def.speed > 0
                ? this.def.frames[Math.floor(this.frameIndex) %
                                  this.def.frames.length]
                : this.def.frames[0];

    ctx.drawImage(resources.get(this.def.resourceName),
                  frame.sx, frame.sy,
                  this.def.sw, this.def.sh,
                  0, 0,
                  this.def.sw, this.def.sh);
  }
}
