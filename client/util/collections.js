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

export function countingSort(numBuckets, xs, f) {
  var buckets = new Array(numBuckets);
  for (var i = 0; i < numBuckets; ++i) {
    buckets[i] = [];
  }
  xs.forEach((x) => {
    buckets[f(x)] = x;
  });
  return buckets;
}
