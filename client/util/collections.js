export function repeat(n, f) {
  return Array.apply(null, new Array(n)).map(f);
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

export function countingSort(numBuckets, xs, f) {
  var buckets = repeat(numBuckets, () => []);;
  xs.forEach((x) => {
    buckets[f(x)] = x;
  });
  return [].concat.apply([], buckets);
}
