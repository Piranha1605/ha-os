/**
 * HA-OS – Rauchtest
 *
 * Prüft in einem simulierten Browser (jsdom), ob die Karten laden, sich
 * registrieren und – vor allem – ob die Shell bei hass-Updates ihr DOM
 * WIEDERVERWENDET statt es neu zu bauen. Genau das war der Fehler in v1.6.0.
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
  if (condition) {
    console.log(`  OK    ${name}`);
  } else {
    failures += 1;
    console.log(`  FEHLER ${name}${detail ? ` – ${detail}` : ""}`);
  }
};

// ---------------------------------------------------------------- Fake-hass

const makeState = (entityId, state, attributes = {}) => ({
  entity_id: entityId,
  state,
  attributes,
  last_changed: new Date().toISOString(),
  last_updated: new Date().toISOString(),
});

const serviceCalls = [];

const makeHass = (states) => ({
  states,
  callService: (domain, service, data) => {
    serviceCalls.push(`${domain}.${service}`);
    return Promise.resolve();
  },
  callApi: () => Promise.resolve([]),
  formatEntityState: (state) => `${state.state}`,
  connection: { subscribeMessage: () => Promise.reject(new Error("nicht unterstützt")) },
});

const baseStates = {
  "person.enrico": makeState("person.enrico", "home", { friendly_name: "Enrico" }),
  "person.chatgpt": makeState("person.chatgpt", "not_home", { friendly_name: "ChatGPT" }),
  "light.wohnzimmer": makeState("light.wohnzimmer", "on", { friendly_name: "Wohnzimmer", brightness: 128 }),
  "switch.garten": makeState("switch.garten", "off", { friendly_name: "Garten" }),
  "climate.thermostat": makeState("climate.thermostat", "heat", {
    friendly_name: "Thermostat",
    temperature: 21.5,
    current_temperature: 20.1,
    min_temp: 7,
    max_temp: 35,
    hvac_modes: ["off", "heat", "cool", "auto"],
  }),
  "sensor.strom": makeState("sensor.strom", "412", { friendly_name: "Strom", unit_of_measurement: "W" }),
  "media_player.stereo": makeState("media_player.stereo", "playing", {
    friendly_name: "Stereo",
    media_title: "COFFIN",
    media_artist: "Jessie Reyez",
    media_duration: 212,
    media_position: 131,
  }),
  "weather.zuhause": makeState("weather.zuhause", "partlycloudy", {
    friendly_name: "Zuhause",
    temperature: 23,
    wind_speed: 32.4,
    forecast: [
      { datetime: new Date().toISOString(), temperature: 24, condition: "sunny" },
      { datetime: new Date().toISOString(), temperature: 25, condition: "cloudy" },
    ],
  }),
  "select.modus": makeState("select.modus", "Auto", { friendly_name: "Modus", options: ["Auto", "Manuell"] }),
  "calendar.mull": makeState("calendar.mull", "off", { friendly_name: "Müll" }),
  "input_boolean.vollbild": makeState("input_boolean.vollbild", "off", { friendly_name: "Vollbild" }),
};

// ---------------------------------------------------------------- Laden

console.log("\n1. Module laden");
const TARGET = process.env.HAOS_TARGET
  ? new URL(process.env.HAOS_TARGET, `file://${process.cwd()}/`).href
  : new URL("../dist/ha-os.js", import.meta.url).href;
console.log(`  (geprueft wird: ${TARGET.replace("file://", "")})`);
const HAOS = await import(TARGET);

check("ha-os-shell registriert", Boolean(customElements.get("ha-os-shell")));
check("ha-os-card registriert", Boolean(customElements.get("ha-os-card")));
check("ha-os-shell-editor registriert", Boolean(customElements.get("ha-os-shell-editor")));
check("ha-os-card-editor registriert", Boolean(customElements.get("ha-os-card-editor")));
check("ha-os-grid registriert", Boolean(customElements.get("ha-os-grid")));
check("ha-os-grid-editor registriert", Boolean(customElements.get("ha-os-grid-editor")));
check(
  "alle drei Karten im HA-Auswahldialog",
  ["ha-os-shell", "ha-os-card", "ha-os-grid"].every((type) =>
    window.customCards?.some((entry) => entry.type === type)
  ),
  `gefunden: ${window.customCards?.map((c) => c.type).join(", ")}`
);
check("Theme-Variablen gesetzt", document.documentElement.style.getPropertyValue("--haos-accent") === "#0a84ff");

// ---------------------------------------------------------------- Karten

console.log("\n2. Alle Kartentypen bauen");
const { CARD_TYPES } = HAOS;

const cardEntityFor = {
  button: "switch.garten",
  slider: "light.wohnzimmer",
  thermostat: "climate.thermostat",
  weather: "weather.zuhause",
  energy: "sensor.strom",
  media: "media_player.stereo",
  members: undefined,
  calendar: "calendar.mull",
  select: "select.modus",
  clock: undefined,
};

for (const { value } of CARD_TYPES) {
  const card = document.createElement("ha-os-card");
  document.body.append(card);
  try {
    card.setConfig({ type: "custom:ha-os-card", card_type: value, entity: cardEntityFor[value] });
    card.hass = makeHass(baseStates);
    const built = card.shadowRoot.querySelector(".card");
    check(`Typ "${value}" gebaut`, Boolean(built) && !built.querySelector(".error"));
  } catch (error) {
    check(`Typ "${value}" gebaut`, false, error.message);
  }
  card.remove();
}

// ---------------------------------------------------------------- Shell

console.log("\n3. Shell aufbauen");

const shellConfig = {
  type: "custom:ha-os-shell",
  gap: 16,
  row_height: 125,
  users: ["person.enrico", "person.chatgpt"],
  fullscreen_entity: "input_boolean.vollbild",
  quick_actions: [{ icon: "mdi:home", entity: "light.wohnzimmer", tap_action: { action: "toggle" } }],
  pages: [
    {
      id: "home",
      name: "Wohnzimmer",
      icon: "mdi:sofa",
      grid_widths: [1, 1.55, 1.05],
      badges: [{ entity: "light.wohnzimmer", tap_action: { action: "toggle" } }],
      grids: [
        { cards: [{ type: "custom:ha-os-card", card_type: "thermostat", entity: "climate.thermostat", haos_weight: 3 }] },
        { cards: [{ type: "custom:ha-os-card", card_type: "weather", entity: "weather.zuhause", haos_weight: 1.5 }] },
        { cards: [{ type: "custom:ha-os-card", card_type: "media", entity: "media_player.stereo" }] },
      ],
    },
    { id: "kueche", name: "Küche", icon: "mdi:silverware", grids: [{ cards: [] }, { cards: [] }, { cards: [] }] },
    { id: "extern", name: "Einstellungen", kind: "iframe", url: "/config/dashboard", hide_ha_chrome: true },
  ],
};

const shell = document.createElement("ha-os-shell");
document.body.append(shell);
shell.setConfig(shellConfig);
shell.hass = makeHass(baseStates);

await new Promise((resolve) => setTimeout(resolve, 60));

const root = shell.shadowRoot;
check("Glasfläche vorhanden", Boolean(root.querySelector(".shell")));
check("Seitenleiste vorhanden", Boolean(root.querySelector(".sidebar")));
check("Seiten stehen in der Seitenleiste",
  shell.shadowRoot.querySelectorAll(".side-top .icon-button").length >= 3,
  `${shell.shadowRoot.querySelectorAll(".side-top .icon-button").length} Symbole`);
check("drei Reiter erzeugt", root.querySelectorAll(".tab").length === 3);
check("Benutzericons sichtbar", root.querySelectorAll(".user").length === 2);
check(
  "abwesender Benutzer bleibt sichtbar",
  root.querySelectorAll(".user.is-away").length === 1,
  "not_home darf nicht ausgeblendet werden"
);
check("Badge erzeugt", root.querySelectorAll(".badge").length === 1);
check("drei Raster auf Home", root.querySelector('.page[data-page-id="home"]')?.querySelectorAll(".grid-column").length === 3);
check("Kinderkarten eingehängt", root.querySelectorAll(".slot").length === 3);

const thermostatSlot = root.querySelector(".slot");
check(
  "Höhenfaktor wirkt (3 x 125 px)",
  thermostatSlot?.style.getPropertyValue("--slot-height") === "375px",
  thermostatSlot?.style.getPropertyValue("--slot-height")
);

// ---------------------------------------------------------------- Kernprüfung

console.log("\n4. Kernprüfung: kein Neuaufbau bei hass-Updates");

const cardsBefore = [...root.querySelectorAll(".slot > *")];
const shellNodeBefore = root.querySelector(".shell");
check("Kinderkarten wurden erzeugt", cardsBefore.length === 3);

// 50 Zustandsänderungen simulieren, wie sie ein GPS-Update auslöst
for (let index = 0; index < 50; index += 1) {
  const states = {
    ...baseStates,
    "person.enrico": makeState("person.enrico", "home", {
      friendly_name: "Enrico",
      latitude: 48 + index / 1000,
    }),
  };
  shell.hass = makeHass(states);
}

const cardsAfter = [...root.querySelectorAll(".slot > *")];
check("Glasfläche ist dasselbe Element", root.querySelector(".shell") === shellNodeBefore);
check(
  "Kinderkarten wurden NICHT neu erzeugt",
  cardsBefore.length === cardsAfter.length && cardsBefore.every((node, index) => node === cardsAfter[index]),
  "genau das war der Fehler in v1.6.0"
);

// ---------------------------------------------------------------- Seitenwechsel

console.log("\n5. Seitenwechsel");

const tabs = [...root.querySelectorAll(".tab")];
tabs[1].dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await new Promise((resolve) => setTimeout(resolve, 30));

check("Küche ist aktiv", tabs[1].classList.contains("active"));
check("Home ist ausgeblendet", root.querySelector('.page[data-page-id="home"]')?.hidden === true);

tabs[0].dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await new Promise((resolve) => setTimeout(resolve, 30));

const cardsAfterSwitch = [...root.querySelectorAll('.page[data-page-id="home"] .slot > *')];
check(
  "Karten überleben den Seitenwechsel",
  cardsAfterSwitch.length === cardsBefore.length && cardsAfterSwitch.every((node, index) => node === cardsBefore[index]),
  "Karten dürfen beim Zurückwechseln nicht neu laden"
);
check("Seitenwechsel springt nicht auf Home zurück", tabs[0].classList.contains("active"));

// iFrame-Seite
tabs[2].dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await new Promise((resolve) => setTimeout(resolve, 30));
check("iFrame-Seite erzeugt", Boolean(root.querySelector('.page[data-page-id="extern"] iframe')));

// ---------------------------------------------------------------- Einstellungen

console.log("\n6. Interne Einstellungsseite");

const settingsButton = [...root.querySelectorAll(".side-bottom .icon-button")][0];
settingsButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await new Promise((resolve) => setTimeout(resolve, 30));

check("Einstellungsseite geöffnet", Boolean(root.querySelector(".settings")));
check("keine Popup-Dialoge", document.querySelectorAll("dialog").length === 0);
check("Regler vorhanden", root.querySelectorAll('.control input[type="range"]').length > 5);
check("Farbwähler vorhanden", root.querySelectorAll('.control input[type="color"]').length >= 5);

const accentInput = root.querySelector('.control input[type="color"]');
accentInput.value = "#ff0000";
accentInput.dispatchEvent(new window.Event("input", { bubbles: true }));
check(
  "Theme-Änderung wirkt über CSS-Variablen",
  document.documentElement.style.getPropertyValue("--haos-accent") === "#ff0000"
);
check(
  "Theme-Änderung baut die Shell nicht neu",
  root.querySelector(".shell") === shellNodeBefore,
  "Design muss über CSS laufen, nicht über JavaScript"
);

// ---------------------------------------------------------------- Editor

console.log("\n7. Editoren");

const cardEditor = document.createElement("ha-os-card-editor");
document.body.append(cardEditor);
cardEditor.hass = makeHass(baseStates);
cardEditor.setConfig({ type: "custom:ha-os-card", card_type: "button", entity: "switch.garten" });

const form = cardEditor.shadowRoot.querySelector("ha-form");
check("Karten-Editor erzeugt genau ein Formular", cardEditor.shadowRoot.querySelectorAll("ha-form").length === 1);
check("Typ-Auswahl steht an erster Stelle", form.schema?.[0]?.name === "card_type");

// Mehrfaches setConfig darf das Formular NICHT ersetzen (sonst Fokusverlust)
for (let index = 0; index < 10; index += 1) {
  cardEditor.setConfig({ type: "custom:ha-os-card", card_type: "button", entity: "switch.garten", name: `Test${index}` });
}
check(
  "Formular bleibt dasselbe Element",
  cardEditor.shadowRoot.querySelector("ha-form") === form,
  "sonst verliert das Textfeld beim Tippen den Fokus"
);

const beforeTypeChange = form.schema.length;
cardEditor.setConfig({ type: "custom:ha-os-card", card_type: "thermostat", entity: "climate.thermostat" });
check("Typwechsel tauscht das Schema", form.schema.length !== beforeTypeChange || form.schema[1]?.name === "entity");
check("Formular überlebt auch den Typwechsel", cardEditor.shadowRoot.querySelector("ha-form") === form);

const shellEditor = document.createElement("ha-os-shell-editor");
document.body.append(shellEditor);
shellEditor.hass = makeHass(baseStates);
shellEditor.setConfig(shellConfig);
check("Shell-Editor hat drei Reiter", shellEditor.shadowRoot.querySelectorAll(".tab").length === 3);
// Der Karten-Reiter wird hier nur kurz besucht und danach zurückgeschaltet –
// die folgende Prüfung erwartet wieder das Allgemein-Formular.
const kartenReiterOk = (() => {
  const editorTabs = [...shellEditor.shadowRoot.querySelectorAll(".tab")];
  const cardsTab = editorTabs.find((t) => t.textContent.includes("Karten"));
  if (!cardsTab) return false;
  cardsTab.click();
  const anzahl = shellEditor.shadowRoot.querySelectorAll(".card-tab").length;
  editorTabs[0].click();
  return anzahl > 0;
})();
check("Shell-Editor zeigt nummerierte Kartenreiter", kartenReiterOk);
check("Shell-Editor zeigt Allgemein-Formular", Boolean(shellEditor.shadowRoot.querySelector("ha-form")));

// ---------------------------------------------------------------- Grösse

console.log("\n8. Höhe und HA-Sections");

shell.setConfig(shellConfig);
const size = shell.getCardSize();
const gridOptions = shell.getGridOptions();
check("getCardSize liefert sinnvolle Zeilenzahl", size >= 8 && size < 40, `${size}`);
check("getGridOptions nutzt volle Breite", gridOptions.columns === "full");

// ---------------------------------------------------------------- Ergebnis

console.log(`\n${failures === 0 ? "Alle Prüfungen bestanden." : `${failures} Prüfung(en) fehlgeschlagen.`}\n`);
process.exit(failures === 0 ? 0 : 1);
