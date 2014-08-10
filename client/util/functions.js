export function debounce(f, delay) {
  var timeout;

  return () => {
    var args = arguments;

    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      timeout = null;
      f.apply(this, args);
    }, delay);

    if (!timeout) {
      f.apply(this, args)
    }
  };
}
