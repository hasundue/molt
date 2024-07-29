import manifest from "./deno.json" with { type: "json" };

export const MOLT_VERSION = manifest.version;

export function assertOk(res: Response): void {
  if (!res.ok) {
    throw new Deno.errors.Http(`${res.statusText}: ${res.url}`);
  }
}

export async function checksum(src: BufferSource): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", src);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}
