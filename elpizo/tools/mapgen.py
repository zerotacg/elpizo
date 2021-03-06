import math
import logging
import json
import sys
from PIL import Image, ImageDraw
from lxml import etree
from functools import cmp_to_key

COLORS = {
    "ocean": 0x44447a,
    "coast": 0x33335a,
    "lakeshore": 0x225588,
    "lake": 0x336699,
    "river": 0x225588,
    "marsh": 0x2f6666,
    "ice": 0x99ffff,
    "beach": 0xa09077,
    "bridge": 0x686860,
    "lava": 0xcc3333,

    # Terrain
    "snow": 0xffffff,
    "tundra": 0xbbbbaa,
    "bare": 0x888888,
    "scorched": 0x555555,
    "taiga": 0x99aa77,
    "shrubland": 0x889977,
    "temperate_desert": 0xc9d29b,
    "temperate_rain_forest": 0x448855,
    "temperate_deciduous_forest": 0x679459,
    "grassland": 0x88aa55,
    "subtropical_desert": 0xd2b98b,
    "tropical_rain_forest": 0x337755,
    "tropical_seasonal_forest": 0x559944
}

TERRAIN_NAMES = {
    "ocean": "Ocean",
    "coast": "Coast",
    "lakeshore": "Lakeshore",
    "lake": "Lake",
    "river": "River",
    "marsh": "Marsh",
    "ice": "Ice",
    "beach": "Beach",
    "bridge": "Bridge",
    "lava": "Lave",

    # Terrain
    "snow": "Snow",
    "tundra": "Tundra",
    "bare": "Bare",
    "scorched": "Scorched",
    "taiga": "Taiga",
    "shrubland": "Shrubland",
    "temperate_desert": "Temperate Desert",
    "temperate_rain_forest": "Temperate Rain Forest",
    "temperate_deciduous_forest": "Temperate Deciduous Forest",
    "grassland": "Grassland",
    "subtropical_desert": "Subtropical Desert",
    "tropical_rain_forest": "Tropical Rain Forest",
    "tropical_seasonal_forest": "Tropical Seasonal Forest"
}

for c in COLORS:
  COLORS[c] = ((COLORS[c] & 0xff0000) >> 16,
               (COLORS[c] & 0x00ff00) >>  8,
               (COLORS[c] & 0x0000ff) >>  0)

REVERSE_COLORS = {v: k for k, v in COLORS.items()}

class Map(object):
  def __init__(self, tree):
    self.tree = tree

    self.centers = {}
    self.corners = {}
    self.edges = {}

  def populate(self):
    for center_elem in self.tree.find("centers"):
      self.centers[int(center_elem.attrib["id"])] = Center(center_elem)

    for corner_elem in self.tree.find("corners"):
      self.corners[int(corner_elem.attrib["id"])] = Corner(corner_elem)

    for edge_elem in self.tree.find("edges"):
      self.edges[int(edge_elem.attrib["id"])] = Edge(edge_elem)

    for id, center in self.centers.items():
      center.populate(self)

    for id, edge in self.edges.items():
      edge.populate(self)


class Center(object):
  def __init__(self, elem):
    self.elem = elem

    self.id = int(elem.attrib["id"])
    self.x = float(elem.attrib["x"])
    self.y = float(elem.attrib["y"])
    self.water = elem.attrib["water"] == "true"
    self.ocean = elem.attrib["ocean"] == "true"
    self.coast = elem.attrib["coast"] == "true"
    self.border = elem.attrib["border"] == "true"
    self.biome = elem.attrib["biome"]
    self.elevation = float(elem.attrib["elevation"])
    self.moisture = float(elem.attrib["moisture"])

    self.neighbors = []
    self.borders = []
    self.corners = []

  def populate(self, map):
    for neighbor_elem in self.elem.findall("center"):
      self.neighbors.append(map.centers[int(neighbor_elem.attrib["id"])])

    for corner_elem in self.elem.findall("corner"):
      self.corners.append(map.corners[int(corner_elem.attrib["id"])])

    for border_elem in self.elem.findall("edge"):
      self.borders.append(map.edges[int(border_elem.attrib["id"])])

  @property
  def point(self):
    return (self.x, self.y)

  def __repr__(self):
    return ("Center(id={id}, x={x}, y={y}, water={water}, ocean={ocean}, "
            "border={border}, biome={biome}, elevation={elevation}, "
            "moisture={moisture})").format(**self.__dict__)


class Corner(object):
  def __init__(self, elem):
    self.elem = elem

    self.id = int(elem.attrib["id"])
    self.x = float(elem.attrib["x"])
    self.y = float(elem.attrib["y"])
    self.water = elem.attrib["water"] == "true"
    self.ocean = elem.attrib["ocean"] == "true"
    self.coast = elem.attrib["coast"] == "true"
    self.border = elem.attrib["border"] == "true"
    self.elevation = float(elem.attrib["elevation"])
    self.moisture = float(elem.attrib["moisture"])
    self.river = int(elem.attrib["river"])

  @property
  def point(self):
    return (self.x, self.y)

  def __repr__(self):
    return ("Corner(id={id}, x={x}, y={y}, water={water}, ocean={ocean}, "
            "border={border}, elevation={elevation}, moisture={moisture}, "
            "river={river})").format(**self.__dict__)


class Edge(object):
  def __init__(self, elem):
    self.elem = elem

    self.id = int(elem.attrib["id"])
    self.river = int(elem.attrib["river"])
    self.road = 0

  def populate(self, map):
    self.center0 = map.centers[int(self.elem.attrib["center0"])] \
                   if "center0" in self.elem.attrib else None
    self.center1 = map.centers[int(self.elem.attrib["center1"])] \
                   if "center1" in self.elem.attrib else None

    self.corner0 = map.corners[int(self.elem.attrib["corner0"])] \
                   if "corner0" in self.elem.attrib else None
    self.corner1 = map.corners[int(self.elem.attrib["corner1"])] \
                   if "corner1" in self.elem.attrib else None

  @property
  def midpoint(self):
    return ((self.corner0.x + self.corner1.x) / 2,
            (self.corner0.y + self.corner1.y) / 2)

  @property
  def connections(self):
    for edge in self.center0.borders:
      if edge is self:
        continue
      yield edge

    for edge in self.center1.borders:
      if edge is self:
        continue
      yield edge

  def __repr__(self):
    return ("Edge(id={id}, x={x}, y={y}, river={river})").format(
        **self.__dict__)


def _clockwise_cmp_factory(center):
  cx, cy = center

  def clockwise_cmp(a, b):
    if a == b:
      return 0

    ax, ay = a
    bx, by = b

    angle1 = math.atan2(ay - cy, ax - cx)
    angle2 = math.atan2(by - cy, bx - cx)

    return (angle1 > angle2) - (angle1 < angle2)

  return clockwise_cmp


def make_map_image(tree, size, zoom_factor):
  logging.info("Parsing map...")
  map = Map(tree)
  map.populate()

  img = Image.new("RGB", (int(size * zoom_factor), int(size * zoom_factor)))

  ctx = ImageDraw.Draw(img)
  ctx.polygon([
      (0, 0),
      (0, size * zoom_factor),
      (size * zoom_factor, size * zoom_factor),
      (size * zoom_factor, 0),
  ], fill=COLORS["ocean"])

  logging.info("Filling polygons...")
  for center in map.centers.values():
    if center.biome == "ocean":
      continue

    points = []
    for corner in center.corners:
      points.append((corner.x * zoom_factor, corner.y * zoom_factor))
    points.sort(
        key=cmp_to_key(_clockwise_cmp_factory(
            (center.x * zoom_factor, center.y * zoom_factor))))

    color = COLORS[center.biome.lower()]

    ctx.polygon(points, fill=color)

  logging.info("Stroking rivers...")
  for edge in map.edges.values():
    if edge.river:
      if edge.center0.water or edge.center1.water:
        continue

      ctx.line([
          (edge.corner0.x * zoom_factor, edge.corner0.y * zoom_factor),
          (edge.corner1.x * zoom_factor, edge.corner1.y * zoom_factor)
      ], fill=COLORS["river"], width=int(edge.river / 1.5 * zoom_factor))

  img_data = img.load()

  return img


def map_image_to_json(img):
  img_data = img.load()

  for j in range(img.size[1]):
    for i in range(img.size[0]):
      yield REVERSE_COLORS[img_data[i, j]]


def main():
  logging.basicConfig(level=logging.INFO)

  if len(sys.argv) != 3:
    sys.stderr.write("usage: {} <mapgen2 xml> <image>\n".format(sys.argv[0]))
    sys.exit(1)

  SIZE = 600
  ZOOM_FACTOR = 2

  img = make_map_image(etree.parse(sys.argv[1]), SIZE, ZOOM_FACTOR)

  logging.info("Writing image...")
  img.save(sys.argv[2])

  logging.info("Writing json...")
  json.dump(list(map_image_to_json(img)), sys.stdout)


if __name__ == "__main__":
  main()
