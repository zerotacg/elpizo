export var REGION_SIZE = 16;

export function absoluteToContainingRegion(position) {
  return {
      arx: Math.floor(position.ax / REGION_SIZE),
      ary: Math.floor(position.ay / REGION_SIZE)
  };
}

export function regionToAbsolute(position) {
  return {
      ax: position.arx * REGION_SIZE,
      ay: position.ary * REGION_SIZE
  };
}

export function absoluteToRelative(position) {
  return {
      rx: position.ax % REGION_SIZE,
      ry: position.ay % REGION_SIZE
  }
};
