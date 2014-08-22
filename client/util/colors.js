module chroma from "chroma-js";

module random from "client/util/random";

export function makeColor(seed) {
  var rand = random.makeLinCongRand(seed);
  return chroma.hsl(rand() * 360, 1.0, 0.75);
}

export function makeColorForString(s) {
  return makeColor([].reduce.call(s, (acc, x) =>
    ((acc << 5) + acc) + x.charCodeAt(0), 5381));
}

export function contrasting(color) {
  var [h, _, _] = chroma(color).hsl();
  return chroma.hsl(h, 0.75, 0.25);
}
