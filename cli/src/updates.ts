import { colors } from "@cliffy/ansi/colors";
import type { Update } from "@molt/core/types";
import * as SemVer from "@std/semver";

const { bold, yellow, gray, cyan } = colors;

export function print(update: Update) {
  const { constraint, lock } = update;
  let output = `📦 ${bold(update.dep.name)}`;

  const versions = constraint && SemVer.tryParse(constraint.to)
    ? constraint
    : lock;

  if (versions) {
    output += yellow(` ${versions.from} →  ${versions.to}`);
  }

  const ranges = constraint && !SemVer.tryParse(constraint.to)
    ? constraint
    : undefined;

  if (ranges) {
    output += " ";
    if (versions) output += cyan("(");
    output += cyan(`${ranges.from} →  ${ranges.to}`);
    if (versions) output += cyan(")");
  }

  console.log(output);
}

export function printRefs(update: Update) {
  update.dep.refs.forEach((file) => console.log("  " + gray(file.toString())));
}
