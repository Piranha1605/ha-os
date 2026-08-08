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
  // Programme = HAs eigene Seitenleisteneinträge
  panels: {
    esphome: { url_path: "esphome", title: "ESPHome Builder", icon: "mdi:chip" },
    terminal: { url_path: "terminal", title: "Terminal", icon: "mdi:console" },
    hacs: { url_path: "hacs", title: "HACS", icon: "mdi:store" },
  },
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
        {
          cards: [
            { type: "custom:ha-os-card", card_type: "thermostat", entity: "climate.thermostat", haos_weight: 3 },
            // Zweite Karte im selben Raster: nur damit lässt sich prüfen, ob
            // die nummerierten Reiter tatsächlich umschalten.
            { type: "custom:ha-os-card", card_type: "clock", haos_weight: 1 },
          ],
        },
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
check("Kinderkarten eingehängt", root.querySelectorAll(".slot").length === 4);

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
check("Kinderkarten wurden erzeugt", cardsBefore.length === 4);

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

// Ohne Hoehenangabe fuellt der Rahmen die Seite. Frueher stand zusaetzlich
// min-height: 60vh im Stil - eine kleinere Angabe waere davon still
// ueberstimmt worden.
const rahmen = root.querySelector('.page[data-page-id="extern"] iframe');
check("ohne Angabe keine feste Hoehe", rahmen.style.height === "", `"${rahmen.style.height}"`);
check("keine min-height mehr im Stil", !shell.shadowRoot.querySelector("style").textContent.includes("60vh"));

const mitHoehe = JSON.parse(JSON.stringify(shellConfig));
mitHoehe.pages[2].frame_height = 320;
shell.setConfig(mitHoehe);
await new Promise((resolve) => setTimeout(resolve, 20));
const fest = root.querySelector('.page[data-page-id="extern"] iframe')
  || shell.shadowRoot.querySelector('.page[data-page-id="extern"] iframe');
check("eingestellte Hoehe wird gesetzt", fest.style.height === "320px", `"${fest.style.height}"`);
check("Seite waechst nicht mit", Boolean(fest.closest(".frame-page")?.classList.contains("fixed")));

shell.setConfig(shellConfig);
await new Promise((resolve) => setTimeout(resolve, 20));

// ---------------------------------------------------------------- Einstellungen

console.log("\n6. Interne Einstellungsseite");

const settingsButton = [...root.querySelectorAll(".side-bottom .icon-button")][0];
settingsButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await new Promise((resolve) => setTimeout(resolve, 30));

check("Einstellungsseite geöffnet", Boolean(root.querySelector(".settings")));
check("keine Popup-Dialoge", document.querySelectorAll("dialog").length === 0);
check("Regler vorhanden", root.querySelectorAll('.control input[type="range"]').length > 5);
check("Farbwähler vorhanden", root.querySelectorAll('.control input[type="color"]').length >= 5);

// Die Bildauswahl hing frueher an `ha-selector`. War das Element beim Bauen
// der Seite noch nicht geladen - reine Zeitfrage -, fehlte sie ganz, ohne
// jede Meldung. Deshalb wird hier ausdruecklich geprueft, dass sie da ist
// und an keinem nachgeladenen Element haengt.
check("zwei Bildauswahlen (Hell und Dunkel)", root.querySelectorAll(".haos-image").length === 2,
  `${root.querySelectorAll(".haos-image").length} gefunden`);
check("je ein Knopf zum Hochladen",
  [...root.querySelectorAll(".haos-image")].every((f) => f.querySelector("button.haos-image-btn")));
check("je eine Pfadeingabe",
  [...root.querySelectorAll(".haos-image")].every((f) => f.querySelector("input.path")));
check("haengt an keinem ha-Element", !root.querySelector(".haos-image ha-selector"));

const bildPfad = root.querySelector(".haos-image input.path");
bildPfad.value = "/local/wallpaper/test.jpg";
bildPfad.dispatchEvent(new window.Event("change", { bubbles: true }));
check("Pfad landet im Theme",
  Object.values(window.HaOsTheme.get()).includes("/local/wallpaper/test.jpg"),
  JSON.stringify(window.HaOsTheme.get()).slice(0, 120));
check("Vorschau zeigt das Bild",
  root.querySelector(".haos-image-preview img")?.getAttribute("src") === "/local/wallpaper/test.jpg",
  root.querySelector(".haos-image-preview img")?.getAttribute("src") || "kein Bild");

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

// Hintergrundbild, getrennt fuer Hell und Dunkel.
const cssVar = (name) => document.documentElement.style.getPropertyValue(name);
check("Bildschicht vorhanden", Boolean(root.querySelector(".wallpaper")));
check("Pfadfeld fuer eigene Bilder vorhanden",
  root.querySelectorAll(".control.stacked input.path").length === 2,
  `${root.querySelectorAll(".control.stacked input.path").length}`);

window.HaOsTheme.save({ mode: "dark", backgroundDark: "/local/wallpaper/nacht.jpg", backgroundDim: 30 });
check("dunkles Bild wird gesetzt", cssVar("--haos-background-image").includes("nacht.jpg"),
  cssVar("--haos-background-image"));
check("Abdunkeln wird gesetzt", cssVar("--haos-background-dim") === "0.3", cssVar("--haos-background-dim"));

window.HaOsTheme.save({ backgroundLight: "/local/wallpaper/tag.jpg", mode: "light" });
check("Hell nutzt sein eigenes Bild", cssVar("--haos-background-image").includes("tag.jpg"),
  cssVar("--haos-background-image"));

// Fremde Adressen bleiben draussen – sonst baute das Dashboard bei jedem
// Laden eine Verbindung nach aussen auf.
window.HaOsTheme.save({ backgroundLight: "https://example.com/bild.jpg" });
check("fremde Adresse wird verworfen", cssVar("--haos-background-image") === "none",
  cssVar("--haos-background-image"));

window.HaOsTheme.save({ mode: "dark", backgroundDark: "", backgroundLight: "", backgroundDim: 0 });
check("ohne Bild bleibt die Schicht leer", cssVar("--haos-background-image") === "none");

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
// Verschachtelte Aufklapp-Struktur: Seite -> Raster -> Karte.
// Es genuegt NICHT zu pruefen, dass die Bloecke da sind – beim ersten Versuch
// riefen die Kartenreiter eine Methode auf, die es gar nicht gibt. Sie waren
// sichtbar und taten nichts. Deshalb wird hier durchgeklickt.
const oeffne = (text) => {
  const treffer = [...shellEditor.shadowRoot.querySelectorAll(".block > header")].find((h) =>
    h.querySelector(".label")?.textContent.includes(text)
  );
  treffer?.click();
  return Boolean(treffer);
};
// Bewusst ueber das erste Kind statt eines Selektors: ".block.is-open .label"
// wuerde auch die Beschriftungen der verschachtelten Bloecke INNERHALB eines
// offenen Blocks mitliefern.
const kopfText = (block, sel) => block.firstElementChild?.querySelector(sel)?.textContent;
const offeneBloecke = () =>
  [...shellEditor.shadowRoot.querySelectorAll(".block.is-open")].map((b) => kopfText(b, ".label"));

const reiter = [...shellEditor.shadowRoot.querySelectorAll(".tab")];
check("drei Reiter heissen Aussehen, Leisten, Seiten",
  reiter.map((t) => t.textContent).join("|") === "Aussehen|Leisten|Seiten",
  reiter.map((t) => t.textContent).join("|"));

reiter.find((t) => t.textContent === "Seiten").click();

check("Seite laesst sich aufklappen", oeffne("Wohnzimmer") && offeneBloecke().includes("Wohnzimmer"));
check("aufgeklappte Seite zeigt Raster 1", Boolean(
  [...shellEditor.shadowRoot.querySelectorAll(".label")].find((l) => l.textContent === "Raster 1")
));

check("Raster laesst sich aufklappen", oeffne("Raster 1") && offeneBloecke().includes("Raster 1"));
check("Seite bleibt dabei offen", offeneBloecke().includes("Wohnzimmer"));

const kartenBloecke = [...shellEditor.shadowRoot.querySelectorAll(".label")].filter((l) =>
  l.textContent.startsWith("Karte ")
);
check("Raster zeigt seine Karten", kartenBloecke.length === 2, `${kartenBloecke.length}`);

check("Karte laesst sich aufklappen", oeffne("Karte 1"));
const kartePfad = [...shellEditor.shadowRoot.querySelectorAll(".block.is-open")].map((b) =>
  kopfText(b, ".sub")
);
check("Pfadzeile nennt Seite, Raster und Karte",
  kartePfad.some((t) => t?.includes("Wohnzimmer") && t.includes("Raster 1") && t.includes("Karte 1")),
  kartePfad.join(" | "));

// Zweite Karte oeffnen – die erste muss zuklappen, die Ebenen darueber nicht.
oeffne("Karte 2");
const nachWechsel = offeneBloecke();
check("nur eine Karte gleichzeitig offen",
  nachWechsel.filter((t) => t.startsWith("Karte ")).length === 1, nachWechsel.join(" | "));
check("Raster und Seite bleiben offen",
  nachWechsel.includes("Raster 1") && nachWechsel.includes("Wohnzimmer"), nachWechsel.join(" | "));

// Raster 2 oeffnen – die Karte darunter muss mit zuklappen.
oeffne("Raster 2");
const nachRasterwechsel = offeneBloecke();
check("Rasterwechsel schliesst die offene Karte",
  !nachRasterwechsel.some((t) => t.startsWith("Karte ")), nachRasterwechsel.join(" | "));

const knoepfe = [...shellEditor.shadowRoot.querySelectorAll(".add")].map((b) => b.textContent);
check("drei Knoepfe zum Hinzufuegen im Raster",
  ["HA-OS Karte", "2×2", "Andere Karte"].every((t) => knoepfe.some((k) => k.includes(t))),
  knoepfe.join(" | "));

reiter[0].click();
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
