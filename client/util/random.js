export function makeLinCongRand(seed) {
  return () => {
    seed = (214013 * seed + 2531011) & 0x7fffffff;
    return (seed >> 16) / 32767;
  };
}
