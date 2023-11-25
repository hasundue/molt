// Copyright 2023 Shun Ueda. All rights reserved. MIT license.
// This module is browser compatible.

/**
 * Utilities to calculate heuristic entropy of strings in URLs.
 *
 * @module
 */

const CHAR_TYPES = {
  vowel: "aeiou",
  consonant: "bcdfghjklmnpqrstvwxyz",
  number: "0123456789",
  symbol: "!@#$%^&*()_+-=[]{};':\",./<>?\\|",
  unknown: "",
} as const;

type CharType = keyof typeof CHAR_TYPES;

const CHAR_CONTRIB = {
  vowel: 5,
  consonant: 20,
  number: 10,
  symbol: 1,
  unknown: 1,
} as const;

/**
 * Returns a type of a character.
 *
 * @param c - The character to get the type of
 * @returns A type of the character
 */
function charType(c: string): CharType {
  for (const [type, chars] of Object.entries(CHAR_TYPES)) {
    if (chars.includes(c)) {
      return type as CharType;
    }
  }
  return "unknown";
}

/**
 * Calculates an entropy of a string
 *
 * @param str - The string to calculate the entropy of
 * @returns An entropy of the string
 */
export function entropy(str: string): number {
  const counts = new Map<CharType, number>();
  for (const c of str) {
    const type = charType(c);
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  const combinations = Array.from(counts.entries()).reduce(
    (acc, [type, count]) => acc * count * CHAR_CONTRIB[type],
    1,
  );
  return Math.log2(combinations);
}
