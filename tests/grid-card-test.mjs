/**
 * Prüft die 2×2-Rasterkarte.
 *
 * Wichtigster Punkt: Kinderkarten müssen wiederverwendet werden. Würden sie
 * bei jedem hass-Update neu erzeugt, verlören sie ihren Zustand und lüden
 * ihre Daten neu – der Fehler, an dem der Vorgänger gescheitert ist.
 */

import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://192.168.178.92:8123/lovelace/test",
  pretendToBeVisual: true,
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.customElements = dom.window.customElements;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.Node = dom.window.Node;
globalThis.history = dom.window.history;
globalThis.localStorage = dom.window.localStorage;
if (!globalThis.structuredClone) globalThis.structuredClone = (v) => JSON.parse(JSON.stringify(v));

// Kartenhelfer wie in Home Assistant: erzeugt für jeden Typ ein Element.
let created = 0;
window.loadCardHelpers = async () => ({
  createCardElement: (config) => {
    created += 1;
    const node = document.createElement("div");
    node.className = "fake-card";
    node.dataset.type = config.type;
    node.setConfig = () => {};
    return node;
  },
});

// Zwei installierte Fremdkarten, damit die Auswahlliste etwas zu zeigen hat.
window.customCards = [
  { type: "bubble-card", name: "Bubble Card", description: "Minimalistische Karte" },
  { type: "mini-graph-card", name: "Mini Graph", description: "Kleine Verlaufskurve" },
];

let failures = 0;
const check = (name, condition, detail = "") => {
  if (condition) console.log(`  OK    ${name}`);
  else {
    failures += 1;
    console.log(`  FEHLER ${name}${detail ? ` – ${detail}` : ""}`);
  }
};

const TARGET = process.env.HAOS_TARGET
  ? new URL(process.env.HAOS_TARGET, `file://${process.cwd()}/`).href
  : new URL("../dist/ha-os.js", import.meta.url).href;
console.log(`  (geprueft wird: ${TARGET.replace("file://", "")})`);
await import(TARGET);

const makeHass = () => ({
  states: { "light.a": { entity_id: "light.a", state: "on", attributes: {} } },
  callService: () => Promise.resolve(),
  formatEntityState: (s) => s.state,
  connection: { subscribeMessage: () => Promise.reject(new Error("nicht unterstützt")) },
});

const settle = () => new Promise((r) => setTimeout(r, 30));

console.log("\n1. Registrierung");
check("ha-os-grid registriert", Boolean(customElements.get("ha-os-grid")));
check("ha-os-grid-editor registriert", Boolean(customElements.get("ha-os-grid-editor")));
check("Karte steht im Auswahldialog", (window.customCards || []).some((c) => c.type === "ha-os-grid"));

console.log("\n2. Aufbau mit vier Plätzen");
const card = document.createElement("ha-os-grid");
card.setConfig({
  type: "custom:ha-os-grid",
  column_widths: [2, 1],
  gap: 10,
  cards: [{ type: "tile", entity: "light.a" }, { type: "custom:bubble-card" }],
});
document.body.append(card);
card.hass = makeHass();
await settle();

const grid = card.shadowRoot.querySelector(".grid");
check("vier Plätze vorhanden", card.shadowRoot.querySelectorAll(".slot").length === 4);
check("Spaltenverhältnis 2:1 gesetzt", grid.style.gridTemplateColumns === "2fr 1fr", grid.style.gridTemplateColumns);
check("Abstand gesetzt", grid.style.gap === "10px", grid.style.gap);
check("zwei Karten erzeugt", card.shadowRoot.querySelectorAll(".fake-card").length === 2);
check("zwei leere Plätze zeigen einen Hinweis", card.shadowRoot.querySelectorAll(".empty").length === 2);

console.log("\n3. Kein Neuaufbau bei hass-Updates");
const before = created;
const first = card.shadowRoot.querySelector(".fake-card");
for (let i = 0; i < 30; i += 1) card.hass = makeHass();
await settle();
check("keine Karte neu erzeugt", created === before, `${created - before} zusätzliche`);
check("dasselbe Element wie vorher", card.shadowRoot.querySelector(".fake-card") === first);

console.log("\n4. Unveränderte Karten überleben setConfig");
const keep = card.shadowRoot.querySelector(".fake-card");
const stand = created;
card.setConfig({
  type: "custom:ha-os-grid",
  column_widths: [1, 1],
  gap: 16,
  cards: [{ type: "tile", entity: "light.a" }, { type: "custom:bubble-card" }],
});
await settle();
check("Layout wurde übernommen", card.shadowRoot.querySelector(".grid").style.gridTemplateColumns === "1fr 1fr");
check("gleiche Konfiguration erzeugt nichts neu", created === stand, `${created - stand} zusätzliche`);
check("Kartenelement blieb erhalten", card.shadowRoot.querySelector(".fake-card") === keep);

console.log("\n5. Geänderte Karte wird ersetzt");
card.setConfig({
  type: "custom:ha-os-grid",
  cards: [{ type: "tile", entity: "light.b" }, { type: "custom:bubble-card" }],
});
await settle();
check("geänderte Karte neu erzeugt", card.shadowRoot.querySelector(".fake-card") !== keep);

console.log("\n6. Editor");
const editor = document.createElement("ha-os-grid-editor");
editor.hass = makeHass();
editor.setConfig({ type: "custom:ha-os-grid", cards: [{ type: "tile", entity: "light.a" }] });
document.body.append(editor);
await settle();

const slots = editor.shadowRoot.querySelectorAll(".slot");
check("vier Plätze im Editor", slots.length === 4);
check("belegter Platz zeigt den Kartennamen", slots[0].querySelector(".label").textContent === "Kachel",
  slots[0].querySelector(".label").textContent);
check("drei Plätze bieten die Auswahl an", editor.shadowRoot.querySelectorAll(".choose").length === 3);

editor.shadowRoot.querySelectorAll(".choose")[0].click();
await settle();
const items = editor.shadowRoot.querySelectorAll(".picker-item");
check("Auswahlliste erscheint", items.length > 0);
check("Standardkarten enthalten", [...items].some((i) => i.textContent.includes("Kachel")));
check("installierte Fremdkarten enthalten", [...items].some((i) => i.textContent.includes("Bubble Card")),
  [...items].map((i) => i.querySelector(".pi-name").textContent).join(", "));

const search = editor.shadowRoot.querySelector('input[type=search]');
search.value = "bubble";
search.dispatchEvent(new dom.window.Event("input"));
await settle();
const filtered = editor.shadowRoot.querySelectorAll(".picker-item");
check("Suche filtert", filtered.length === 1 && filtered[0].textContent.includes("Bubble"),
  `${filtered.length} Treffer`);
check("Suchfeld ist dasselbe Element geblieben", editor.shadowRoot.querySelector('input[type=search]') === search);

let emitted = null;
editor.addEventListener("config-changed", (e) => { emitted = e.detail.config; });
filtered[0].click();
await settle();
check("Auswahl schreibt die Karte in den freien Platz",
  emitted?.cards?.[1]?.type === "custom:bubble-card",
  JSON.stringify(emitted?.cards));

console.log(failures === 0 ? "\nAlle Prüfungen bestanden.\n" : `\n${failures} FEHLER.\n`);
process.exit(failures === 0 ? 0 : 1);
