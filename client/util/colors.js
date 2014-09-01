module chroma from "chroma-js";

module random from "client/util/random";

export function makeColor(seed) {
  var rand = random.makeLinCongRand(seed);
  return chroma.hsv(rand() * 360, 1.0, 0.8);
}

export function makeColorForString(s) {
  return makeColor([].reduce.call(s, (acc, x) =>
    ((acc << 5) + acc) + x.charCodeAt(0), 5381));
}
