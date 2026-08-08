/**
 * Prüft die Druckerkarte.
 *
 * Der wichtigste Punkt ist, was sie NICHT tut: nichts ist auf bestimmte
 * Entitäten festgelegt. Die Karte kennt nur, was im Editor gesetzt wurde.
 * Das Erraten aus einer gewählten Entität ist eine Hilfe beim Einrichten und
 * schreibt die Namen einmalig in die Konfiguration – es läuft nicht bei jedem
 * Laden neu.
 *
 * Deshalb prüft dieser Test mit ZWEI Namensschemata: einem deutschen mit
 * kurzer Kennung und einem englischen mit mehrteiliger Kennung.
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
const { guessEntities } = HAOS;

const calls = [];
const state = (id, value, attributes = {}) => ({ entity_id: id, state: value, attributes });

/** Deutsche Installation, kurze Kennung – so heisst es bei Enrico. */
const deutsch = {
  "sensor.p1s_druckstatus": state("sensor.p1s_druckstatus", "printing"),
  "sensor.p1s_aktueller_arbeitsschritt": state("sensor.p1s_aktueller_arbeitsschritt", "Drucken"),
  "sensor.p1s_druckfortschritt": state("sensor.p1s_druckfortschritt", "42", { unit_of_measurement: "%" }),
  "sensor.p1s_name_der_aufgabe": state("sensor.p1s_name_der_aufgabe", "halter.3mf"),
  "sensor.p1s_verbleibende_zeit": state("sensor.p1s_verbleibende_zeit", "134", { unit_of_measurement: "min" }),
  "sensor.p1s_endzeit": state("sensor.p1s_endzeit", "18:42"),
  "sensor.p1s_aktuelle_schicht": state("sensor.p1s_aktuelle_schicht", "84"),
  "sensor.p1s_gesamtzahl_der_schichten": state("sensor.p1s_gesamtzahl_der_schichten", "200"),
  "sensor.p1s_temperatur_der_duse": state("sensor.p1s_temperatur_der_duse", "218", { unit_of_measurement: "°C" }),
  "sensor.p1s_zieltemperatur_der_duse": state("sensor.p1s_zieltemperatur_der_duse", "220", { unit_of_measurement: "°C" }),
  "sensor.p1s_druckbetttemperatur": state("sensor.p1s_druckbetttemperatur", "59", { unit_of_measurement: "°C" }),
  "sensor.p1s_zieltemperatur_vom_druckbett": state("sensor.p1s_zieltemperatur_vom_druckbett", "60", { unit_of_measurement: "°C" }),
  "sensor.p1s_bauteillufterdrehzahl": state("sensor.p1s_bauteillufterdrehzahl", "80", { unit_of_measurement: "U/min" }),
  "fan.p1s_bauteillufter": state("fan.p1s_bauteillufter", "on", { percentage: 80 }),
  "sensor.p1s_ams_1_slot_1": state("sensor.p1s_ams_1_slot_1", "PLA Schwarz", {
    color: "#101010FF", type: "PLA", remain: 62, remain_enabled: true, empty: false,
  }),
  "sensor.p1s_ams_1_slot_2": state("sensor.p1s_ams_1_slot_2", "Empty", { empty: true, remain: -1 }),
  "sensor.p1s_ams_1_temperatur": state("sensor.p1s_ams_1_temperatur", "28", { unit_of_measurement: "°C" }),
  "sensor.p1s_ams_1_luftfeuchtigkeit": state("sensor.p1s_ams_1_luftfeuchtigkeit", "22", { unit_of_measurement: "%" }),
  "sensor.p1s_aktiver_slot": state("sensor.p1s_aktiver_slot", "1"),
  "binary_sensor.p1s_online": state("binary_sensor.p1s_online", "on"),
  "binary_sensor.p1s_druckfehler": state("binary_sensor.p1s_druckfehler", "off"),
  "button.p1s_druckvorgang_anhalten": state("button.p1s_druckvorgang_anhalten", "unknown"),
  "button.p1s_druckvorgang_fortsetzen": state("button.p1s_druckvorgang_fortsetzen", "unknown"),
  "button.p1s_druckvorgang_beenden": state("button.p1s_druckvorgang_beenden", "unknown"),
  "light.p1s_druckraumbeleuchtung": state("light.p1s_druckraumbeleuchtung", "on"),
  "select.p1s_druckgeschwindigkeit": state("select.p1s_druckgeschwindigkeit", "Standard", {
    options: ["Leise", "Standard", "Sport", "Ludicrous"],
  }),
  "camera.p1s_kamera": state("camera.p1s_kamera", "idle", { entity_picture: "/api/camera_proxy/camera.p1s_kamera?token=t" }),
  "image.p1s_titelbild": state("image.p1s_titelbild", "2026-08-08", { entity_picture: "/api/image_proxy/image.p1s_titelbild" }),
};

/** Englische Installation, mehrteilige Kennung – der schwierigere Fall. */
const englisch = {
  "sensor.bambu_x1c_print_status": state("sensor.bambu_x1c_print_status", "idle"),
  "sensor.bambu_x1c_print_progress": state("sensor.bambu_x1c_print_progress", "7", { unit_of_measurement: "%" }),
  "sensor.bambu_x1c_remaining_time": state("sensor.bambu_x1c_remaining_time", "45", { unit_of_measurement: "min" }),
  "sensor.bambu_x1c_nozzle_temperature": state("sensor.bambu_x1c_nozzle_temperature", "30", { unit_of_measurement: "°C" }),
  "sensor.bambu_x1c_bed_temperature": state("sensor.bambu_x1c_bed_temperature", "25", { unit_of_measurement: "°C" }),
  "binary_sensor.bambu_x1c_online": state("binary_sensor.bambu_x1c_online", "on"),
};

const makeHass = (states) => ({
  states,
  callService: (domain, service, data) => {
    calls.push(`${domain}.${service}:${data?.entity_id ?? ""}`);
    return Promise.resolve();
  },
  formatEntityState: (s) => s.state,
  connection: { subscribeMessage: () => Promise.reject(new Error("nicht unterstützt")) },
});

const build = (config, states = deutsch) => {
  const card = document.createElement("ha-os-printer");
  card.setConfig({ type: "custom:ha-os-printer", ...config });
  document.body.append(card);
  card.hass = makeHass(states);
  return card;
};

const sr = (card) => card.shadowRoot;
const text = (card, sel) => sr(card).querySelector(sel)?.textContent ?? "";
const rowValue = (card, label) =>
  [...sr(card).querySelectorAll(".row")]
    .find((r) => r.querySelector(".row-label").textContent === label && !r.hidden)
    ?.querySelector(".row-value").textContent;

console.log("\n1. Nichts ist fest verdrahtet");
const leer = build({});
check("ohne Konfiguration keine Werte", Boolean(sr(leer).querySelector(".empty")) && !sr(leer).querySelector(".empty").hidden);
check("keine Tafel sichtbar", [...sr(leer).querySelectorAll(".panel")].every((p) => p.hidden));

console.log("\n2. Raten aus einer gewaehlten Entitaet – deutsch");
const geraten = guessEntities("sensor.p1s_druckstatus", makeHass(deutsch));
check("Status gefunden", geraten.status === "sensor.p1s_druckstatus", geraten.status);
check("Fortschritt gefunden", geraten.progress === "sensor.p1s_druckfortschritt", geraten.progress);
check("Kamera gefunden", geraten.camera === "camera.p1s_kamera", geraten.camera);
check("Knopf gefunden", geraten.pause === "button.p1s_druckvorgang_anhalten", geraten.pause);
check("viele Felder gefunden", Object.keys(geraten).length >= 20, `${Object.keys(geraten).length}`);

console.log("\n3. Raten – englisch mit mehrteiliger Kennung");
const geratenEn = guessEntities("sensor.bambu_x1c_print_status", makeHass(englisch));
check("laengere Kennung wird erkannt", geratenEn.status === "sensor.bambu_x1c_print_status", geratenEn.status);
check("englische Endungen greifen", geratenEn.nozzle === "sensor.bambu_x1c_nozzle_temperature", geratenEn.nozzle);
check("nur Vorhandenes wird eingetragen", geratenEn.camera === undefined, geratenEn.camera || "-");

console.log("\n4. Fremde Entitaet raet nichts zusammen");
const nichts = guessEntities("light.wohnzimmer", makeHass(deutsch));
check("keine wilden Treffer", Object.keys(nichts).length === 0, JSON.stringify(nichts));

console.log("\n5. Uebersicht");
const voll = build(Object.fromEntries(Object.entries(geraten).map(([k, v]) => [`entity_${k}`, v])));
// Die Kopfzeile mit Name und zwei Pillen ist weg - sie kostete eine ganze
// Zeile und wiederholte, was ohnehin in der Liste steht. Status und Fehler
// sind als Zeilen geblieben, sie stehen sonst nirgends.
check("keine Kopfzeile mehr", !sr(voll).querySelector(".head"));
check("Status als Zeile", rowValue(voll, "Status") === "printing", rowValue(voll, "Status"));
check("kein Fehler, keine Zeile", rowValue(voll, "Fehler") === undefined);
check("Fortschritt gross", text(voll, ".hero-value") === "42 %", text(voll, ".hero-value"));
check("Balken auf 42 %", sr(voll).querySelector(".bar span").style.width === "42%");
check("Restzeit in Stunden und Minuten", text(voll, ".hero-foot span") === "noch 2 h 14 min", text(voll, ".hero-foot span"));
// Die Restzeit steht nur unter dem Balken, nicht zusaetzlich als Zeile.
check("keine doppelte Restzeit", rowValue(voll, "Restzeit") === undefined);
check("Auftrag als Zeile", rowValue(voll, "Auftrag") === "halter.3mf", rowValue(voll, "Auftrag"));
check("Schicht als Bruch", rowValue(voll, "Schicht") === "84 / 200", rowValue(voll, "Schicht"));
check("Titelbild wird gezeigt", Boolean(sr(voll).querySelector(".hero-image img")));

console.log("\n6. Lüfter mit Regler");
sr(voll).querySelectorAll(".rail button")[1].click();
const luefter = [...sr(voll).querySelectorAll(".fan")].filter((f) => !f.hidden);
check("nur gesetzte Luefter erscheinen", luefter.length === 1, `${luefter.length}`);
check("Wert in Prozent", luefter[0].querySelector(".fan-value").textContent === "80 %",
  luefter[0].querySelector(".fan-value").textContent);
check("Spur zeigt den Stand", luefter[0].querySelector(".fan-fill").style.width === "80%",
  luefter[0].querySelector(".fan-fill").style.width);
// Je schneller, desto dunkler: bei 80 % wird die Akzentfarbe deutlich
// abgedunkelt, bei 10 % kaum.
const fuellung80 = luefter[0].querySelector(".fan-fill").style.background;
check("Verlauf in der Akzentfarbe", fuellung80.includes("--haos-accent"), fuellung80.slice(0, 60));
check("Drehzahl darunter", luefter[0].querySelector(".fan-speed").textContent.includes("80"),
  luefter[0].querySelector(".fan-speed").textContent);

const regler = luefter[0].querySelector("input[type=range]");
check("Regler steht auf dem Wert", regler.value === "80", regler.value);

calls.length = 0;
regler.value = "40";
regler.dispatchEvent(new dom.window.Event("input"));
const fuellung40 = luefter[0].querySelector(".fan-fill").style.background;
check("beim Ziehen faerbt es sofort um", fuellung40 !== fuellung80);
check("dabei noch kein Dienstaufruf", calls.length === 0, calls.join(", "));

regler.dispatchEvent(new dom.window.Event("change"));
check("Loslassen setzt die Drehzahl", calls[0] === "fan.set_percentage:fan.p1s_bauteillufter", calls.join(", "));

calls.length = 0;
regler.value = "0";
regler.dispatchEvent(new dom.window.Event("change"));
check("Null schaltet aus statt 0 Prozent zu setzen",
  calls[0] === "fan.turn_off:fan.p1s_bauteillufter", calls.join(", "));

console.log("\n7. AMS");
sr(voll).querySelectorAll(".rail button")[2].click();
const slots = [...sr(voll).querySelectorAll(".slot")].filter((s) => !s.hidden);
check("zwei Slots sichtbar", slots.length === 2, `${slots.length}`);
check("Fuellstand als Balken", slots[0].querySelector(".slot-fill span").style.width === "62%",
  slots[0].querySelector(".slot-fill span").style.width);
check("Fuellstand als Text", slots[0].querySelector(".slot-remain").textContent === "62 %",
  slots[0].querySelector(".slot-remain").textContent);
check("Filamentart statt Slotnummer", slots[0].querySelector(".slot-label").textContent === "PLA",
  slots[0].querySelector(".slot-label").textContent);
check("ohne Messung kein Balken", slots[1].querySelector(".slot-fill").hidden);
check("Filament benannt", slots[0].querySelector(".slot-name").textContent === "PLA Schwarz");
check("leerer Slot heisst leer", slots[1].querySelector(".slot-name").textContent === "leer");
check("aktiver Slot markiert", slots[0].classList.contains("active"));
check("Luftfeuchte als Zeile", rowValue(voll, "Luftfeuchte") === "22 %", rowValue(voll, "Luftfeuchte"));

console.log("\n8. Steuerung – direkt auf der Uebersicht, Beenden fragt nach");
sr(voll).querySelectorAll(".rail button")[0].click();
check("drei Bereiche in der Leiste", sr(voll).querySelectorAll(".rail button").length === 3,
  `${sr(voll).querySelectorAll(".rail button").length}`);
check("Steuerung steht in der Uebersicht",
  Boolean(sr(voll).querySelector(".panel:not([hidden]) .control-block")));
calls.length = 0;
const [pause, resume, stop, licht] = sr(voll).querySelectorAll(".ctrl");
pause.click();
check("Anhalten loest sofort aus", calls[0] === "button.press:button.p1s_druckvorgang_anhalten", calls.join(", "));

calls.length = 0;
stop.click();
check("erster Druck auf Beenden loest NICHT aus", calls.length === 0, calls.join(", "));
check("Knopf fragt nach", stop.textContent.includes("Wirklich"), stop.textContent);
stop.click();
check("zweiter Druck beendet", calls[0] === "button.press:button.p1s_druckvorgang_beenden", calls.join(", "));
check("Rueckfrage ist zurueckgesetzt", !stop.textContent.includes("Wirklich"), stop.textContent);

calls.length = 0;
licht.click();
check("Licht schaltet um", calls[0] === "light.toggle:light.p1s_druckraumbeleuchtung", calls.join(", "));

// Geschwindigkeit als Segmentumschalter statt Aufklappmenue: alle Stufen
// sichtbar, ein Tipp statt zwei.
const stufen = [...sr(voll).querySelectorAll(".speed-wrap .haos-seg-option")];
check("alle Stufen sichtbar", stufen.length === 4, `${stufen.length}`);
check("aktuelle Stufe hervorgehoben",
  stufen.find((s2) => s2.classList.contains("active"))?.textContent === "Standard",
  stufen.map((s2) => s2.textContent).join(" | "));
calls.length = 0;
stufen.find((s2) => s2.textContent === "Sport").click();
check("Auswahl wird gesetzt", calls[0] === "select.select_option:select.p1s_druckgeschwindigkeit", calls.join(", "));
check("Hervorhebung wandert mit",
  stufen.find((s2) => s2.classList.contains("active"))?.textContent === "Sport",
  stufen.map((s2) => s2.textContent).join(" | "));

console.log("\n9. Bild und Kamera in einer Kachel");
sr(voll).querySelectorAll(".rail button")[0].click();
check("nur noch drei Bereiche", sr(voll).querySelectorAll(".rail button").length === 3,
  `${sr(voll).querySelectorAll(".rail button").length}`);
const bild = sr(voll).querySelector(".media img");
check("zeigt zuerst das Titelbild", bild.getAttribute("src") === "/api/image_proxy/image.p1s_titelbild",
  bild.getAttribute("src") || "");
check("kein Zeitstempel am Standbild", !/[?&]_=\d+/.test(bild.getAttribute("src") || ""));

const [foto, kam] = sr(voll).querySelectorAll(".media-toggle .haos-seg-option");
check("Umschalter vorhanden", Boolean(foto) && Boolean(kam));
check("Foto ist aktiv", foto.classList.contains("active"));
check("gleitende Pille statt gefaerbtem Knopf",
  Boolean(sr(voll).querySelector(".media-toggle .haos-seg-pill")));
kam.click();
check("Kamera wird geladen", bild.getAttribute("src")?.includes("camera_proxy"), bild.getAttribute("src") || "");
check("Zeitstempel gegen den Cache", /[?&]_=\d+/.test(bild.getAttribute("src") || ""));
check("Kamera ist aktiv", kam.classList.contains("active"));

sr(voll).querySelectorAll(".rail button")[1].click();
check("anderer Bereich stoppt den Abruf", !bild.getAttribute("src"), bild.getAttribute("src") || "");
sr(voll).querySelectorAll(".rail button")[0].click();

console.log("\n9b. Temperaturgraph");
check("Graph vorhanden", Boolean(sr(voll).querySelector(".graph-svg")));
// Zwei getrennte Kacheln: in einem gemeinsamen Diagramm klebt bei
// unterschiedlichen Bereichen die eine Linie oben und die andere unten.
const graphen = [...sr(voll).querySelectorAll(".graph")].filter((g) => !g.hidden);
check("zwei Kacheln nebeneinander", graphen.length === 2, `${graphen.length}`);
check("Duese beschriftet",
  graphen[0].querySelector(".graph-label").textContent === "Düse" &&
    graphen[0].querySelector(".graph-value").textContent === "218 °C",
  graphen[0].textContent);
check("Bett beschriftet",
  graphen[1].querySelector(".graph-label").textContent === "Bett" &&
    graphen[1].querySelector(".graph-value").textContent === "59 °C",
  graphen[1].textContent);
check("je eine eigene Linie", graphen[0].querySelector(".l-nozzle") && graphen[1].querySelector(".l-bed"));

console.log("\n9c. Fehler wird gemeldet");
{
  const kaputt = build(
    Object.fromEntries(Object.entries(geraten).map(([k, v]) => [`entity_${k}`, v])),
    { ...deutsch, "binary_sensor.p1s_druckfehler": state("binary_sensor.p1s_druckfehler", "on") }
  );
  check("Fehlerzeile erscheint", rowValue(kaputt, "Fehler") === "Fehler", rowValue(kaputt, "Fehler"));
}

console.log("\n10. Teilweise eingerichtet");
const wenig = build({ entity_progress: "sensor.p1s_druckfortschritt", entity_online: "binary_sensor.p1s_online" });
check("Karte baut trotzdem", text(wenig, ".hero-value") === "42 %", text(wenig, ".hero-value"));
check("leere Zeilen fehlen ganz", rowValue(wenig, "Auftrag") === undefined);
check("kein Hinweis auf fehlende Einrichtung", sr(wenig).querySelector(".empty").hidden);

console.log(failures === 0 ? "\nAlle Prüfungen bestanden.\n" : `\n${failures} Prüfung(en) fehlgeschlagen.\n`);
process.exit(failures === 0 ? 0 : 1);
