/**
 * Makes a compressed copy of the SQL engine's data file.
 *
 * PGlite's data file (~6 MB) is normally sent uncompressed, because web
 * servers don't compress that file type. Compressed with gzip it's ~1.8 MB.
 * The SQL worker downloads this smaller copy and unpacks it in the browser.
 *
 * Runs automatically before `npm run dev` and `npm run build`.
 */
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";

const source = "node_modules/@electric-sql/pglite/dist/pglite.data";
const target = "public/sql/pglite.data.gz";

if (existsSync(target) && statSync(target).mtimeMs >= statSync(source).mtimeMs) {
  process.exit(0); // already up to date
}
mkdirSync("public/sql", { recursive: true });
await pipeline(createReadStream(source), createGzip({ level: 9 }), createWriteStream(target));
console.log(`SQL engine data compressed: ${(statSync(source).size / 1e6).toFixed(1)} MB -> ${(statSync(target).size / 1e6).toFixed(1)} MB`);
