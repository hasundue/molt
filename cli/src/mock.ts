import { all, cmd, fs } from "@chiezo/amber";

export function mock(paths: string[]) {
  paths.forEach((it) => fs.stub(it));
  all(cmd, fs).mock();
}
