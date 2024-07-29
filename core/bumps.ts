import { increase } from "@molt/lib/constraints";
import type { DependencyState, DependencyUpdate } from "./updates.ts";
import * as SemVer from "@std/semver";

export interface DependencyBump {
  constraint?: string;
  lock?: string;
}

export function get(
  dep: DependencyState,
  update: DependencyUpdate,
): DependencyBump | undefined {
  const { latest, released, constrainted } = update;

  const result = (lock: string) => {
    const constraint = increase(dep.constraint, lock);
    return dep.locked ? { constraint, lock } : { constraint };
  };

  if (latest && isPreRelease(dep.constraint)) {
    return result(latest);
  }
  if (released) {
    return result(released);
  }
  if (constrainted) {
    return dep.locked ? { lock: constrainted } : undefined;
  }
}

const isPreRelease = (semver: string) =>
  !!SemVer.tryParse(semver)?.prerelease?.length;
