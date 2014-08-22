export class Vector2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  copy() {
    return new Vector2(this.x, this.y);
  }

  map(f) {
    var out = this.copy();
    out.x = f(out.x);
    out.y = f(out.y);
    return out;
  }

  elementwise(f, other) {
    var out = this.copy();
    out.x = f(out.x, other.x);
    out.y = f(out.y, other.y);
    return out;
  }

  scale(k) {
    var out = this.copy();
    out.x *= k;
    out.y *= k;
    return out;
  }

  offset(other) {
    var out = this.copy();
    out.x += other.x;
    out.y += other.y;
    return out;
  }

  negate() {
    var out = this.copy();
    out.x = -out.x;
    out.y = -out.y;
    return out;
  }

  equals(other) {
    return this.x === other.x && this.y === other.y;
  }
}

export class Rectangle {
  constructor(left, top, width, height) {
    this.left = left;
    this.top = top;
    this.width = width;
    this.height = height;
  }

  copy() {
    return new Rectangle(this.left, this.top, this.width, this.height);
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
    var out = this.copy();
    out.left += vec.x;
    out.top += vec.y;
    return out;
  }

  scale(k) {
    var out = this.copy();
    out.width *= k;
    out.height *= k;
    return out;
  }

  equals(other) {
    return this.left === other.left && this.top === other.top &&
           this.width === other.width && this.height === other.height;
  }
}

Rectangle.fromCorners = (left, top, right, bottom) =>
    new Rectangle(left, top, right - left, bottom - top);
