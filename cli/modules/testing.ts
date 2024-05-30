import { all, cmd, fs } from "@chiezo/amber";
import { LatestVersionStub } from "../../test/mock.ts";

/**
 * Enables all test stubs.
 */
export default function () {
  LatestVersionStub.create("123.456.789");
  fs.stub(new URL("../../test/fixtures", import.meta.url));
  cmd.stub("git");
  all(cmd, fs).mock();
}
