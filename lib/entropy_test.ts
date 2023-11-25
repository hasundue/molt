import { assertEquals } from "./std/assert.ts";
import { entropy } from "./entropy.ts";

Deno.test("entropy", () => {
  // Words with the same length and different randomness.
  const words = [
    "entropy",
    "123.456",
    "9dc53af",
  ];
  assertEquals(
    words.sort((a, b) => entropy(a) - entropy(b)),
    ["123.456", "entropy", "9dc53af"],
  );
});
