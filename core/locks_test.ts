import * as fs from "@chiezo/amber/fs";
import { assertEquals } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { parse } from "./specs.ts";
import { create, extract, type LockfileJson, query } from "./locks.ts";

export const LOCKFILE: LockfileJson = JSON.parse(`{
  "version": "3",
  "packages": {
    "specifiers": {
      "jsr:@std/assert@^0.222.0": "jsr:@std/assert@0.222.0",
      "jsr:@std/fmt@^0.222.0": "jsr:@std/fmt@0.222.0",
      "npm:debug@^4.3.0": "npm:debug@4.3.0"
    },
    "jsr": {
      "@std/assert@0.222.0": {
        "integrity": "cbf00c0d8125a56c087e3d1ea0e638760d47206b30e9d300bad826b811719fc7",
        "dependencies": [
          "jsr:@std/fmt@^0.222.0"
        ]
      },
      "@std/fmt@0.222.0": {
        "integrity": "0eb99babf1cc697d67e76e8753916c037bbc3ce4abcefa321e1465708b0adda1"
      }
    },
    "npm": {
      "debug@4.3.0": {
        "integrity": "sha512-jjO6JD2rKfiZQnBoRzhRTbXjHLGLfH+UtGkWLc/UXAh/rzZMyjbgn0NcfFpqT8nd1kTtFnDiJcrIFkq4UKeJVg==",
        "dependencies": { "ms": "ms@2.1.2" }
      },
      "ms@2.1.2": {
        "integrity": "sha512-sGkPx+VjMtmA6MX27oA4FBFELFCZZ4S4XqeGOXCv68tT+jb3vk/RyaKWP0PTKyWtmLSM0b+adUTEvbs1PEaH2w==",
        "dependencies": {}
      }
    }
  },
  "remote": {
    "https://deno.land/std@0.220.0/assert/assert.ts": "bec068b2fccdd434c138a555b19a2c2393b71dfaada02b7d568a01541e67cdc5",
    "https://deno.land/std@0.220.0/assert/assertion_error.ts": "9f689a101ee586c4ce92f52fa7ddd362e86434ffdf1f848e45987dc7689976b8"
  },
  "workspace": {
    "dependencies": [
      "jsr:@std/assert@^0.222.0",
      "npm:debug@^4.3.0"
    ]
  }
}`);

describe("create", () => {
  beforeEach(() => fs.mock());
  afterEach(() => fs.dispose());

  it("should create a partial lock for a package with a patch update", async () => {
    const lock = await create(
      parse("jsr:@std/assert@^0.222.0"),
      "0.222.1",
      {} as LockfileJson,
    );
    assertEquals(lock, {
      version: "3",
      packages: {
        specifiers: {
          "jsr:@std/assert@^0.222.0": "jsr:@std/assert@0.222.1",
          "jsr:@std/fmt@^0.222.1": "jsr:@std/fmt@0.222.1",
        },
        jsr: {
          "@std/assert@0.222.1": {
            "integrity":
              "691637161ee584a9919d1f9950ddd1272feb8e0a19e83aa5b7563cedaf73d74c",
            "dependencies": [
              "jsr:@std/fmt@^0.222.1",
            ],
          },
          "@std/fmt@0.222.1": {
            "integrity":
              "ec3382f9b0261c1ab1a5c804aa355d816515fa984cdd827ed32edfb187c0a722",
          },
        },
      },
      remote: {},
      workspace: { dependencies: ["jsr:@std/assert@^0.222.0"] },
    });
  });

  it("should create a partial lock for a package with a minor update", async () => {
    const lock = await create(
      parse("jsr:@std/assert@^0.226.0"),
      "0.226.0",
      {} as LockfileJson,
    );
    assertEquals(lock, {
      version: "3",
      packages: {
        specifiers: {
          "jsr:@std/assert@^0.226.0": "jsr:@std/assert@0.226.0",
          "jsr:@std/internal@^1.0.0": "jsr:@std/internal@1.0.1",
        },
        jsr: {
          "@std/assert@0.226.0": {
            integrity:
              "0dfb5f7c7723c18cec118e080fec76ce15b4c31154b15ad2bd74822603ef75b3",
            dependencies: ["jsr:@std/internal@^1.0.0"],
          },
          "@std/internal@1.0.1": {
            integrity:
              "6f8c7544d06a11dd256c8d6ba54b11ed870aac6c5aeafff499892662c57673e6",
          },
        },
      },
      remote: {},
      workspace: { dependencies: ["jsr:@std/assert@^0.226.0"] },
    });
  });

  it("should create a partial lock for a jsr package with a npm dependency", async () => {
    const lock = await create(
      parse("jsr:@core/match@^0.2.0"),
      "0.2.5",
      {} as LockfileJson,
    );
    assertEquals(lock, {
      version: "3",
      packages: {
        specifiers: {
          "jsr:@core/match@^0.2.0": "jsr:@core/match@0.2.5",
          "npm:ts-toolbelt@9.6.0": "npm:ts-toolbelt@9.6.0",
        },
        jsr: {
          "@core/match@0.2.5": {
            integrity:
              "55f38d482ce845958883571e543afa9da2eb89f6fe1825f38764bbd0e7585594",
            dependencies: ["npm:ts-toolbelt@9.6.0"],
          },
        },
        npm: {
          "ts-toolbelt@9.6.0": {
            integrity:
              "sha512-nsZd8ZeNUzukXPlJmTBwUAuABDe/9qtVDelJeT/qW0ow3ZS3BsQJtNkan1802aM9Uf68/Y8ljw86Hu0h5IUW3w==",
            dependencies: {},
          },
        },
      },
      remote: {},
      workspace: { dependencies: ["jsr:@core/match@^0.2.0"] },
    });
  });

  it("should create a partial lock for a npm package", async () => {
    const lock = await create(
      parse("npm:@conventional-commits/parser@^0.4.0"),
      "0.4.1",
      {} as LockfileJson,
    );
    assertEquals(lock, {
      version: "3",
      packages: {
        specifiers: {
          "npm:@conventional-commits/parser@^0.4.0":
            "npm:@conventional-commits/parser@0.4.1",
        },
        npm: {
          "@conventional-commits/parser@0.4.1": {
            integrity:
              "sha512-H2ZmUVt6q+KBccXfMBhbBF14NlANeqHTXL4qCL6QGbMzrc4HDXyzWuxPxPNbz71f/5UkR5DrycP5VO9u7crahg==",
            dependencies: {
              "unist-util-visit": "unist-util-visit@2.0.3",
              "unist-util-visit-parents": "unist-util-visit-parents@3.1.1",
            },
          },
          "@types/unist@2.0.10": {
            integrity:
              "sha512-IfYcSBWE3hLpBg8+X2SEa8LVkJdJEkT2Ese2aaLs3ptGdVtABxndrMaxuFlQ1qdFf9Q5rDvDpxI3WwgvKFAsQA==",
            dependencies: {},
          },
          "unist-util-is@4.1.0": {
            integrity:
              "sha512-ZOQSsnce92GrxSqlnEEseX0gi7GH9zTJZ0p9dtu87WRb/37mMPO2Ilx1s/t9vBHrFhbgweUwb+t7cIn5dxPhZg==",
            dependencies: {},
          },
          "unist-util-visit-parents@3.1.1": {
            integrity:
              "sha512-1KROIZWo6bcMrZEwiH2UrXDyalAa0uqzWCxCJj6lPOvTve2WkfgCytoDTPaMnodXh1WrXOq0haVYHj99ynJlsg==",
            dependencies: {
              "@types/unist": "@types/unist@2.0.10",
              "unist-util-is": "unist-util-is@4.1.0",
            },
          },
          "unist-util-visit@2.0.3": {
            integrity:
              "sha512-iJ4/RczbJMkD0712mGktuGpm/U4By4FfDonL7N/9tATGIF4imikjOuagyMY53tnZq3NP6BcmlrHhEKAfGWjh7Q==",
            dependencies: {
              "@types/unist": "@types/unist@2.0.10",
              "unist-util-is": "unist-util-is@4.1.0",
              "unist-util-visit-parents": "unist-util-visit-parents@3.1.1",
            },
          },
        },
      },
      remote: {},
      workspace: { dependencies: ["npm:@conventional-commits/parser@^0.4.0"] },
    });
  });

  it("should create a partial lock for a remote dependency", async () => {
    const lock = await create(
      parse("https://deno.land/std@0.224.0/assert/assert.ts"),
      "0.224.0",
      {
        version: "3",
        remote: LOCKFILE.remote,
      },
    );
    assertEquals(lock, {
      version: "3",
      remote: {
        "https://deno.land/std@0.224.0/assert/assert.ts":
          "09d30564c09de846855b7b071e62b5974b001bb72a4b797958fe0660e7849834",
        "https://deno.land/std@0.224.0/assert/assertion_error.ts":
          "ba8752bd27ebc51f723702fac2f54d3e94447598f54264a6653d6413738a8917",
      },
    });
  });

  it("should create a partial lock for a remote incomplete dependency", async () => {
    const lock = await create(
      parse("https://deno.land/std@0.224.0/"),
      "0.224.0",
      {
        version: "3",
        remote: LOCKFILE.remote,
      },
    );
    assertEquals(lock, {
      version: "3",
      remote: {
        "https://deno.land/std@0.224.0/assert/assert.ts":
          "09d30564c09de846855b7b071e62b5974b001bb72a4b797958fe0660e7849834",
        "https://deno.land/std@0.224.0/assert/assertion_error.ts":
          "ba8752bd27ebc51f723702fac2f54d3e94447598f54264a6653d6413738a8917",
      },
    });
  });
});

describe("extract", () => {
  beforeEach(() => fs.mock());
  afterEach(() => fs.dispose());

  it("should extract the partial lock for a jsr package from a lockfile", async () => {
    const dep = parse("jsr:@std/assert@^0.222.0");
    const lock = await extract(LOCKFILE, dep);
    assertEquals(lock, {
      version: "3",
      packages: {
        specifiers: {
          "jsr:@std/assert@^0.222.0": "jsr:@std/assert@0.222.0",
          "jsr:@std/fmt@^0.222.0": "jsr:@std/fmt@0.222.0",
        },
        jsr: {
          "@std/assert@0.222.0": {
            "integrity":
              "cbf00c0d8125a56c087e3d1ea0e638760d47206b30e9d300bad826b811719fc7",
            "dependencies": [
              "jsr:@std/fmt@^0.222.0",
            ],
          },
          "@std/fmt@0.222.0": {
            "integrity":
              "0eb99babf1cc697d67e76e8753916c037bbc3ce4abcefa321e1465708b0adda1",
          },
        },
      },
      remote: {},
      workspace: { dependencies: ["jsr:@std/assert@^0.222.0"] },
    });
  });

  it("should extract a npm package from a lockfile", async () => {
    const dep = parse("npm:debug@^4.3.0");
    const lock = await extract(LOCKFILE, dep);
    assertEquals(lock, {
      version: "3",
      packages: {
        specifiers: { "npm:debug@^4.3.0": "npm:debug@4.3.0" },
        npm: {
          "debug@4.3.0": {
            integrity:
              "sha512-jjO6JD2rKfiZQnBoRzhRTbXjHLGLfH+UtGkWLc/UXAh/rzZMyjbgn0NcfFpqT8nd1kTtFnDiJcrIFkq4UKeJVg==",
            dependencies: { ms: "ms@2.1.2" },
          },
          "ms@2.1.2": {
            integrity:
              "sha512-sGkPx+VjMtmA6MX27oA4FBFELFCZZ4S4XqeGOXCv68tT+jb3vk/RyaKWP0PTKyWtmLSM0b+adUTEvbs1PEaH2w==",
            dependencies: {},
          },
        },
      },
      remote: {},
      workspace: { dependencies: ["npm:debug@^4.3.0"] },
    });
  });

  it("should extract the remote dependencies", async () => {
    const dep = parse("https://deno.land/std@0.220.0/assert/assert.ts");
    const lock = await extract(LOCKFILE, dep);
    assertEquals(lock, {
      version: "3",
      remote: LOCKFILE.remote,
    });
  });

  it("should extract the remote dependencies from an incomplete url", async () => {
    const dep = parse("https://deno.land/std@0.220.0/");
    const lock = await extract(LOCKFILE, dep);
    assertEquals(lock, {
      version: "3",
      remote: LOCKFILE.remote,
    });
  });
});

describe("query", () => {
  it("should query the locked version of a jsr package", () => {
    const dep = parse("jsr:@std/assert@^0.222.0");
    const version = query(LOCKFILE, dep);
    assertEquals(version, "0.222.0");
  });

  it("should query the locked version of a npm package", () => {
    const dep = parse("npm:debug@^4.3.0");
    const version = query(LOCKFILE, dep);
    assertEquals(version, "4.3.0");
  });

  it("should return the constraint for a remote dependency", () => {
    const dep = parse("https://deno.land/std@0.220.0");
    const version = query(LOCKFILE, dep);
    assertEquals(version, "0.220.0");
  });
});
