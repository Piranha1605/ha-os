/**
 * Prüft die Fahrzeugkarte (Stufe 1 – Übersicht).
 *
 * Die Entitätsnamen stammen aus einer echten `mbapi2020`-Installation. Der
 * springende Punkt ist die Ableitung: aus **einer** gewählten Entität muss die
 * Karte die übrigen elf finden, sonst müsste man fünfzehn Felder ausfüllen.
 *
 * Zweiter Punkt: `Number(null)` ist `0`. Ein fehlender Messwert darf nicht als
 * „0 km Reichweite" erscheinen – derselbe Fehler steckte früher in der
 * Wetterkarte.
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
await import(TARGET);

const ID = "clpef165";
const state = (id, value, attributes = {}) => ({
  entity_id: id,
  state: value,
  attributes,
  last_changed: new Date(Date.now() - 4 * 60000).toISOString(),
});

const makeHass = (overrides = {}) => ({
  states: {
    [`sensor.${ID}_car`]: state(`sensor.${ID}_car`, "online", { friendly_name: "GLC 300 e" }),
    [`sensor.${ID}_range_liquid`]: state(`sensor.${ID}_range_liquid`, "520", { unit_of_measurement: "km" }),
    [`sensor.${ID}_fuel_level`]: state(`sensor.${ID}_fuel_level`, "62", { unit_of_measurement: "%" }),
    [`sensor.${ID}_odometer`]: state(`sensor.${ID}_odometer`, "48210", { unit_of_measurement: "km" }),
    [`sensor.${ID}_lock`]: state(`sensor.${ID}_lock`, "0"),
    [`sensor.${ID}_ignition_state`]: state(`sensor.${ID}_ignition_state`, "0"),
    [`binary_sensor.${ID}_windows_closed`]: state(`binary_sensor.${ID}_windows_closed`, "on"),
    [`sensor.${ID}_starter_battery_state`]: state(`sensor.${ID}_starter_battery_state`, "ok"),
    [`sensor.${ID}_tire_pressure_front_left`]: state(`sensor.${ID}_tire_pressure_front_left`, "2.4"),
    [`sensor.${ID}_tire_pressure_front_right`]: state(`sensor.${ID}_tire_pressure_front_right`, "2.4"),
    [`sensor.${ID}_tire_pressure_rear_left`]: state(`sensor.${ID}_tire_pressure_rear_left`, "2.5"),
    [`sensor.${ID}_tire_pressure_rear_right`]: state(`sensor.${ID}_tire_pressure_rear_right`, "2.5"),
    [`binary_sensor.${ID}_engine_light_warning`]: state(`binary_sensor.${ID}_engine_light_warning`, "off"),
    [`binary_sensor.${ID}_low_brake_fluid_warning`]: state(`binary_sensor.${ID}_low_brake_fluid_warning`, "off"),
    [`binary_sensor.${ID}_low_coolant_level_warning`]: state(`binary_sensor.${ID}_low_coolant_level_warning`, "off"),
    [`binary_sensor.${ID}_low_wash_water_warning`]: state(`binary_sensor.${ID}_low_wash_water_warning`, "off"),
    [`binary_sensor.${ID}_tire_warning`]: state(`binary_sensor.${ID}_tire_warning`, "off"),
    ...overrides,
  },
  callService: () => Promise.resolve(),
  formatEntityState: (s) => s.state,
  connection: { subscribeMessage: () => Promise.reject(new Error("nicht unterstützt")) },
});

const build = (config = {}, hass = makeHass()) => {
  const card = document.createElement("ha-os-vehicle");
  card.setConfig({ type: "custom:ha-os-vehicle", entity: `sensor.${ID}_odometer`, ...config });
  document.body.append(card);
  card.hass = hass;
  return card;
};

const sr = (card) => card.shadowRoot;
const text = (card, sel) => sr(card).querySelector(sel)?.textContent ?? "";
const tile = (card, index) => {
  const node = sr(card).querySelectorAll(".tile")[index];
  return { label: node.querySelector(".tile-label").textContent, value: node.querySelector(".tile-value").textContent };
};

console.log("\n1. Ableitung aus einer einzigen Entität");
const karte = build();
check("Kopf zeigt den Fahrzeugnamen, nicht den der gewaehlten Entitaet",
  text(karte, ".title") === "GLC 300 e", `"${text(karte, ".title")}"`);
check("eigener Name schlaegt alles", text(build({ name: "Dienstwagen" }), ".title") === "Dienstwagen");
check("Reichweite gefunden", text(karte, ".hero-value") === "520 km", `"${text(karte, ".hero-value")}"`);
check("Tank gefunden", text(karte, ".hero-foot span") === "62 % Tank", `"${text(karte, ".hero-foot span")}"`);
check("Kilometerstand gefunden", text(karte, ".hero-foot span:last-child").startsWith("48.210"),
  `"${text(karte, ".hero-foot span:last-child")}"`);
check("Balken auf 62 %", sr(karte).querySelector(".bar span").style.width === "62%",
  sr(karte).querySelector(".bar span").style.width);

console.log("\n2. Kopfzeile");
check("Verriegelt erkannt", text(karte, ".pill span") === "Verriegelt", `"${text(karte, ".pill span")}"`);
check("Verriegelt ist gruen", sr(karte).querySelector(".pill").classList.contains("good"));
check("Fenster zu erkannt", sr(karte).querySelectorAll(".pill span")[1].textContent === "Fenster zu");
check("Zuendung aus in der Unterzeile", text(karte, ".subtitle").includes("Zündung aus"), `"${text(karte, ".subtitle")}"`);

console.log("\n3. Kacheln");
check("Reifen vorn als Paar", tile(karte, 0).value === "2,4 · 2,4", tile(karte, 0).value);
check("Reifen hinten als Paar", tile(karte, 1).value === "2,5 · 2,5", tile(karte, 1).value);
check("keine Warnungen", tile(karte, 2).value === "keine", tile(karte, 2).value);
check("Warnungskachel ist gruen", sr(karte).querySelectorAll(".tile-value")[2].classList.contains("good"));
check("Starterbatterie ok", tile(karte, 3).value === "ok", tile(karte, 3).value);

console.log("\n4. Warnung schlaegt durch");
const gewarnt = build({}, makeHass({
  [`binary_sensor.${ID}_tire_warning`]: state(`binary_sensor.${ID}_tire_warning`, "on"),
  [`binary_sensor.${ID}_low_wash_water_warning`]: state(`binary_sensor.${ID}_low_wash_water_warning`, "on"),
}));
check("beide Warnungen benannt", tile(gewarnt, 2).value === "Wischwasser, Reifendruck", tile(gewarnt, 2).value);
check("Warnungskachel ist rot", sr(gewarnt).querySelectorAll(".tile-value")[2].classList.contains("bad"));

console.log("\n5. Offenes Fahrzeug");
const offen = build({}, makeHass({
  [`sensor.${ID}_lock`]: state(`sensor.${ID}_lock`, "1"),
  [`binary_sensor.${ID}_windows_closed`]: state(`binary_sensor.${ID}_windows_closed`, "off"),
}));
check("Offen erkannt", text(offen, ".pill span") === "Offen", `"${text(offen, ".pill span")}"`);
check("Offen ist rot", sr(offen).querySelector(".pill").classList.contains("bad"));
check("Fenster offen erkannt", sr(offen).querySelectorAll(".pill span")[1].textContent === "Fenster offen");

console.log("\n6. Fehlende Werte werden nicht zu Null");
const luecken = build({}, makeHass({
  [`sensor.${ID}_range_liquid`]: state(`sensor.${ID}_range_liquid`, "unknown"),
  [`sensor.${ID}_tire_pressure_front_left`]: state(`sensor.${ID}_tire_pressure_front_left`, "unavailable"),
  [`sensor.${ID}_tire_pressure_front_right`]: state(`sensor.${ID}_tire_pressure_front_right`, "unavailable"),
}));
check("Reichweite zeigt einen Strich, keine 0", text(luecken, ".hero-value") === "–", `"${text(luecken, ".hero-value")}"`);
check("Reifen ohne Werte zeigen einen Strich", tile(luecken, 0).value === "–", tile(luecken, 0).value);
check("Balken bleibt auf 62 %", sr(luecken).querySelector(".bar span").style.width === "62%");

console.log("\n7. Ueberschreiben schlaegt die Ableitung");
const eigen = build({
  entity_windows: "binary_sensor.garage_aussen_windows",
}, makeHass({
  "binary_sensor.garage_aussen_windows": state("binary_sensor.garage_aussen_windows", "off"),
}));
check("eigene Fensterentitaet wird benutzt",
  sr(eigen).querySelectorAll(".pill span")[1].textContent === "Fenster offen",
  sr(eigen).querySelectorAll(".pill span")[1].textContent);

console.log("\n8. Kein Neuaufbau bei hass-Updates");
const stabil = build();
const vorher = sr(stabil).querySelector(".hero-value");
const railVorher = sr(stabil).querySelectorAll(".rail button").length;
for (let i = 0; i < 50; i += 1) {
  stabil.hass = makeHass({
    [`sensor.${ID}_odometer`]: state(`sensor.${ID}_odometer`, String(48210 + i), { unit_of_measurement: "km" }),
  });
}
check("dasselbe Element fuer die Reichweite", sr(stabil).querySelector(".hero-value") === vorher);
check("Symbolleiste nicht neu gebaut", sr(stabil).querySelectorAll(".rail button").length === railVorher);
check("Kilometerstand ist mitgelaufen", text(stabil, ".hero-foot span:last-child").startsWith("48.259"),
  text(stabil, ".hero-foot span:last-child"));

console.log("\n9. Symbolleiste");
check("fuenf Bereiche", sr(karte).querySelectorAll(".rail button").length === 5);
check("Uebersicht ist aktiv", sr(karte).querySelector(".rail button").classList.contains("active"));
check("die uebrigen vier sind noch gesperrt",
  [...sr(karte).querySelectorAll(".rail button")].filter((b) => b.disabled).length === 4);

console.log("\n10. Ohne Fahrzeug");
const leer = build({ entity: "" }, makeHass());
check("Hinweis statt leerer Kacheln", text(leer, ".subtitle").includes("Editor"), `"${text(leer, ".subtitle")}"`);

console.log(failures === 0 ? "\nAlle Prüfungen bestanden.\n" : `\n${failures} Prüfung(en) fehlgeschlagen.\n`);
process.exit(failures === 0 ? 0 : 1);
