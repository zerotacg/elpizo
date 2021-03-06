export function repeat(n, f) {
  var xs = new Array(n);
  for (var i = 0; i < n; ++i) {
    xs[i] = f(i);
  }
  return xs;
}

export function nubBy(xs, f) {
  var seen = {};
  var ys = [];
  xs.forEach((x) => {
    var k = f(x);
    if (!seen[k]) {
      ys.push(x);
      seen[k] = true;
    }
  });
  return ys;
}
