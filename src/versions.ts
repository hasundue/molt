// Copyright 2023 Shun Ueda. All rights reserved. MIT license.

import { distinct } from "https://deno.land/std@0.202.0/collections/distinct.ts";
import { DependencyUpdate } from "../mod.ts";
import { Maybe } from "./types.ts";

export type VersionProp = {
  from?: string;
  to: string;
};

export function createVersionProp(
  dependencies: DependencyUpdate[],
): Maybe<VersionProp> {
  const modules = distinct(dependencies.map((d) => d.name));
  if (modules.length > 1) {
    // Cannot provide a well-defined version prop
    return;
  }
  const tos = distinct(dependencies.map((d) => d.version.to));
  if (tos.length > 1) {
    throw new Error(
      "Multiple target versions are specified for a single module",
    );
  }
  const froms = distinct(dependencies.map((d) => d.version.from));
  return {
    from: froms.length === 1 ? froms[0] : undefined,
    to: tos[0],
  };
}
