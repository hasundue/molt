import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { increase } from "./constraints.ts";

describe("increase", () => {
  function test(constraint: string, version: string, expected: string) {
    const actual = increase(constraint, version);
    assertEquals(
      actual,
      expected,
      `increase("${constraint}", "${version}")`,
    );
  }

  describe("for a fixed version", () => {
    it("should return it as is if it is equal to the given version", () => {
      test("0.0.1", "0.0.1", "0.0.1");
      test("0.1.0", "0.1.0", "0.1.0");
      test("1.0.0", "1.0.0", "1.0.0");
    });

    it("should increase it if it is smaller than the given version", () => {
      test("0.0.1", "0.0.2", "0.0.2");
      test("0.1.0", "0.1.1", "0.1.1");
      test("0.1.0", "0.1.2", "0.1.2");
      test("1.0.0", "1.0.1", "1.0.1");
      test("1.0.0", "1.1.0", "1.1.0");
      test("1.0.0", "2.0.0", "2.0.0");
    });
  });

  describe("for a wildcarded version", () => {
    it("should return it as is if the given version satisfies it", () => {
      test("1.2.x", "1.2.3", "1.2.x");
      test("1.2.*", "1.2.3", "1.2.*");
      test("1.x", "1.2.3", "1.x");
      test("1.*", "1.2.3", "1.*");
      test("*", "1.2.3", "*");
    });

    it("should increase the minimum version requirement if necessary", () => {
      test("1.2.x", "1.3.0", "1.3.x");
      test("1.2.*", "1.3.0", "1.3.*");
      test("1.x", "2.0.0", "2.x");
      test("1.*", "2.0.0", "2.*");
      test("*", "2.0.0", "*");
    });
  });

  describe("for a partial version", () => {
    it("should return it as is if the given version satisfies it", () => {
      test("0.0", "0.0.1", "0.0");
      test("0.1", "0.1.0", "0.1");
      test("0.1", "0.1.1", "0.1");
      test("1", "1.0.0", "1");
      test("1", "1.0.1", "1");
      test("1", "1.1.0", "1");
    });

    it("should increase the minimum version requirement if necessary", () => {
      test("0.1", "0.2.0", "0.2");
      test("0.1", "1.0.0", "1.0");
      test("0.1", "1.1.0", "1.1");
      test("1.1", "1.2.0", "1.2");
      test("1", "2.0.0", "2");
    });
  });

  describe("for a tilde version", () => {
    it("should return it as is if the given version satisfies it", () => {
      test("~0.0.1", "0.0.1", "~0.0.1");
      test("~0.0.1", "0.0.2", "~0.0.1");
      test("~0.1.0", "0.1.0", "~0.1.0");
      test("~0.1.0", "0.1.1", "~0.1.0");
      test("~1.0.0", "1.0.0", "~1.0.0");
      test("~1.0.0", "1.0.1", "~1.0.0");
    });

    it("should increase the minimum version requirement if necessary", () => {
      test("~0.1.0", "0.2.0", "~0.2.0");
      test("~1.0.0", "1.1.0", "~1.1.0");
      test("~1.0.0", "1.1.1", "~1.1.0");
      test("~1.0.0", "2.0.0", "~2.0.0");
      test("~1.0.0", "2.0.1", "~2.0.0");
      test("~1.0.0", "2.1.0", "~2.1.0");
      test("~1.0.0", "2.1.1", "~2.1.0");
    });
  });

  describe("for a caret version", () => {
    it("should return it as is if the given version satisfies it", () => {
      test("^0.0.1", "0.0.1", "^0.0.1");
      test("^0.1.0", "0.1.1", "^0.1.0");
      test("^0.1.1", "0.1.1", "^0.1.1");
      test("^0.1.1", "0.1.2", "^0.1.1");
      test("^1.0.0", "1.0.1", "^1.0.0");
      test("^1.0.0", "1.1.0", "^1.0.0");
    });

    it("should increase the minimum version requirement if necessary", () => {
      test("^0.0.1", "0.0.2", "^0.0.2");
      test("^0.1.0", "0.2.0", "^0.2.0");
      test("^0.1.0", "0.2.1", "^0.2.0");
      test("^0.1.1", "0.2.0", "^0.2.0");
      test("^1.0.0", "2.0.0", "^2.0.0");
      test("^1.0.0", "2.0.1", "^2.0.0");
      test("^1.0.0", "2.1.0", "^2.0.0");
      test("^1.1.0", "2.1.0", "^2.0.0");
    });
  });
});
