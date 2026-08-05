/**
 * Gezielte Prüfung der Wetter-Verlaufskurve.
 *
 * Prüft: Kurve wird gezeichnet, sitzt über den richtigen Spalten, überschwingt
 * nicht, lässt sich abschalten – und erzeugt bei Updates KEIN neues DOM.
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
const HAOS = await import(TARGET);

const temps = [12, 18, 11, 11, 24, 19, 7];
const forecast = temps.map((temperature, index) => ({
  datetime: new Date(Date.now() + index * 3600e3).toISOString(),
  temperature,
  condition: "sunny",
}));

const makeHass = () => ({
  states: {
    "weather.zuhause": {
      entity_id: "weather.zuhause",
      state: "partlycloudy",
      attributes: { friendly_name: "Zuhause", temperature: 21, wind_speed: 9, forecast },
    },
  },
  callService: () => Promise.resolve(),
  formatEntityState: (s) => s.state,
  connection: { subscribeMessage: () => Promise.reject(new Error("nicht unterstützt")) },
});

const build = (extra = {}) => {
  const card = document.createElement("ha-os-card");
  card.setConfig({
    type: "custom:ha-os-card",
    card_type: "weather",
    entity: "weather.zuhause",
    forecast_count: temps.length,
    ...extra,
  });
  document.body.append(card);
  card.hass = makeHass();
  return card;
};

console.log("\n1. Kurve wird gezeichnet");
const card = build();
const graph = card.shadowRoot.querySelector(".weather-graph");
check("Kurvenbereich vorhanden", Boolean(graph));
check("nicht ausgeblendet", !graph.classList.contains("is-hidden"));

const line = graph.querySelector("path.line");
const area = graph.querySelector("path.area");
const d = line.getAttribute("d");
check("Linienpfad gesetzt", Boolean(d) && d.startsWith("M"));
check("Flächenpfad geschlossen", area.getAttribute("d").trim().endsWith("Z"));
check(
  "ein Kurvensegment je Übergang",
  (d.match(/C/g) || []).length === temps.length - 1,
  `${(d.match(/C/g) || []).length} statt ${temps.length - 1}`
);

console.log("\n2. Geometrie");
const numbers = d.match(/-?\d+(\.\d+)?/g).map(Number);
const xs = numbers.filter((_, i) => i % 2 === 0);
const ys = numbers.filter((_, i) => i % 2 === 1);

// Punkte müssen über den Spaltenmitten der Vorhersagezeile sitzen.
const expectedFirstX = Math.round((0.5 / temps.length) * 100 * 100) / 100;
check("erster Punkt auf Spaltenmitte", Math.abs(xs[0] - expectedFirstX) < 0.01, `${xs[0]} statt ${expectedFirstX}`);

// Wärmster Wert oben (y klein), kältester unten – top 6, base 34.
check("kein Überschwingen nach oben", Math.min(...ys) >= 6 - 0.01, `min y = ${Math.min(...ys)}`);
check("kein Überschwingen nach unten", Math.max(...ys) <= 34 + 0.01, `max y = ${Math.max(...ys)}`);
check("x bleibt im Bild", Math.min(...xs) >= 0 && Math.max(...xs) <= 100);

console.log("\n3. Kein neues DOM bei Updates");
const before = card.shadowRoot.querySelectorAll("*").length;
const lineNode = line;
const graphNode = graph;
for (let i = 0; i < 50; i += 1) {
  const hass = makeHass();
  hass.states["weather.zuhause"].attributes.temperature = 15 + (i % 9);
  card.hass = hass;
}
check("Knotenzahl unverändert", card.shadowRoot.querySelectorAll("*").length === before,
  `${card.shadowRoot.querySelectorAll("*").length} statt ${before}`);
check("Linienpfad ist dasselbe Element", card.shadowRoot.querySelector("path.line") === lineNode);
check("Kurvenbereich ist dasselbe Element", card.shadowRoot.querySelector(".weather-graph") === graphNode);

console.log("\n4. Abschaltbar und Randfälle");
const off = build({ show_graph: false });
check("show_graph:false blendet aus", off.shadowRoot.querySelector(".weather-graph").classList.contains("is-hidden"));

const single = document.createElement("ha-os-card");
single.setConfig({ type: "custom:ha-os-card", card_type: "weather", entity: "weather.zuhause", forecast_count: 1 });
document.body.append(single);
single.hass = makeHass();
check("ein einzelner Wert ergibt keine Kurve", single.shadowRoot.querySelector(".weather-graph").classList.contains("is-hidden"));

const flat = document.createElement("ha-os-card");
flat.setConfig({ type: "custom:ha-os-card", card_type: "weather", entity: "weather.zuhause", forecast_count: 4 });
document.body.append(flat);
const flatHass = makeHass();
flatHass.states["weather.zuhause"].attributes.forecast = [0, 1, 2, 3].map((i) => ({
  datetime: new Date(Date.now() + i * 3600e3).toISOString(),
  temperature: 20,
  condition: "sunny",
}));
flat.hass = flatHass;
const flatD = flat.shadowRoot.querySelector("path.line").getAttribute("d");
check("gleiche Werte ergeben keine Division durch null", Boolean(flatD) && !flatD.includes("NaN"), flatD);

const broken = document.createElement("ha-os-card");
broken.setConfig({ type: "custom:ha-os-card", card_type: "weather", entity: "weather.zuhause", forecast_count: 3 });
document.body.append(broken);
const brokenHass = makeHass();
brokenHass.states["weather.zuhause"].attributes.forecast = [
  { datetime: new Date().toISOString(), temperature: 20, condition: "sunny" },
  { datetime: new Date().toISOString(), temperature: null, condition: "sunny" },
  { datetime: new Date().toISOString(), temperature: 22, condition: "sunny" },
];
broken.hass = brokenHass;
check("fehlender Messwert blendet die Kurve aus statt NaN zu zeichnen",
  broken.shadowRoot.querySelector(".weather-graph").classList.contains("is-hidden"));

console.log(failures === 0 ? "\nAlle Prüfungen bestanden.\n" : `\n${failures} FEHLER.\n`);
process.exit(failures === 0 ? 0 : 1);
