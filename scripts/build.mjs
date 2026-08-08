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
import { readFile, mkdir, readdir } from "node:fs/promises";
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

/**
 * Rückstriche in CSS-Kommentaren.
 *
 * Die Stile stehen in Template-Strings. Ein `Rückstrich` in einem
 * CSS-Kommentar beendet den String mitten im Stil – einmal führte das zu
 * einem Syntaxfehler, ein andermal zu gültigem, aber falschem Code, der erst
 * beim Laden auffiel. Beides kostet mehr Zeit als diese Prüfung.
 */
const cssComment = /^\s*(\/\*|\*[^/])/;
const offenders = [];
for (const folder of ["src", "src/cards", "src/shared"]) {
  const files = (await readdir(join(root, folder), { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => join(root, folder, entry.name));

  for (const file of files) {
    const lines = (await readFile(file, "utf8")).split("\n");
    // Nur innerhalb eines Stil-Blocks suchen. Ein Rückstrich in einem
    // gewöhnlichen Dokumentationskommentar ist völlig in Ordnung.
    let inStyles = false;
    lines.forEach((line, index) => {
      if (!inStyles) {
        if (/=\s*`\s*$/.test(line)) inStyles = true;
        return;
      }
      if (/^\s*`;?\s*$/.test(line)) {
        inStyles = false;
        return;
      }
      if (cssComment.test(line) && line.includes("`")) {
        offenders.push(`${file.replace(`${root}/`, "")}:${index + 1}`);
      }
    });
  }
}
if (offenders.length) {
  console.error("FEHLER: Rückstrich in einem Kommentar – das beendet den Stil-String.");
  offenders.forEach((place) => console.error(`   ${place}`));
  process.exit(1);
}

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
  "ha-os-printer",
  "ha-os-printer-editor",
];
const missing = required.filter((tag) => !built.includes(tag));

if (missing.length || built.length < 50_000) {
  console.error(`FEHLER: Bündel unvollständig (${built.length} Bytes).`);
  if (missing.length) console.error(`   Fehlende Element-Namen: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`HA-OS ${version} gebaut → dist/ha-os.js (${built.length.toLocaleString("de-DE")} Bytes)`);
