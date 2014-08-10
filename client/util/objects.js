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
