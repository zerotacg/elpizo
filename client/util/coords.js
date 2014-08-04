import {Region} from "../map";

export function absoluteToContainingRegion(position) {
  return {
      arx: Math.floor(position.ax / Region.SIZE),
      ary: Math.floor(position.ay / Region.SIZE)
  };
}

export function regionToAbsolute(position) {
  return {
      ax: position.arx * Region.SIZE,
      ay: position.ary * Region.SIZE
  };
}
