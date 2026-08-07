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
    [`sensor.${ID}_lock`]: state(`sensor.${ID}_lock`, "2"),
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
    [`sensor.${ID}_tires_rdk_state`]: state(`sensor.${ID}_tires_rdk_state`, "0"),
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
check("Reifen sagen nur ok", tile(karte, 0).label === "Reifen" && tile(karte, 0).value === "ok",
  `${tile(karte, 0).label}: ${tile(karte, 0).value}`);
check("Reifenkachel ist gruen", sr(karte).querySelectorAll(".tile-value")[0].classList.contains("good"));
check("Oelstand-Kachel vorhanden", tile(karte, 1).label === "Ölstand", tile(karte, 1).label);
check("keine Warnungen", tile(karte, 2).value === "keine", tile(karte, 2).value);
check("Warnungskachel ist gruen", sr(karte).querySelectorAll(".tile-value")[2].classList.contains("good"));
check("Starterbatterie ok", tile(karte, 3).value === "ok", tile(karte, 3).value);

console.log("\n4. Reifenwarnung");
const platt = build({}, makeHass({
  [`binary_sensor.${ID}_tire_warning`]: state(`binary_sensor.${ID}_tire_warning`, "on"),
}));
check("Reifen melden Warnung", tile(platt, 0).value === "Warnung", tile(platt, 0).value);
check("Reifenkachel ist rot", sr(platt).querySelectorAll(".tile-value")[0].classList.contains("bad"));
check("Reifen tauchen NICHT zusaetzlich bei den Warnungen auf", tile(platt, 2).value === "keine",
  tile(platt, 2).value);

console.log("\n5. Sonstige Warnungen");
const gewarnt = build({}, makeHass({
  [`binary_sensor.${ID}_low_wash_water_warning`]: state(`binary_sensor.${ID}_low_wash_water_warning`, "on"),
  [`binary_sensor.${ID}_engine_light_warning`]: state(`binary_sensor.${ID}_engine_light_warning`, "on"),
}));
check("beide Warnungen benannt", tile(gewarnt, 2).value === "Motorkontrollleuchte, Wischwasser", tile(gewarnt, 2).value);
check("Warnungskachel ist rot", sr(gewarnt).querySelectorAll(".tile-value")[2].classList.contains("bad"));

console.log("\n6. Ölstand");
check("ohne Entitaet ein Strich", tile(karte, 1).value === "–", tile(karte, 1).value);
const mitOel = build({}, makeHass({
  [`sensor.${ID}_oil_level`]: state(`sensor.${ID}_oil_level`, "80", { unit_of_measurement: "%" }),
}));
check("Wert wird angezeigt", tile(mitOel, 1).value === "80 %", tile(mitOel, 1).value);
const wenigOel = build({}, makeHass({
  [`sensor.${ID}_oil_level`]: state(`sensor.${ID}_oil_level`, "8", { unit_of_measurement: "%" }),
}));
check("niedriger Stand ist rot", sr(wenigOel).querySelectorAll(".tile-value")[1].classList.contains("bad"));

console.log("\n7. Offenes Fahrzeug");
const offen = build({}, makeHass({
  [`sensor.${ID}_lock`]: state(`sensor.${ID}_lock`, "0"),
  [`binary_sensor.${ID}_windows_closed`]: state(`binary_sensor.${ID}_windows_closed`, "off"),
}));
check("Offen erkannt", text(offen, ".pill span") === "Offen", `"${text(offen, ".pill span")}"`);
check("Offen ist rot", sr(offen).querySelector(".pill").classList.contains("bad"));
check("Fenster offen erkannt", sr(offen).querySelectorAll(".pill span")[1].textContent === "Fenster offen");

// Die vier Zustaende von doorlockstatusvehicle einzeln. In 0.10.0 bis 0.10.2
// galt 0 als verriegelt – ein offenes Auto meldete „Verriegelt".
const lockLabel = (value) =>
  text(build({}, makeHass({ [`sensor.${ID}_lock`]: state(`sensor.${ID}_lock`, value) })), ".pill span");
check("0 = entriegelt", lockLabel("0") === "Offen", lockLabel("0"));
check("1 = innen verriegelt", lockLabel("1") === "Verriegelt", lockLabel("1"));
check("2 = aussen verriegelt", lockLabel("2") === "Verriegelt", lockLabel("2"));
check("3 = teilentriegelt gilt als offen", lockLabel("3") === "Offen", lockLabel("3"));

console.log("\n8. Fehlende Werte werden nicht zu Null");
const luecken = build({}, makeHass({
  [`sensor.${ID}_range_liquid`]: state(`sensor.${ID}_range_liquid`, "unknown"),
  [`binary_sensor.${ID}_tire_warning`]: state(`binary_sensor.${ID}_tire_warning`, "unavailable"),
  [`sensor.${ID}_tires_rdk_state`]: state(`sensor.${ID}_tires_rdk_state`, "unavailable"),
  [`sensor.${ID}_tire_pressure_front_left`]: state(`sensor.${ID}_tire_pressure_front_left`, "unavailable"),
  [`sensor.${ID}_tire_pressure_front_right`]: state(`sensor.${ID}_tire_pressure_front_right`, "unavailable"),
  [`sensor.${ID}_tire_pressure_rear_left`]: state(`sensor.${ID}_tire_pressure_rear_left`, "unavailable"),
  [`sensor.${ID}_tire_pressure_rear_right`]: state(`sensor.${ID}_tire_pressure_rear_right`, "unavailable"),
}));
check("Reichweite zeigt einen Strich, keine 0", text(luecken, ".hero-value") === "–", `"${text(luecken, ".hero-value")}"`);
check("Reifen ohne jede Quelle zeigen einen Strich", tile(luecken, 0).value === "–", tile(luecken, 0).value);
check("Balken bleibt auf 62 %", sr(luecken).querySelector(".bar span").style.width === "62%");

console.log("\n9. Ueberschreiben schlaegt die Ableitung");
const eigen = build({
  entity_windows: "binary_sensor.garage_aussen_windows",
}, makeHass({
  "binary_sensor.garage_aussen_windows": state("binary_sensor.garage_aussen_windows", "off"),
}));
check("eigene Fensterentitaet wird benutzt",
  sr(eigen).querySelectorAll(".pill span")[1].textContent === "Fenster offen",
  sr(eigen).querySelectorAll(".pill span")[1].textContent);

console.log("\n10. Kein Neuaufbau bei hass-Updates");
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

console.log("\n11. Symbolleiste");
check("fuenf Bereiche", sr(karte).querySelectorAll(".rail button").length === 5);
check("Uebersicht ist aktiv", sr(karte).querySelector(".rail button").classList.contains("active"));
check("kein Bereich mehr gesperrt",
  [...sr(karte).querySelectorAll(".rail button")].every((b) => !b.disabled));
check("nur eine Tafel sichtbar",
  [...sr(karte).querySelectorAll(".panel")].filter((p) => !p.hidden).length === 1);

console.log("\n12. Ohne Fahrzeug");
const leer = build({ entity: "" }, makeHass());
check("Hinweis statt leerer Kacheln", text(leer, ".subtitle").includes("Editor"), `"${text(leer, ".subtitle")}"`);

console.log("\n12b. Die vier weiteren Bereiche");
const voll = build({}, makeHass({
  [`binary_sensor.${ID}_park_brake_status`]: state(`binary_sensor.${ID}_park_brake_status`, "on"),
  // Fensterkontakte mit Geraetenamen davor – fallen aus dem Namensmuster.
  // Echte Werte aus der Anlage: 2 heisst geschlossen, 1 offen.
  [`sensor.garage_aussen_${ID}_window_status_front_left`]:
    state(`sensor.garage_aussen_${ID}_window_status_front_left`, "2"),
  [`sensor.garage_aussen_${ID}_window_status_front_right`]:
    state(`sensor.garage_aussen_${ID}_window_status_front_right`, "1"),
  [`sensor.garage_aussen_${ID}_window_status_rear_left`]:
    state(`sensor.garage_aussen_${ID}_window_status_rear_left`, "2"),
  [`sensor.garage_aussen_${ID}_window_status_rear_right`]:
    state(`sensor.garage_aussen_${ID}_window_status_rear_right`, "2"),
  [`sensor.${ID}_distance_start`]: state(`sensor.${ID}_distance_start`, "12.4", { unit_of_measurement: "km" }),
  [`sensor.${ID}_distance_reset`]: state(`sensor.${ID}_distance_reset`, "845", { unit_of_measurement: "km" }),
  [`sensor.${ID}_average_speed_start`]: state(`sensor.${ID}_average_speed_start`, "38.2", { unit_of_measurement: "km/h" }),
  [`sensor.${ID}_average_speed_reset`]: state(`sensor.${ID}_average_speed_reset`, "52", { unit_of_measurement: "km/h" }),
  [`sensor.${ID}_liquid_consumption_start`]: state(`sensor.${ID}_liquid_consumption_start`, "8.1", { unit_of_measurement: "l/100km" }),
  [`sensor.${ID}_liquid_consumption_reset`]: state(`sensor.${ID}_liquid_consumption_reset`, "7.4", { unit_of_measurement: "l/100km" }),
  [`sensor.${ID}_eco_score_acceleration`]: state(`sensor.${ID}_eco_score_acceleration`, "82", { unit_of_measurement: "%" }),
  [`sensor.${ID}_eco_score_constant`]: state(`sensor.${ID}_eco_score_constant`, "64", { unit_of_measurement: "%" }),
  [`sensor.${ID}_eco_score_free_wheel`]: state(`sensor.${ID}_eco_score_free_wheel`, "45", { unit_of_measurement: "%" }),
  [`sensor.${ID}_eco_score_bonus_range`]: state(`sensor.${ID}_eco_score_bonus_range`, "5.2", { unit_of_measurement: "km" }),
}));

const panel = (name) => sr(voll).querySelectorAll(".panel")[["overview", "trip", "status", "tires", "eco"].indexOf(name)];
const rowValue = (label) =>
  [...sr(voll).querySelectorAll(".row")].find((r) => r.querySelector(".row-label").textContent === label)
    ?.querySelector(".row-value").textContent;

const klick = (index) => { sr(voll).querySelectorAll(".rail button")[index].click(); };

klick(2);
check("Status ist sichtbar", !panel("status").hidden && panel("overview").hidden);
check("Verriegelung in der Liste", rowValue("Verriegelung") === "verriegelt", rowValue("Verriegelung"));
check("Parkbremse angezogen", rowValue("Parkbremse") === "angezogen", rowValue("Parkbremse"));
check("Fenster mit Geraetenamen gefunden", rowValue("Fenster vorn links") === "geschlossen",
  rowValue("Fenster vorn links"));
check("2 heisst geschlossen", rowValue("Fenster hinten links") === "geschlossen", rowValue("Fenster hinten links"));
check("1 heisst offen", rowValue("Fenster vorn rechts") === "offen", rowValue("Fenster vorn rechts"));

// Die Zaehlung stand in 0.12.0 falsch herum: geschlossene Fenster meldeten
// „offen". Belegt am Fahrzeug – alle vier auf 2, windows_closed auf on.
const fenster = (value) => {
  const karte2 = build({}, makeHass({
    [`sensor.garage_aussen_${ID}_window_status_front_left`]:
      state(`sensor.garage_aussen_${ID}_window_status_front_left`, value),
  }));
  sr(karte2).querySelectorAll(".rail button")[2].click();
  return [...sr(karte2).querySelectorAll(".row")]
    .find((r) => r.querySelector(".row-label").textContent === "Fenster vorn links")
    ?.querySelector(".row-value").textContent;
};
check("0 wird nicht geraten", fenster("0") === "unbekannt", fenster("0"));
check("3 ist Lueftungsstellung", fenster("3") === "Lüftungsstellung", fenster("3"));
check("unbekannter Wert wird roh gezeigt", fenster("9") === "9", fenster("9"));
check("Warnleuchten einzeln", rowValue("Motorkontrollleuchte") === "ok", rowValue("Motorkontrollleuchte"));

klick(3);
check("Reifen ist sichtbar", !panel("tires").hidden && panel("status").hidden);
check("vier Druecke", sr(voll).querySelectorAll(".tire-value").length === 4);
check("Druck mit Einheit", sr(voll).querySelector(".tire-value").textContent === "2,4 bar",
  sr(voll).querySelector(".tire-value").textContent);
check("Hinweiszeile nennt das Kontrollsystem",
  panel("tires").querySelector(".panel-note").textContent.includes("Kontrollsystem"),
  panel("tires").querySelector(".panel-note").textContent);

const schief = build({}, makeHass({
  [`sensor.${ID}_tire_pressure_rear_right`]: state(`sensor.${ID}_tire_pressure_rear_right`, "1.9"),
}));
sr(schief).querySelectorAll(".rail button")[3].click();
check("Ausreisser wird hervorgehoben",
  [...sr(schief).querySelectorAll(".tire-value")].filter((n) => n.classList.contains("bad")).length === 1);

klick(1);
check("Fahrt ist sichtbar", !panel("trip").hidden);
check("zwei Spalten", sr(voll).querySelectorAll(".trip-col").length === 2);
check("Strecke seit Start", rowValue("Strecke") === "12,4 km", rowValue("Strecke"));
check("Verbrauch mit Einheit",
  [...sr(voll).querySelectorAll(".row")].filter((r) => r.querySelector(".row-label").textContent === "Verbrauch")
    .map((r) => r.querySelector(".row-value").textContent).join(" | ") === "8,1 l/100km | 7,4 l/100km",
  [...sr(voll).querySelectorAll(".row")].filter((r) => r.querySelector(".row-label").textContent === "Verbrauch")
    .map((r) => r.querySelector(".row-value").textContent).join(" | "));

klick(4);
check("Eco ist sichtbar", !panel("eco").hidden);
check("drei Balken", sr(voll).querySelectorAll(".eco-item").length === 3);
check("erster Wert", sr(voll).querySelector(".eco-value").textContent === "82 %",
  sr(voll).querySelector(".eco-value").textContent);
check("Balken auf 82 %", panel("eco").querySelector(".bar span").style.width === "82%",
  panel("eco").querySelector(".bar span").style.width);
check("Bonusreichweite als Fussnote",
  panel("eco").querySelector(".panel-note").textContent.includes("5,2 km"),
  panel("eco").querySelector(".panel-note").textContent);

console.log("\n12c. Bereichswechsel baut nichts neu");
const vorherTafeln = sr(voll).querySelectorAll(".panel").length;
const ersteTafel = sr(voll).querySelector(".panel");
klick(0); klick(3); klick(0);
check("gleiche Anzahl Tafeln", sr(voll).querySelectorAll(".panel").length === vorherTafeln);
check("dieselbe erste Tafel", sr(voll).querySelector(".panel") === ersteTafel);

console.log("\n13. Editor: das Bildfeld ist wirklich da");
// Anlass: als `{ name: "image", selector: { image: {} } }` im Formularschema
// liess ha-form das Feld stillschweigend weg – kein Feld, keine Meldung.
// Deshalb steht es ausserhalb des Formulars und wird hier nachgeprueft.
const editor = document.createElement("ha-os-vehicle-editor");
editor.setConfig({ type: "custom:ha-os-vehicle", entity: `sensor.${ID}_odometer` });
document.body.append(editor);
editor.hass = makeHass();

const feld = editor.shadowRoot.querySelector(".image-field");
check("Bildfeld vorhanden", Boolean(feld));
check("Beschriftung nennt das Bild", feld?.querySelector(".image-label")?.textContent.includes("Bild"),
  feld?.querySelector(".image-label")?.textContent || "");
check("Pfadeingabe als Rueckfallebene", Boolean(feld?.querySelector("input.path")));
// Der Knopf darf an keinem Element von Home Assistant haengen. In 0.10.1 bis
// 0.10.3 fehlte er, weil er ha-selector brauchte - das blieb im Kartendialog
// leer. Hier ist bewusst kein einziges ha-* Element im Spiel.
check("Knopf zum Hochladen vorhanden", feld?.querySelector("button.upload")?.textContent === "Bild hochladen",
  feld?.querySelector("button.upload")?.textContent || "keiner");
check("Dateiauswahl vorhanden", feld?.querySelector("input.file")?.type === "file");
check("Vorschau vorhanden", Boolean(feld?.querySelector(".preview")));
check("haengt an keinem ha-Element", !feld?.querySelector("ha-selector, ha-picture-upload"));
check("Bild steht NICHT im Formularschema",
  !editor.shadowRoot.querySelector("ha-form")?.schema?.some((f) => f.name === "image"));

let gemeldet = null;
editor.addEventListener("config-changed", (event) => { gemeldet = event.detail.config; });
const pfad = feld.querySelector("input.path");
pfad.value = "/local/auto.png";
pfad.dispatchEvent(new dom.window.Event("change"));
check("Pfad wird uebernommen", gemeldet?.image === "/local/auto.png", JSON.stringify(gemeldet));

pfad.value = "";
pfad.dispatchEvent(new dom.window.Event("change"));
check("leerer Pfad entfernt den Schluessel", gemeldet && !("image" in gemeldet), JSON.stringify(gemeldet));

console.log("\n14. Upload gegen HAs Bildablage");
const editor2 = document.createElement("ha-os-vehicle-editor");
editor2.setConfig({ type: "custom:ha-os-vehicle", entity: `sensor.${ID}_odometer` });
document.body.append(editor2);
editor2.hass = { ...makeHass(), auth: { data: { access_token: "TOKEN123" } } };

let anfrage = null;
globalThis.fetch = async (url, options) => {
  anfrage = { url, options };
  return { ok: true, status: 200, json: async () => ({ id: "abc123" }) };
};
globalThis.FormData = dom.window.FormData;
globalThis.File = dom.window.File;

let neu = null;
editor2.addEventListener("config-changed", (event) => { neu = event.detail.config; });

const upload = await editor2._upload(new dom.window.File(["x"], "auto.png", { type: "image/png" }));
check("richtige Adresse", anfrage?.url === "/api/image/upload", anfrage?.url || "keine Anfrage");
check("Methode POST", anfrage?.options?.method === "POST", anfrage?.options?.method || "");
check("Token wird mitgeschickt", anfrage?.options?.headers?.Authorization === "Bearer TOKEN123",
  anfrage?.options?.headers?.Authorization || "keiner");
check("liefert die Serve-Adresse", upload === "/api/image/serve/abc123/original", upload);

globalThis.fetch = async () => ({ ok: false, status: 401, statusText: "Unauthorized" });
let fehler = "";
try { await editor2._upload(new dom.window.File(["x"], "auto.png", { type: "image/png" })); }
catch (error) { fehler = error.message; }
check("Fehler wird durchgereicht statt verschluckt", fehler === "401 Unauthorized", fehler);

const ohneToken = document.createElement("ha-os-vehicle-editor");
ohneToken.setConfig({ type: "custom:ha-os-vehicle", entity: `sensor.${ID}_odometer` });
document.body.append(ohneToken);
ohneToken.hass = makeHass();
let tokenFehler = "";
try { await ohneToken._upload(new dom.window.File(["x"], "a.png", { type: "image/png" })); }
catch (error) { tokenFehler = error.message; }
check("ohne Token klare Meldung", tokenFehler.includes("Zugangstoken"), tokenFehler);

console.log("\n15. Bild landet in der Karte");
const mitBild = build({ image: "/local/auto.png" });
const bild = sr(mitBild).querySelector(".hero-image img");
check("Bild wird angezeigt", bild?.getAttribute("src") === "/local/auto.png", bild?.getAttribute("src") || "kein img");
check("ohne Bild steht ein Symbol", !sr(karte).querySelector(".hero-image img"));

console.log(failures === 0 ? "\nAlle Prüfungen bestanden.\n" : `\n${failures} Prüfung(en) fehlgeschlagen.\n`);
process.exit(failures === 0 ? 0 : 1);
