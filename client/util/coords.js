import {Region} from "../map";

export function absoluteToContainingRegion(ax, ay) {
  return {
      arx: Math.floor(ax / Region.SIZE),
      ary: Math.floor(ay / Region.SIZE)
  };
}

export function regionToAbsolute(arx, ary) {
  return {
      ax: arx * Region.SIZE,
      ay: ary * Region.SIZE
  };
}
