/**
 * HA-OS – Einstiegspunkt
 *
 * Dies ist die Quelldatei. Ausgeliefert wird nicht sie, sondern das daraus
 * gebaute Bündel `dist/ha-os.js`:
 *
 *   npm run build
 *
 * Warum gebündelt: HACS lädt bei Dashboard-Plugins ausschliesslich flach –
 * alle .js aus `dist/` oder dem Wurzelverzeichnis, ohne Unterordner. Die
 * Aufteilung in `shared/` und `cards/` überlebt das nicht.
 *
 * Der Nebeneffekt ist der eigentliche Gewinn: Früher stand hinter jedem
 * einzelnen `import` eine Versionsangabe `?v=…`, weil Browser importierte
 * Module getrennt von der Einstiegsdatei zwischenspeichern. Wurde eine davon
 * beim Veröffentlichen vergessen, lud der Browser eine Mischung aus alten und
 * neuen Modulen. Bei einer einzigen Datei kann das nicht mehr passieren.
 *
 * Registrierte Karten:
 *   custom:ha-os-shell  – Grundgerüst (Glasfläche, Seitenleiste, Kopfzeile, drei Raster)
 *   custom:ha-os-card   – generische Karte mit Typ-Auswahl
 *   custom:ha-os-grid   – 2×2-Raster mit vier frei belegbaren Plätzen
 *   custom:ha-os-vehicle – Fahrzeugübersicht für Mercedes (mbapi2020)
 *   custom:ha-os-printer – 3D-Drucker (Bambu Lab)
 *
 * Das alte glass-dashboard bleibt vollständig unberührt und kann parallel
 * geladen werden: alle Element-Namen, CSS-Variablen und Speicherschlüssel
 * sind verschieden.
 */

export const VERSION = "0.30.2";

import "./shared/theme.js";
import "./cards/shell-card.js";
import "./cards/shell-editor.js";
import "./cards/haos-card.js";
import "./cards/haos-card-editor.js";
import "./cards/grid-card.js";
import "./cards/grid-editor.js";
import "./cards/vehicle-card.js";
import "./cards/vehicle-editor.js";
import "./cards/printer-card.js";
import "./cards/printer-editor.js";

export { CARD_TYPES } from "./cards/haos-card.js";
// Für die Tests: der Upload wird sonst nur über eine Dateiauswahl erreichbar,
// die sich in jsdom nicht sinnvoll füllen lässt.
export { uploadImage } from "./shared/utils.js";
export { guessEntities, FIELDS as PRINTER_FIELDS } from "./cards/printer-card.js";

console.info(
  `%c HA-OS %c ${VERSION} `,
  "background:#0a84ff;color:#fff;font-weight:700;border-radius:3px 0 0 3px;padding:2px 6px",
  "background:#18212a;color:#fff;border-radius:0 3px 3px 0;padding:2px 6px"
);
