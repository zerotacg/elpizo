class Vector2(object):
  def __init__(self, x, y):
    self.x = x
    self.y = y

  def map(self, f):
    return self.__class__(f(self.x), f(self.y))

  def elementwise(self, f, other):
    return self.__class__(f(self.x, other.x), f(self.y, other.y))

  def scale(self, k):
    return self.__class__(k * self.x, k * self.y)

  def offset(self, other):
    return self.__class__(self.x + other.x, self.y + other.y)

  def negate(self):
    return self.__class__(-self.x, -self.y)

  def __eq__(self, other):
    return self.x == other.x and self.y == other.y

  def __repr__(self):
    return "Vector2({x}, {y})".format(**self.__dict__)

  def __hash__(self):
    return hash((Vector2, self.x, self.y))


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
    return self.left < other.right and self.right > other.left and \
           self.top < other.bottom and self.bottom > other.top

  def contains(self, other):
    return self.left <= other.left and self.right >= other.right and \
           self.top <= other.top and self.bottom >= other.bottom

  def offset(self, vec):
    return self.__class__(self.left + vec.x, self.top + vec.y,
                     self.width, self.height)

  def scale(self, k):
    return self.__class__(self.left, self.top, k * self.width, k * self.height)

  def __eq__(self, other):
    return self.left == other.left and self.top == other.top and \
           self.width == other.width and self.height == other.height

  def __repr__(self):
    return "Rectangle({left}, {top}, {width}, {height})".format(**self.__dict__)

  def __hash__(self):
    return hash((Rectangle, self.left, self.top, self.width, self.height))
