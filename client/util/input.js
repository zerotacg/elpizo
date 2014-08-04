export class InputState {
  constructor(el) {
    this.keysDown = {};

    window.onkeydown = (e) => {
      this.keysDown[e.which] = true;
    };
    window.onkeyup = (e) => {
      delete this.keysDown[e.which];
    };
  }

  isPressed(which) {
    return !!this.keysDown[which];
  }
}
