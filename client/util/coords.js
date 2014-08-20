export var REGION_SIZE = 16;

export function absoluteToContainingRegion(position) {
  return position.scale(1 / REGION_SIZE).map(Math.floor);
}

export function regionToAbsolute(position) {
  return position.scale(REGION_SIZE);
}

export function absoluteToRelative(position) {
  return position.map((v) => v % REGION_SIZE);
};
