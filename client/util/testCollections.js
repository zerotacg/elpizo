module collections from "client/util/collections";

module assert from "assert";
module should from "should";

describe("repeat", () => {
  it("repeats 0", () => {
    assert.deepEqual(collections.repeat(0), []);
  });

  it("repeats constant", () => {
    assert.deepEqual(collections.repeat(5, () => 1), [1, 1, 1, 1, 1]);
  });

  it("repeats function", () => {
    assert.deepEqual(collections.repeat(5, (i) => i), [0, 1, 2, 3, 4]);
  });
});

describe("nubBy", () => {
  it("nubs nothing with non-repeated sequence", () => {
    assert.deepEqual(collections.nubBy([0, 1, 2, 3, 4], (x) => x),
                     [0, 1, 2, 3, 4]);
  });

  it("nubs with identity projection", () => {
    assert.deepEqual(collections.nubBy([0, 1, 2, 3, 3], (x) => x),
                     [0, 1, 2, 3]);
  });

  it("nubs with projection and keeps order", () => {
    assert.deepEqual(collections.nubBy(["hello", "world", "cat"],
                                       (s) => s.length),
                     ["hello", "cat"]);
  });
});
