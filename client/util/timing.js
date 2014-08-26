export class CountdownTimer {
  constructor(max) {
    this.reset(max || 0);
  }

  reset(remaining) {
    this.remaining = remaining;
    this.max = remaining;
  }

  update(dt) {
    this.remaining = Math.max(0, this.remaining - dt);
  }

  isStopped() {
    return this.remaining == 0;
  }

  getElapsed() {
    return this.max - this.remaining;
  }

  getElapsedRatio() {
    return this.getElapsed() / this.max;
  }
}

export class Timed {
  constructor() {
    this.timers = {};
  }

  addTimer(name, timer) {
    this.timers[name] = timer;
  }

  removeTimer(name) {
    delete this.timers[name];
  }

  getTimer(name) {
    return this.timers[name] || null;
  }

  update(dt) {
    Object.keys(this.timers).forEach((k) => {
      this.timers[k].update(dt);
    });
  }

  areAllTimersStopped() {
    return Object.keys(this.timers).every((k) => {
      return this.timers[k].isStopped();
    });
  }

  areAnyTimersStopped() {
    return Object.keys(this.timers).some((k) => {
      return this.timers[k].isStopped();
    });
  }
}
