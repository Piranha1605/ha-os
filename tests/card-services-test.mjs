/**
 * Prüft die Dienstaufrufe und Wertebereiche der Karten.
 *
 * Anlass waren drei Fehler aus der Bestandsaufnahme:
 *   1. Media rief shuffle_set und repeat_set ohne den benötigten Parameter auf
 *   2. Der Slider stand fest auf 0–100 und schrieb bei number-Entitäten mit
 *      eigenem Bereich falsche Werte
 *   3. Die Energiekarte las Zählerstände aus dem Verlauf statt aus HAs
 *      Statistik und zeigte damit Höchststände statt Verbrauch
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
let wsCalls = [];
let statistikAntwort = {};

const zustand = (id, state, attributes = {}) => ({ entity_id: id, state, attributes });

const makeHass = (extra = {}) => ({
  states: {
    "select.modus": zustand("select.modus", "Auto", {
      friendly_name: "Modus",
      options: ["Auto", "Party", "Nacht"],
    }),
    // Player kann alles: play, pause, prev, next, shuffle, repeat
    "media_player.voll": zustand("media_player.voll", "playing", {
      friendly_name: "Wohnzimmer",
      supported_features: 1 | 16 | 32 | 16384 | 32768 | 262144,
      shuffle: false,
      repeat: "off",
      media_duration: 200,
      media_position: 20,
    }),
    // Player kann nur play/pause
    "media_player.karg": zustand("media_player.karg", "playing", {
      friendly_name: "Radio",
      supported_features: 1 | 16384,
    }),
    // Sollwert mit eigenem Bereich – der Fall, in dem 0–100 falsch war
    "number.sollwert": zustand("number.sollwert", "21", {
      friendly_name: "Sollwert",
      min: 5,
      max: 35,
      step: 0.5,
      unit_of_measurement: "°C",
    }),
    "light.wohnzimmer": zustand("light.wohnzimmer", "on", { friendly_name: "Licht", brightness: 128 }),
    "sensor.strom": zustand("sensor.strom", "412", { friendly_name: "Strom", unit_of_measurement: "kWh" }),
    ...extra,
  },
  callService: (domain, service, data) => {
    calls.push({ dienst: `${domain}.${service}`, daten: { ...data } });
    return Promise.resolve();
  },
  callApi: () => Promise.resolve([[]]),
  callWS: (msg) => {
    wsCalls.push(msg);
    if (msg.type === "recorder/statistics_during_period") return Promise.resolve(statistikAntwort);
    return Promise.reject(new Error("nicht unterstützt"));
  },
  formatEntityState: (s) => s.state,
  connection: { subscribeMessage: () => Promise.reject(new Error("nicht unterstützt")) },
});

const build = (config, hass = makeHass()) => {
  const card = document.createElement("ha-os-card");
  card.setConfig({ type: "custom:ha-os-card", ...config });
  document.body.append(card);
  card.hass = hass;
  return card;
};
const sr = (card) => card.shadowRoot;
const settle = () => new Promise((r) => setTimeout(r, 40));

console.log("\n1. Media – Mischen und Wiederholen");
const media = build({ card_type: "media", entity: "media_player.voll" });
const knoepfe = [...sr(media).querySelectorAll(".media-controls button")];
check("fünf Knöpfe angelegt", knoepfe.length === 5, `${knoepfe.length}`);
check("alle sichtbar bei vollem Funktionsumfang", knoepfe.every((b) => !b.hidden));

calls.length = 0;
knoepfe[0].click();
check("Mischen sendet den Parameter mit",
  calls[0]?.dienst === "media_player.shuffle_set" && calls[0]?.daten.shuffle === true,
  JSON.stringify(calls[0]));

calls.length = 0;
knoepfe[4].click();
check("Wiederholen sendet den Parameter mit",
  calls[0]?.dienst === "media_player.repeat_set" && calls[0]?.daten.repeat === "all",
  JSON.stringify(calls[0]));

// Reihenfolge aus > alle > eines > aus
const hassAlle = makeHass();
hassAlle.states["media_player.voll"].attributes.repeat = "all";
media.hass = hassAlle;
calls.length = 0;
knoepfe[4].click();
check("Wiederholen schaltet weiter auf eines", calls[0]?.daten.repeat === "one", JSON.stringify(calls[0]));

const hassEines = makeHass();
hassEines.states["media_player.voll"].attributes.repeat = "one";
media.hass = hassEines;
calls.length = 0;
knoepfe[4].click();
check("und danach wieder aus", calls[0]?.daten.repeat === "off", JSON.stringify(calls[0]));

console.log("\n2. Media – supported_features");
const karg = build({ card_type: "media", entity: "media_player.karg" });
const kargKnoepfe = [...sr(karg).querySelectorAll(".media-controls button")];
const sichtbar = kargKnoepfe.filter((b) => !b.hidden).length;
check("nur der unterstützte Knopf bleibt", sichtbar === 1, `${sichtbar} sichtbar`);

console.log("\n3. Slider – Bereich der Entität");
const slider = build({ card_type: "slider", entity: "number.sollwert" });
const input = sr(slider).querySelector('input[type="range"]');
check("Mindestwert kommt aus der Entität", Number(input.min) === 5, input.min);
check("Höchstwert kommt aus der Entität", Number(input.max) === 35, input.max);
check("Schrittweite kommt aus der Entität", Number(input.step) === 0.5, input.step);
check("Wert ist nicht auf 0–100 verbogen", Number(input.value) === 21, input.value);
check("Einheit steht in der Anzeige",
  sr(slider).querySelector(".slider-value").textContent === "21 °C",
  sr(slider).querySelector(".slider-value").textContent);

calls.length = 0;
input.value = "30";
input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
check("gesendet wird der echte Wert, keine Prozentzahl",
  calls[0]?.dienst === "number.set_value" && calls[0]?.daten.value === 30,
  JSON.stringify(calls[0]));

// Licht bleibt bei Prozent
const licht = build({ card_type: "slider", entity: "light.wohnzimmer" });
const lichtInput = sr(licht).querySelector('input[type="range"]');
check("Licht bleibt bei 0–100", Number(lichtInput.min) === 0 && Number(lichtInput.max) === 100);
check("Licht zeigt Prozent",
  sr(licht).querySelector(".slider-value").textContent.endsWith("%"),
  sr(licht).querySelector(".slider-value").textContent);

console.log("\n4. Energie – Statistik statt Verlauf");
wsCalls = [];
const heute = new Date();
const tag = (versatz) => {
  const d = new Date(heute);
  d.setDate(d.getDate() - versatz);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};
statistikAntwort = {
  "sensor.strom": [
    { start: tag(2), change: 4.2, state: 1000 },
    { start: tag(1), change: 5.1, state: 1005 },
    { start: tag(0), change: 3.3, state: 1010 },
  ],
};
const energie = build({ card_type: "energy", entity: "sensor.strom", days: 3 });
await settle();

const statistikRuf = wsCalls.find((m) => m.type === "recorder/statistics_during_period");
check("Statistik wird abgefragt", Boolean(statistikRuf));
check("Tagesraster angefordert", statistikRuf?.period === "day", statistikRuf?.period);
check("change wird mit angefordert", statistikRuf?.types?.includes("change"), JSON.stringify(statistikRuf?.types));

const balken = [...sr(energie).querySelectorAll(".bar")];
check("drei Balken gezeichnet", balken.length === 3, `${balken.length}`);
// 5.1 ist der Hoechstwert -> mittlerer Balken traegt die Markierung
check("höchster Verbrauch ist markiert", balken[1]?.classList.contains("peak"),
  balken.map((b) => b.className).join(" | "));

console.log("\n5. Energie – Rückfall auf den Verlauf");
wsCalls = [];
statistikAntwort = {};
const ohneStatistik = build({ card_type: "energy", entity: "sensor.strom", days: 3 });
await settle();
check("ohne Statistik wird der Verlauf versucht",
  wsCalls.some((m) => m.type === "recorder/statistics_during_period"));
check("kein Absturz ohne Daten", Boolean(sr(ohneStatistik).querySelector(".bars")));

console.log("\n6. Trenner");
{
  const bauen = (config) => {
    const karte = document.createElement("ha-os-card");
    karte.setConfig({ type: "custom:ha-os-card", card_type: "separator", ...config });
    document.body.append(karte);
    karte.hass = makeHass();
    return karte;
  };

  const mitText = bauen({ name: "Wohnzimmer", icon: "mdi:sofa" });
  const wurzel = mitText.shadowRoot;
  check("Trenner gebaut", Boolean(wurzel.querySelector(".sep")));
  check("Text erscheint", wurzel.querySelector(".sep-text span").textContent === "Wohnzimmer",
    wurzel.querySelector(".sep-text span").textContent);
  check("Symbol erscheint", !wurzel.querySelector(".sep-text ha-icon").hidden);
  // Ein Trenner soll gliedern, nicht wie eine weitere Karte aussehen.
  check("keine Glasflaeche", wurzel.querySelector(".card").classList.contains("plain"));
  check("Linie rechts vom Text", !wurzel.querySelectorAll(".sep-line")[1].hidden);

  const ohneLinie = bauen({ name: "Nur Text", show_line: false });
  check("Linie abschaltbar",
    [...ohneLinie.shadowRoot.querySelectorAll(".sep-line")].every((l) => l.hidden));

  const mittig = bauen({ name: "Mitte", align: "center" });
  check("mittig: Linie auf beiden Seiten",
    [...mittig.shadowRoot.querySelectorAll(".sep-line")].every((l) => !l.hidden));

  const leer = bauen({});
  check("ohne Text eine durchgehende Linie",
    leer.shadowRoot.querySelector(".sep-text").hidden &&
      !leer.shadowRoot.querySelectorAll(".sep-line")[0].hidden);
}

console.log("\n7. Auswahl als Segmentumschalter");
{
  const karte = document.createElement("ha-os-card");
  karte.setConfig({
    type: "custom:ha-os-card",
    card_type: "select",
    entity: "select.modus",
    display: "buttons",
  });
  document.body.append(karte);
  karte.hass = makeHass();

  const optionen = [...karte.shadowRoot.querySelectorAll(".haos-seg-option")];
  check("Optionen als Segmente", optionen.length === 3, `${optionen.length}`);
  check("gleitende Pille", Boolean(karte.shadowRoot.querySelector(".haos-seg-pill")));
  check("aktuelle Option hervorgehoben",
    optionen.find((o) => o.classList.contains("active"))?.textContent === "Auto",
    optionen.map((o) => o.textContent).join(" | "));

  calls.length = 0;
  optionen.find((o) => o.textContent === "Party").click();
  check("Auswahl wird gesetzt mit der richtigen Option",
    calls[0]?.dienst === "select.select_option" && calls[0]?.daten?.option === "Party",
    JSON.stringify(calls[0] || {}));
}

console.log("\n8. Knoepfe tragen Glas");
{
  const karte = document.createElement("ha-os-card");
  karte.setConfig({ type: "custom:ha-os-card", card_type: "media", entity: "media_player.voll" });
  document.body.append(karte);
  karte.hass = makeHass();

  // Alle Bedienelemente ziehen ihre Flaeche aus denselben Theme-Variablen -
  // vorher stand dort eine feste Fuellung, die sich nicht mitregeln liess.
  const stil = karte.shadowRoot.querySelector("style").textContent;
  const glasig = (selektor) => {
    const i = stil.indexOf(selektor);
    if (i < 0) return false;
    const block2 = stil.slice(i, stil.indexOf("}", i));
    return block2.includes("backdrop-filter") && block2.includes("--haos-entity-surface-rgb");
  };
  check("Medienknoepfe", glasig(".media-controls button"));
  check("Taster", glasig(".press-btn"));
  check("Rollo-Knoepfe", glasig(".cover-ctrl button"));
  check("Thermostat-Schritte", glasig(".stepper button"));
  check("Betriebsarten", glasig(".mode .dot"));
  check("Abspielknopf bleibt kraeftig", stil.includes(".media-controls .play"));
}

console.log(failures === 0 ? "\nAlle Prüfungen bestanden.\n" : `\n${failures} Prüfung(en) fehlgeschlagen.\n`);
process.exit(failures === 0 ? 0 : 1);
