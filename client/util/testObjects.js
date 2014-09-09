module objects from "client/util/objects";

module assert from "assert";

describe("extend", () => {
  it("copies source attributes", () => {
    var dest = {};
    objects.extend(dest, {a: 1});
    assert.deepEqual({a: 1}, dest);
  });

  it("overwrites destination attributes", () => {
    var dest = {a: 2};
    objects.extend(dest, {a: 1});
    assert.deepEqual({a: 1}, dest);
  });

  it("returns destination", () => {
    var dest = {};
    var src = {a: 1};
    assert.strictEqual(objects.extend(dest, src), dest);
  });

  it("overwrites from right to left", () => {
    var dest = {a: 2};
    objects.extend(dest, {a: 1}, {b: 3}, {a: 5});
    assert.deepEqual({a: 1, b: 3}, dest);
  })
});
