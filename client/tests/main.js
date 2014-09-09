module assert from "assert";
module should from "should";

describe("test", () => {
  it("should be true", () => {
    assert(true);
  });

  it("should fail", () => {
    assert(false);
  });
});
