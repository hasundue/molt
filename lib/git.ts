import { ModuleUpdateResult } from "../mod.ts";
import { parseModule } from "./util.ts";

export interface CommitOptions {
  groupBy?: "module" | "file";
}

export function commitAll(
  results: ModuleUpdateResult[],
  options: CommitOptions = {},
) {
  const groups = groupResults(results, options.groupBy);
}

function groupResults(
  results: ModuleUpdateResult[],
  groupBy?: "module" | "file",
) {
  switch (groupBy) {
    case "module":
      return groupByModule(results);
    case "file":
      return groupByFile(results);
    default:
      return [results];
  }
}

function groupByModule(results: ModuleUpdateResult[]) {
  const groups = new Map<string, ModuleUpdateResult[]>();
  for (const result of results) {
    const module = parseModule(result.specifier).name;
    const group = groups.get(module) ?? [];
    group.push(result);
    groups.set(module, group);
  }
  return groups;
}

function groupByFile(results: ModuleUpdateResult[]) {
  const groups = new Map<string, ModuleUpdateResult[]>();
  for (const result of results) {
    const group = groups.get(result.referrer) ?? [];
    group.push(result);
    groups.set(result.referrer, group);
  }
  return groups;
}
