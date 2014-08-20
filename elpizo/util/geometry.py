class Vector2(object):
  def __init__(self, x, y):
    self.x = x
    self.y = y

  def elementwise(self, f):
    return Vector2(f(self.x), f(self.y))

  def scale(self, k):
    return Vector2(k * self.x, k * self.y)

  def offset(self, other):
    return Vector2(self.x + other.x, self.y + other.y)

  def negate(self):
    return Vector2(-self.x, -self.y)

  def __eq__(self, other):
    return self.x == other.x and self.y == other.y


class Rectangle(object):
  def __init__(self, left, top, width, height):
    self.left = left
    self.top = top
    self.width = width
    self.height = height

  @property
  def right(self):
    return self.left + self.width

  @property
  def bottom(self):
    return self.top + self.height

  @property
  def top_left(self):
    return Vector2(self.left, self.top)

  @property
  def bottom_right(self):
    return Vector2(self.bottom, self.right)

  def intersects(self, other):
    return self.left <= other.right and self.right > other.left and \
           self.top <= other.bottom and self.bottom > other.top;

  def contains(self, vec):
    return self.left <= vec.x and self.right > vec.x and \
           self.top <= vec.y and self.bottom > vec.y

  def offset(self, vec):
    return Rectangle(self.left + vec.x, self.top + vec.y,
                     self.width, self.height)

  def scale(self, k):
    return Rectangle(self.left, self.top, k * self.width, k * self.height);

  def __eq__(self, other):
    return self.left == other.left and self.top == other.top and \
           self.width == other.width and self.height == other.height
