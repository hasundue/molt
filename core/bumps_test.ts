import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { get } from "./bumps.ts";
import { parse } from "./specs.ts";

describe("bump", () => {
  it("should bump a constrianted jsr dep with a lock", () => {
    assertEquals(
      get(
        { ...parse("jsr:@std/jsonc@^0.222.1"), locked: "0.222.1" },
        { latest: "1.0.0-rc.3", released: "0.224.3" },
      ),
      { constraint: "^0.224.0", lock: "0.224.3" },
    );
  });

  it("should bump a constrianted jsr dep without a lock", () => {
    assertEquals(
      get(
        parse("jsr:@std/jsonc@^0.222.1"),
        { latest: "1.0.0-rc.3", released: "0.224.3" },
      ),
      { constraint: "^0.224.0" },
    );
  });

  it("should bump a fixed jsr dep with a lock", () => {
    assertEquals(
      get(
        { ...parse("jsr:@std/jsonc@0.222.1"), locked: "0.222.1" },
        { latest: "1.0.0-rc.3", released: "0.224.3" },
      ),
      { constraint: "0.224.3", lock: "0.224.3" },
    );
  });

  it("should bump a fixed jsr dep without a lock", () => {
    assertEquals(
      get(
        parse("jsr:@std/jsonc@0.222.1"),
        { latest: "1.0.0-rc.3", released: "0.224.3" },
      ),
      { constraint: "0.224.3" },
    );
  });
});
