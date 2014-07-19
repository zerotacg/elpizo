export var hasOwnProp = Object.prototype.hasOwnProperty;

export function extend(dest, src) {
  for (var k in src) {
    if (!hasOwnProp.call(src, k)) {
      continue;
    }

    dest[k] = src[k];
  }

  return dest;
}

export var nextMonotonicId = (function () {
  var id = 0;

  return function () {
    var i = id;
    ++id;
    return "monotonic-id-" + i;
  }
})();
