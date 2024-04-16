import {
  CommandStub,
  FileSystemFake,
  LatestVersionStub,
  ReadTextFileStub,
  WriteTextFileStub,
} from "@molt/lib/testing";

/**
 * Enables all test stubs.
 */
export default function () {
  LatestVersionStub.create({
    "deno.land/std": "0.218.2",
    "deno_graph": "0.69.7",
    "node-emoji": "2.1.3",
    "@luca/flag": "1.0.1",
    "@std/": "0.218.2",
  });
  const fs = new FileSystemFake();
  ReadTextFileStub.create(fs, { readThrough: true });
  WriteTextFileStub.create(fs);
  Deno.Command = CommandStub.create("git");
}
