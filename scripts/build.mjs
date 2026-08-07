/**
 * HA-OS – Build
 *
 * Bündelt `src/ha-os.js` samt aller importierten Module zu einer einzigen
 * Datei `dist/ha-os.js`. Genau diese Datei lädt HACS und damit Home Assistant.
 *
 * Warum esbuild und keine einfache Verkettung: die Module verwenden mehrfach
 * dieselben Namen auf oberster Ebene – `el`, `icon`, `STYLES`, `TAG`,
 * `EDITOR_TAG`, `LABELS`, `HELPERS`. Beim blossen Aneinanderhängen würden sie
 * sich gegenseitig überschreiben, und zwar lautlos: die Datei liefe, zeigte
 * aber die falsche Karte. esbuild benennt sie beim Bündeln eindeutig um.
 *
 * Nicht minifiziert. Der Aufwand lohnt bei dieser Grösse nicht, und im
 * Fehlerfall ist eine lesbare Datei in der Browserkonsole mehr wert.
 */

import { build } from "esbuild";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const entry = join(root, "src", "ha-os.js");
const outfile = join(root, "dist", "ha-os.js");

// Version aus der Quelle lesen, damit sie nur an einer Stelle gepflegt wird.
const source = await readFile(entry, "utf8");
const version = source.match(/export const VERSION = "([^"]+)"/)?.[1];
if (!version) {
  console.error("FEHLER: VERSION liess sich aus src/ha-os.js nicht lesen.");
  process.exit(1);
}

await mkdir(join(root, "dist"), { recursive: true });

await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  format: "esm",
  target: "es2021",
  charset: "utf8",
  legalComments: "inline",
  minify: false,
  banner: {
    js: `/* HA-OS ${version} – erzeugt aus src/, nicht von Hand bearbeiten. */`,
  },
});

const built = await readFile(outfile, "utf8");

// Ein leeres oder halbes Bündel wäre der teuerste Fehler: HA lädt es, meldet
// nichts Auffälliges und zeigt eine leere Karte. Deshalb hier hart prüfen.
const required = [
  "ha-os-shell",
  "ha-os-card",
  "ha-os-shell-editor",
  "ha-os-card-editor",
  "ha-os-grid",
  "ha-os-grid-editor",
  "ha-os-vehicle",
  "ha-os-vehicle-editor",
];
const missing = required.filter((tag) => !built.includes(tag));

if (missing.length || built.length < 50_000) {
  console.error(`FEHLER: Bündel unvollständig (${built.length} Bytes).`);
  if (missing.length) console.error(`   Fehlende Element-Namen: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`HA-OS ${version} gebaut → dist/ha-os.js (${built.length.toLocaleString("de-DE")} Bytes)`);
