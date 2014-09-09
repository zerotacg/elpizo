module collections from "client/util/collections";

module assert from "assert";

describe("repeat", () => {
  it("repeats 0", () => {
    assert.deepEqual([], collections.repeat(0));
  });

  it("repeats constant", () => {
    assert.deepEqual([1, 1, 1, 1, 1], collections.repeat(5, () => 1));
  });

  it("repeats function", () => {
    assert.deepEqual([0, 1, 2, 3, 4], collections.repeat(5, (i) => i));
  });
});

describe("nubBy", () => {
  it("nubs nothing with non-repeated sequence", () => {
    assert.deepEqual([0, 1, 2, 3, 4],
                     collections.nubBy([0, 1, 2, 3, 4], (x) => x));
  });

  it("nubs with identity projection", () => {
    assert.deepEqual([0, 1, 2, 3],
                     collections.nubBy([0, 1, 2, 3, 3], (x) => x));
  });

  it("nubs with projection and keeps order", () => {
    assert.deepEqual(["hello", "cat"],
                     collections.nubBy(["hello", "world", "cat"],
                                       (s) => s.length));
  });
});
