export {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "https://deno.land/std@0.205.0/testing/bdd.ts";
export {
  assertSpyCall,
  assertSpyCallArg,
  assertSpyCalls,
  type ConstructorSpy,
  type ExpectedSpyCall,
  type Spy,
  spy,
  type SpyCall,
  type Stub,
  stub,
} from "https://raw.githubusercontent.com/hasundue/deno_std/feat-constructor-spy/testing/mock.ts";

import {
  createAssertSnapshot,
} from "https://deno.land/std@0.205.0/testing/snapshot.ts";
import { fromFileUrl } from "./path.ts";

export const assertSnapshot = createAssertSnapshot({
  dir: fromFileUrl(new URL("../../test/snapshots/", import.meta.url)),
});
