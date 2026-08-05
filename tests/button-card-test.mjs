/**
 * Prüft die Bedienformen der Button-Karte.
 *
 * Anlass: eine Entität der Domain `button` ("Taste") hat keinen Zustand. Die
 * Karte zeigte trotzdem einen Umschalter an und rief `homeassistant.toggle`
 * auf – am echten Garagentor passierte deshalb nichts.
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

const calls = [];
const state = (id, value, attributes = {}) => ({ entity_id: id, state: value, attributes });

const makeHass = () => ({
  states: {
    "button.garagentor": state("button.garagentor", "unknown", { friendly_name: "Garagentor öffnen/schließen" }),
    "binary_sensor.garagentaster": state("binary_sensor.garagentaster", "on", { friendly_name: "Garagentaster" }),
    "light.wohnzimmer": state("light.wohnzimmer", "on", { friendly_name: "Wohnzimmer" }),
    "cover.rollo": state("cover.rollo", "open", { friendly_name: "Rollo" }),
    "scene.abend": state("scene.abend", "unknown", { friendly_name: "Abend" }),
  },
  callService: (domain, service, data) => {
    calls.push(`${domain}.${service}:${data?.entity_id ?? ""}`);
    return Promise.resolve();
  },
  formatEntityState: (s) => s.state,
  connection: { subscribeMessage: () => Promise.reject(new Error("nicht unterstützt")) },
});

const build = (config) => {
  const card = document.createElement("ha-os-card");
  card.setConfig({ type: "custom:ha-os-card", card_type: "button", ...config });
  document.body.append(card);
  card.hass = makeHass();
  return card;
};

const sr = (card) => card.shadowRoot;
const visible = (card, sel) => {
  const node = sr(card).querySelector(sel);
  return Boolean(node) && !node.hidden;
};

console.log("\n1. Taste (button) – der ursprüngliche Fehler");
const taste = build({ entity: "button.garagentor" });
check("Taster sichtbar", visible(taste, ".press-btn"));
check("kein Umschalter", !visible(taste, ".switch"));
check("keine Rollo-Knöpfe", !visible(taste, ".cover-ctrl"));

calls.length = 0;
sr(taste).querySelector(".card").click();
check("Klick auf die Kachel löst button.press aus", calls[0] === "button.press:button.garagentor", calls.join(", ") || "keine Dienstaufrufe");
check("kein homeassistant.toggle mehr", !calls.some((c) => c.startsWith("homeassistant.toggle")), calls.join(", "));

calls.length = 0;
sr(taste).querySelector(".press-btn").click();
check("Klick auf den Taster löst genau einmal aus", calls.length === 1 && calls[0] === "button.press:button.garagentor", calls.join(", "));
check("Taster zeigt gedrückten Zustand", sr(taste).querySelector(".press-btn").classList.contains("is-pressed"));

console.log("\n2. Zustand aus einer anderen Entität");
const kombi = build({ entity: "button.garagentor", state_entity: "binary_sensor.garagentaster" });
check("Zustandszeile zeigt den Sensor", sr(kombi).querySelector(".subtitle").textContent === "on",
  `"${sr(kombi).querySelector(".subtitle").textContent}"`);
check("Karte gilt als eingeschaltet", sr(kombi).querySelector(".card").classList.contains("is-on"));
check("Taster bleibt die Bedienform", visible(kombi, ".press-btn"));

console.log("\n3. Rollo (cover)");
const rollo = build({ entity: "cover.rollo" });
check("drei Rollo-Knöpfe", visible(rollo, ".cover-ctrl") && sr(rollo).querySelectorAll(".cover-ctrl button").length === 3);
check("kein Umschalter", !visible(rollo, ".switch"));
calls.length = 0;
const [auf, stopp, zu] = sr(rollo).querySelectorAll(".cover-ctrl button");
auf.click(); stopp.click(); zu.click();
check("Auf/Stopp/Zu rufen die richtigen Dienste",
  calls.join("|") === "cover.open_cover:cover.rollo|cover.stop_cover:cover.rollo|cover.close_cover:cover.rollo",
  calls.join(" | "));
calls.length = 0;
sr(rollo).querySelector(".card").click();
check("Klick auf die Fläche schaltet das Rollo nicht", calls.length === 0, calls.join(", "));

console.log("\n4. Szene");
const szene = build({ entity: "scene.abend" });
check("Szene bekommt einen Taster", visible(szene, ".press-btn"));
calls.length = 0;
sr(szene).querySelector(".press-btn").click();
check("Szene wird über turn_on ausgelöst", calls[0] === "scene.turn_on:scene.abend", calls.join(", "));

console.log("\n5. Schaltbare Entität bleibt wie bisher");
const licht = build({ entity: "light.wohnzimmer" });
check("Umschalter sichtbar", visible(licht, ".switch"));
check("kein Taster", !visible(licht, ".press-btn"));
calls.length = 0;
sr(licht).querySelector(".card").click();
check("Klick schaltet um", calls[0] === "homeassistant.toggle:light.wohnzimmer", calls.join(", "));

console.log("\n6. Entitätswechsel ohne Neuaufbau");
const wechsel = build({ entity: "light.wohnzimmer" });
const cardNode = sr(wechsel).querySelector(".card");
wechsel.setConfig({ type: "custom:ha-os-card", card_type: "button", entity: "button.garagentor" });
check("DOM wurde wiederverwendet", sr(wechsel).querySelector(".card") === cardNode);
check("Bedienform ist jetzt der Taster", visible(wechsel, ".press-btn"));
check("Umschalter ist verschwunden", !visible(wechsel, ".switch"));

console.log("\n7. Bedienelement abschaltbar");
const ohne = build({ entity: "button.garagentor", show_toggle: false });
check("kein Bedienelement sichtbar",
  !visible(ohne, ".press-btn") && !visible(ohne, ".switch") && !visible(ohne, ".cover-ctrl"));

console.log("\n8. Eigener Name schlägt den Entitätsnamen");
const benannt = build({ entity: "light.wohnzimmer", name: "Garage unten", icon: "mdi:garage" });
check("Name wird angezeigt", sr(benannt).querySelector(".title").textContent === "Garage unten",
  sr(benannt).querySelector(".title").textContent);
check("Symbol wird übernommen", sr(benannt).querySelector(".chip ha-icon").getAttribute("icon") === "mdi:garage");

// Bis 0.3.0 legte ha-form-expandable die Felder verschachtelt ab. Solche
// Konfigurationen liegen gespeichert vor und dürfen nicht verlorengehen.
const alt = build({
  entity: "button.garagentor",
  darstellung: { name: "Garage unten", icon: "mdi:garage" },
  aktion: { tap_action: { action: "more-info" } },
});
check("alter verschachtelter Name wird gelesen", sr(alt).querySelector(".title").textContent === "Garage unten",
  sr(alt).querySelector(".title").textContent);
check("altes verschachteltes Symbol wird gelesen",
  sr(alt).querySelector(".chip ha-icon").getAttribute("icon") === "mdi:garage");

const editor = document.createElement("ha-os-card-editor");
editor.hass = makeHass();
editor.setConfig({
  type: "custom:ha-os-card", card_type: "button", entity: "button.garagentor",
  darstellung: { name: "Garage unten", icon: "mdi:garage" },
});
document.body.append(editor);
const form = editor.shadowRoot.querySelector("ha-form");
check("Editor zeigt den alten Namen flach an", form.data.name === "Garage unten", JSON.stringify(form.data));
check("Editor hat den alten Block aufgelöst", form.data.darstellung === undefined, JSON.stringify(form.data));

const appearance = form.schema.find((f) => f.name === "darstellung");
check("Darstellungsblock schreibt jetzt flach", appearance?.flatten === true,
  JSON.stringify({ flatten: appearance?.flatten }));
const action = form.schema.find((f) => f.name === "aktion");
check("Aktionsblock schreibt jetzt flach", action?.flatten === true);

console.log(failures === 0 ? "\nAlle Prüfungen bestanden.\n" : `\n${failures} FEHLER.\n`);
process.exit(failures === 0 ? 0 : 1);
