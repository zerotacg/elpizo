export class Vector2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  elementwise(f) {
    return new Vector2(f(this.x), f(this.y));
  }

  scale(k) {
    return new Vector2(k * this.x, k * this.y);
  }

  offset(other) {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  negate() {
    return new Vector2(-this.x, -this.y);
  }
}

export class Rectangle {
  constructor(left, top, width, height) {
    this.left = left;
    this.top = top;
    this.width = width;
    this.height = height;
  }

  getTopLeft() {
    return new Vector2(this.left, this.top);
  }

  getBottomRight() {
    return new Vector2(this.getRight(), this.getBottom());
  }

  getRight() {
    return this.left + this.width;
  }

  getBottom() {
    return this.top + this.height;
  }

  intersects(other) {
    return this.left <= other.getRight() && this.getRight() > other.left &&
           this.top <= other.getBottom() && this.getBottom() > other.top;
  }

  contains(vec) {
    return this.left <= vec.x && this.getRight() > vec.x &&
           this.top <= vec.y && this.getBottom() > vec.y;
  }

  offset(vec) {
    return new Rectangle(this.left + vec.x, this.top + vec.y,
                         this.width, this.height);
  }
}

Rectangle.fromCorners = (left, top, right, bottom) =>
    new Rectangle(left, top, right - left, bottom - top);
