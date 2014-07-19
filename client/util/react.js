export function classSet(classes) {
  return Object.keys(classes).filter(function (k) {
    return classes[k];
  }).join(" ");
}
