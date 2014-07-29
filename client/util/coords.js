import {Region} from "../map";

export function absoluteToContainingRegion(ax, ay) {
  return {
      arx: Math.floor(ax / Region.SIZE),
      ary: Math.floor(ay / Region.SIZE)
  };
}

export function absoluteToBoundingRegion(ax, ay) {
  return {
      arw: Math.ceil(ax / Region.SIZE),
      arh: Math.ceil(ay / Region.SIZE)
  };
}

export function regionToAbsolute(arx, ary) {
  return {
      ax: arx * Region.SIZE,
      ay: ary * Region.SIZE
  };
}
