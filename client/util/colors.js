import {makeLinCongRand} from "./random";
module chroma from "chroma-js";

export function makeColor(seed) {
  var rand = makeLinCongRand(seed);
  return chroma.hsl(rand() * 360, 1.0, 0.75);
}

export function makeColorForString(s) {
  return makeColor([].reduce.call(s, (acc, x) =>
    ((acc << 5) + acc) + x.charCodeAt(0), 5381));
}
