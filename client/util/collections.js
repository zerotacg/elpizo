export function repeat(n, f) {
  var xs = new Array(n);
  for (var i = 0; i < n; ++i) {
    xs[i] = f(i);
  }
  return xs;
}

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

export function countingSort(numBuckets, f, xs) {
  var buckets = repeat(numBuckets, () => []);
  xs.forEach((x) => {
    buckets[f(x)].push(x);
  });
  return [].concat.apply([], buckets);
}
