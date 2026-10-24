import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "dist");

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const file of ["index.html", "favicon.svg", "favicon.ico"]) {
  await cp(resolve(root, file), resolve(out, file));
}

for (const dir of ["css", "js"]) {
  await cp(resolve(root, dir), resolve(out, dir), { recursive: true });
}

console.log(`Static site built: ${out}`);
