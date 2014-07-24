export function nubStrings(xs) {
  var seen = {};
  var ys = [];
  xs.forEach((x) => {
    if (!seen[x]) {
      ys.push(x);
      seen[x] = true;
    }
  });
  return ys;
}
