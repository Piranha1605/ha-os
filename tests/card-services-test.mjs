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
// Nach Symbol suchen statt nach Position: die Reihenfolge aendert sich, wenn
// ein Knopf dazukommt - der Stopp-Knopf hat genau das getan.
const knopf = (symbol) =>
  knoepfe.find((b) => b.querySelector("ha-icon")?.getAttribute("icon") === symbol);
check("sechs Knoepfe angelegt", knoepfe.length === 6, `${knoepfe.length}`);
check("nur die unterstuetzten sind sichtbar",
  knoepfe.filter((b) => !b.hidden).length === 5,
  `${knoepfe.filter((b) => !b.hidden).length}`);
check("Stopp bleibt aus, weil der Player es nicht kann", knopf("mdi:stop")?.hidden === true);

calls.length = 0;
knopf("mdi:shuffle-variant").click();
check("Mischen sendet den Parameter mit",
  calls[0]?.dienst === "media_player.shuffle_set" && calls[0]?.daten.shuffle === true,
  JSON.stringify(calls[0]));

calls.length = 0;
knopf("mdi:repeat").click();
check("Wiederholen sendet den Parameter mit",
  calls[0]?.dienst === "media_player.repeat_set" && calls[0]?.daten.repeat === "all",
  JSON.stringify(calls[0]));

// Reihenfolge aus > alle > eines > aus
const hassAlle = makeHass();
hassAlle.states["media_player.voll"].attributes.repeat = "all";
media.hass = hassAlle;
calls.length = 0;
knoepfe.find((b) => b.querySelector("ha-icon")?.getAttribute("icon")?.startsWith("mdi:repeat")).click();
check("Wiederholen schaltet weiter auf eines", calls[0]?.daten.repeat === "one", JSON.stringify(calls[0]));

const hassEines = makeHass();
hassEines.states["media_player.voll"].attributes.repeat = "one";
media.hass = hassEines;
calls.length = 0;
knoepfe.find((b) => b.querySelector("ha-icon")?.getAttribute("icon")?.startsWith("mdi:repeat")).click();
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
  // Die Klasse allein genuegt nicht: die Regel dazu muss es auch geben. Sie
  // war einmal beim Umbau eines anderen Bereichs mitgeloescht worden, und
  // alle Trenner bekamen dadurch einen Rahmen.
  {
    const stil = mitText.shadowRoot.querySelector("style").textContent;
    const plainCss = stil.slice(stil.indexOf(".card.plain"), stil.indexOf("}", stil.indexOf(".card.plain")));
    check("Regel fuer plain ist vorhanden", plainCss.includes("border: 0") && plainCss.includes("background: none"),
      plainCss.trim().slice(0, 70) || "(fehlt)");
    check("Trennlinie hat einen Stil", stil.includes(".sep-line {"));
  }
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

console.log("\n9. Titelbild des Medienspielers");
{
  const bauen = (attrs) => {
    const zustaende = {
      ...makeHass().states,
      "media_player.probe": zustand("media_player.probe", "playing", {
        friendly_name: "Probe",
        media_title: "Ein Titel",
        supported_features: 1 | 16 | 32,
        ...attrs,
      }),
    };
    const karte = document.createElement("ha-os-card");
    karte.setConfig({ type: "custom:ha-os-card", card_type: "media", entity: "media_player.probe" });
    document.body.append(karte);
    karte.hass = { ...makeHass(), states: zustaende };
    return karte;
  };

  const normal = bauen({ entity_picture: "/api/media_player_proxy/x?token=t" });
  check("entity_picture wird genommen",
    normal.shadowRoot.querySelector(".media-art img")?.getAttribute("src") === "/api/media_player_proxy/x?token=t",
    normal.shadowRoot.querySelector(".media-art img")?.getAttribute("src") || "kein Bild");

  // Streamingdienste liefern haeufig nur die Originaladresse.
  const fremd = bauen({
    media_image_url: "https://i.ytimg.com/vi/abc/hqdefault.jpg",
    media_image_remotely_accessible: true,
  });
  check("erreichbare Fremdadresse wird genutzt",
    fremd.shadowRoot.querySelector(".media-art img")?.getAttribute("src")?.includes("ytimg"),
    fremd.shadowRoot.querySelector(".media-art img")?.getAttribute("src") || "kein Bild");

  const nichtErreichbar = bauen({
    media_image_url: "https://intern.example/cover.jpg",
    media_image_remotely_accessible: false,
  });
  check("nicht erreichbare Adresse wird nicht versucht",
    !nichtErreichbar.shadowRoot.querySelector(".media-art img"),
    nichtErreichbar.shadowRoot.querySelector(".media-art img")?.getAttribute("src") || "kein Bild");

  const kaputt = bauen({ entity_picture: "/api/tot.jpg" });
  const img = kaputt.shadowRoot.querySelector(".media-art img");
  img.dispatchEvent(new dom.window.Event("error"));
  check("tote Adresse faellt auf das Symbol zurueck",
    !kaputt.shadowRoot.querySelector(".media-art img") &&
      Boolean(kaputt.shadowRoot.querySelector(".media-art ha-icon")));
}

console.log("\n10. Lautstaerke, Stumm und Quelle");
{
  const bauen = (attrs) => {
    const zustaende = {
      ...makeHass().states,
      "media_player.laut": zustand("media_player.laut", "playing", {
        friendly_name: "Laut",
        media_title: "Titel",
        ...attrs,
      }),
    };
    const karte = document.createElement("ha-os-card");
    karte.setConfig({ type: "custom:ha-os-card", card_type: "media", entity: "media_player.laut" });
    document.body.append(karte);
    karte.hass = { ...makeHass(), states: zustaende };
    return karte;
  };

  const voll = bauen({
    supported_features: 1 | 4 | 8 | 2048 | 16384,
    volume_level: 0.42,
    is_volume_muted: false,
    source: "Spotify",
    source_list: ["Spotify", "Radio", "TV"],
  });
  const sr2 = voll.shadowRoot;
  check("Lautstaerkezeile sichtbar", !sr2.querySelector(".volume").hidden);
  check("Wert in Prozent", sr2.querySelector(".volume-value").textContent === "42 %",
    sr2.querySelector(".volume-value").textContent);
  check("Spur zeigt den Stand", sr2.querySelector(".volume-track span").style.width === "42%",
    sr2.querySelector(".volume-track span").style.width);
  check("Quellen uebernommen", sr2.querySelector("select.source").options.length === 3);
  check("aktuelle Quelle gewaehlt", sr2.querySelector("select.source").value === "Spotify");

  calls.length = 0;
  const regler = sr2.querySelector(".volume-track input");
  regler.value = "80";
  regler.dispatchEvent(new dom.window.Event("input"));
  check("beim Ziehen wird nichts gesendet", calls.length === 0, JSON.stringify(calls));
  regler.dispatchEvent(new dom.window.Event("change"));
  check("Loslassen setzt die Lautstaerke",
    calls[0]?.dienst === "media_player.volume_set" && calls[0]?.daten?.volume_level === 0.8,
    JSON.stringify(calls[0] || {}));

  calls.length = 0;
  sr2.querySelector(".mute").click();
  check("Stummschalten sendet den Wert mit",
    calls[0]?.dienst === "media_player.volume_mute" && calls[0]?.daten?.is_volume_muted === true,
    JSON.stringify(calls[0] || {}));

  calls.length = 0;
  const quelle = sr2.querySelector("select.source");
  quelle.value = "Radio";
  quelle.dispatchEvent(new dom.window.Event("change"));
  check("Quellenwechsel wird gesetzt",
    calls[0]?.dienst === "media_player.select_source" && calls[0]?.daten?.source === "Radio",
    JSON.stringify(calls[0] || {}));

  // Ein Player, der nichts davon kann, zeigt auch nichts davon.
  const karg = bauen({ supported_features: 1 | 16384 });
  check("ohne Unterstuetzung keine Lautstaerkezeile", karg.shadowRoot.querySelector(".volume").hidden);
  check("ohne Quellenliste keine Quellenwahl", karg.shadowRoot.querySelector("select.source").hidden);

  // Manche Integrationen melden die Liste, ohne das Feature-Bit zu setzen.
  const ohneBit = bauen({ supported_features: 1 | 16384, source_list: ["HDMI 1", "HDMI 2"], source: "HDMI 1" });
  check("Liste ohne Feature-Bit wird trotzdem angeboten",
    !ohneBit.shadowRoot.querySelector("select.source").hidden &&
      ohneBit.shadowRoot.querySelector("select.source").options.length === 2);

  const stumm = bauen({ supported_features: 1 | 4 | 8, volume_level: 0.3, is_volume_muted: true });
  check("stumm wird benannt", stumm.shadowRoot.querySelector(".volume-value").textContent === "stumm",
    stumm.shadowRoot.querySelector(".volume-value").textContent);
}

console.log("\n11. Farbschleier im Medienspieler");
{
  const bauen = (config, attrs) => {
    const zustaende = {
      ...makeHass().states,
      "media_player.glow": zustand("media_player.glow", "playing", {
        friendly_name: "Glow", media_title: "Titel", supported_features: 1 | 16384, ...attrs,
      }),
    };
    const karte = document.createElement("ha-os-card");
    karte.setConfig({ type: "custom:ha-os-card", card_type: "media", entity: "media_player.glow", ...config });
    document.body.append(karte);
    karte.hass = { ...makeHass(), states: zustaende };
    return karte;
  };

  const an = bauen({}, { entity_picture: "/api/bild.jpg" });
  check("Schleier ist standardmaessig da", !an.shadowRoot.querySelector(".media-glow").hidden);
  check("liegt hinter dem Inhalt",
    an.shadowRoot.querySelector(".media-body > .media-glow") &&
      an.shadowRoot.querySelector(".media-body > .media-stack"));

  const aus = bauen({ glow: false }, { entity_picture: "/api/bild.jpg" });
  check("abschaltbar", aus.shadowRoot.querySelector(".media-glow").hidden);

  // Ohne lesbare Farben bleibt die Akzentfarbe – die Variablen bleiben leer,
  // im CSS greift dann der Rueckfallwert.
  const ohneBild = bauen({}, {});
  const schleier = ohneBild.shadowRoot.querySelector(".media-glow");
  check("ohne Titelbild keine erfundenen Farben",
    !schleier.style.getPropertyValue("--glow-a"),
    schleier.style.getPropertyValue("--glow-a") || "(leer)");
}

console.log("\n12. Music Assistant: Springen, Stopp, Favorit");
{
  const bauen = (attrs, extra = {}) => {
    const zustaende = {
      ...makeHass().states,
      "media_player.buro": zustand("media_player.buro", "playing", {
        friendly_name: "Büro", media_title: "Titel", media_duration: 240, media_position: 30, ...attrs,
      }),
      ...extra,
    };
    const karte = document.createElement("ha-os-card");
    karte.setConfig({ type: "custom:ha-os-card", card_type: "media", entity: "media_player.buro" });
    document.body.append(karte);
    karte.hass = { ...makeHass(), states: zustaende };
    return karte;
  };

  // 8320575 sind die echten Feature-Bits von Music Assistant.
  const ma = bauen({ supported_features: 8320575 }, {
    "button.buro_aktuellen_titel_favorisieren": zustand("button.buro_aktuellen_titel_favorisieren", "unknown", {}),
  });
  const sr3 = ma.shadowRoot;

  check("Stopp-Knopf vorhanden",
    [...sr3.querySelectorAll(".media-controls button")].some((b) => !b.hidden &&
      b.querySelector("ha-icon")?.getAttribute("icon") === "mdi:stop"));

  check("Zeitleiste ist anklickbar", sr3.querySelector(".progress").classList.contains("seekable"));
  calls.length = 0;
  const leiste = sr3.querySelector(".progress");
  leiste.getBoundingClientRect = () => ({ left: 0, width: 200 });
  leiste.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, clientX: 100 }));
  check("Klick in der Mitte springt zur Haelfte",
    calls[0]?.dienst === "media_player.media_seek" && calls[0]?.daten?.seek_position === 120,
    JSON.stringify(calls[0] || {}));

  // Der Knopf wird gesucht, nicht verlangt – Music Assistant legt je Player
  // eine eigene Entitaet an.
  check("Favoriten-Knopf gefunden", !sr3.querySelector(".media-fav").hidden);
  calls.length = 0;
  sr3.querySelector(".media-fav").click();
  check("Favorit loest den Knopf aus",
    calls[0]?.dienst === "button.press" &&
      calls[0]?.daten?.entity_id === "button.buro_aktuellen_titel_favorisieren",
    JSON.stringify(calls[0] || {}));

  // Apple TV: kein Stopp, kein Springen, kein Favorit.
  // Ein Player ohne SEEK: die Leiste bleibt unbeweglich. (Apple TV taugt
  // dafuer nicht als Beispiel - der kann springen.)
  const ohneSeek = bauen({ supported_features: 1 | 16384 });
  check("ohne SEEK keine anklickbare Leiste",
    !ohneSeek.shadowRoot.querySelector(".progress").classList.contains("seekable"));
  check("ohne Knopf-Entitaet kein Herz", ohneSeek.shadowRoot.querySelector(".media-fav").hidden);
}

console.log("\n13. Kurzzeitwecker in der Uhr");
{
  const bauen = (config, timerState = null) => {
    const zustaende = { ...makeHass().states };
    if (timerState) zustaende["timer.kueche"] = timerState;
    const karte = document.createElement("ha-os-card");
    karte.setConfig({ type: "custom:ha-os-card", card_type: "clock", ...config });
    document.body.append(karte);
    karte.hass = { ...makeHass(), states: zustaende };
    return karte;
  };

  // Ohne Timer-Entitaet kein Knopf: er haette keine Wirkung.
  const ohne = bauen({});
  check("ohne Timer kein Symbol", ohne.shadowRoot.querySelector(".clock-timer-btn").hidden);

  const mit = bauen({ timer_entity: "timer.kueche" },
    zustand("timer.kueche", "idle", { duration: "0:00:00" }));
  const sr4 = mit.shadowRoot;
  check("Symbol erscheint", !sr4.querySelector(".clock-timer-btn").hidden);
  check("Fenster ist zu", !sr4.querySelector(".sheet").open);

  sr4.querySelector(".clock-timer-btn").click();
  check("Symbol oeffnet das Fenster", !sr4.querySelector(".sheet").hidden);
  check("Drehregler vorhanden", Boolean(sr4.querySelector(".timer-dial")));
  check("Vorgabe fuenf Minuten", sr4.querySelector(".timer-dial .dial-temp").textContent === "5",
    sr4.querySelector(".timer-dial .dial-temp").textContent);

  // Der Bogen beginnt unten links und laeuft ueber 270 Grad: rechts vom
  // Mittelpunkt liegen 50 Minuten.
  const regler = sr4.querySelector(".timer-dial");
  regler.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 });
  regler.dispatchEvent(new dom.window.PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 50 }));
  check("Ziehen setzt die Minuten", sr4.querySelector(".timer-dial .dial-temp").textContent === "50",
    sr4.querySelector(".timer-dial .dial-temp").textContent);

  regler.dispatchEvent(new dom.window.PointerEvent("pointermove", { bubbles: true, clientX: 50, clientY: 0 }));
  check("oben sind es 30 Minuten", sr4.querySelector(".timer-dial .dial-temp").textContent === "30",
    sr4.querySelector(".timer-dial .dial-temp").textContent);
  regler.dispatchEvent(new dom.window.PointerEvent("pointermove", { bubbles: true, clientX: 10, clientY: 90 }));
  check("unten links ist der Anfang", sr4.querySelector(".timer-dial .dial-temp").textContent === "0",
    sr4.querySelector(".timer-dial .dial-temp").textContent);
  regler.dispatchEvent(new dom.window.PointerEvent("pointermove", { bubbles: true, clientX: 100, clientY: 50 }));

  calls.length = 0;
  sr4.querySelector(".sheet-btn.primary").click();
  check("Starten schickt die Dauer",
    calls[0]?.dienst === "timer.start" && calls[0]?.daten?.duration === "00:50:00",
    JSON.stringify(calls[0] || {}));
  check("Fenster schliesst nach dem Start", !sr4.querySelector(".sheet").open);

  // Laeuft er, steht die Restzeit in der Karte und Abbrechen ist moeglich.
  const laeuft = bauen({ timer_entity: "timer.kueche" },
    zustand("timer.kueche", "active", { finishes_at: new Date(Date.now() + 12 * 60000).toISOString() }));
  // Sekundengenau, und die Karte zaehlt selbst herunter: Home Assistant
  // meldet beim Timer nur Start und Ende.
  check("Restzeit sekundengenau",
    /^Wecker 1[12]:\d\d$/.test(laeuft.shadowRoot.querySelector(".clock-timer").textContent),
    laeuft.shadowRoot.querySelector(".clock-timer").textContent);

  const gleich = bauen({ timer_entity: "timer.kueche" },
    zustand("timer.kueche", "active", { finishes_at: new Date(Date.now() + 40000).toISOString() }));
  check("letzte Minute faellt auf",
    gleich.shadowRoot.querySelector(".clock-timer").classList.contains("is-soon"),
    gleich.shadowRoot.querySelector(".clock-timer").textContent);

  // Ring: voll bei Start, leer am Ende.
  const halb = bauen({ timer_entity: "timer.kueche" },
    zustand("timer.kueche", "active", {
      duration: "0:10:00",
      finishes_at: new Date(Date.now() + 5 * 60000).toISOString(),
    }));
  const ring = halb.shadowRoot.querySelector(".ring-value");
  const laenge = Number(ring.getAttribute("stroke-dasharray"));
  const offen = Number(ring.getAttribute("stroke-dashoffset"));
  check("Ring steht bei der Haelfte", Math.abs(offen / laenge - 0.5) < 0.02,
    `${(offen / laenge).toFixed(2)}`);

  const fast = bauen({ timer_entity: "timer.kueche" },
    zustand("timer.kueche", "active", {
      duration: "0:10:00",
      finishes_at: new Date(Date.now() + 30000).toISOString(),
    }));
  const ring2 = fast.shadowRoot.querySelector(".ring-value");
  check("kurz vor Schluss ist der Ring fast leer",
    Number(ring2.getAttribute("stroke-dashoffset")) / Number(ring2.getAttribute("stroke-dasharray")) > 0.9);

  // Ton beim Ablaufen: nur beim Uebergang von laufend auf fertig.
  {
    const gespielt = [];
    const echtesAudio = dom.window.Audio;
    globalThis.Audio = class {
      constructor(url) { this.src = url; this.volume = 1; gespielt.push(url); }
      play() { return Promise.resolve(); }
    };

    const karte = document.createElement("ha-os-card");
    karte.setConfig({
      type: "custom:ha-os-card", card_type: "clock",
      timer_entity: "timer.kueche", sound: "/local/gong.mp3", sound_volume: 50,
    });
    document.body.append(karte);

    const mitTimer = (zustandName, attrs = {}) => ({
      ...makeHass(),
      states: { ...makeHass().states, "timer.kueche": zustand("timer.kueche", zustandName, attrs) },
    });

    karte.hass = mitTimer("active", { duration: "0:05:00", finishes_at: new Date(Date.now() + 60000).toISOString() });
    check("waehrend er laeuft kein Ton", gespielt.length === 0, gespielt.join(", "));

    karte.hass = mitTimer("idle", { duration: "0:05:00" });
    check("beim Ablaufen ertoent der Ton", gespielt.length === 1 && gespielt[0] === "/local/gong.mp3",
      gespielt.join(", ") || "keiner");

    karte.hass = mitTimer("idle", { duration: "0:05:00" });
    check("und nicht noch einmal danach", gespielt.length === 1, `${gespielt.length}`);

    // Solange es klingelt, tritt der Stoppknopf an die Stelle des Weckers.
    const sr5 = karte.shadowRoot;
    check("Stoppknopf erscheint", !sr5.querySelector(".clock-timer-btn.is-ringing").hidden);
    check("Weckerknopf tritt zurueck", sr5.querySelector(".clock-timer-btn:not(.is-ringing)").hidden);
    check("Zeile meldet den Ablauf",
      sr5.querySelector(".clock-timer").textContent === "Wecker abgelaufen",
      sr5.querySelector(".clock-timer").textContent);

    sr5.querySelector(".clock-timer-btn.is-ringing").click();
    check("Stoppknopf beendet das Klingeln", sr5.querySelector(".clock-timer-btn.is-ringing").hidden);
    check("Weckerknopf ist wieder da", !sr5.querySelector(".clock-timer-btn:not(.is-ringing)").hidden);

    globalThis.Audio = echtesAudio;
  }

  // Mit Lautsprecher: der Knopf stoppt auch die Automation - und erscheint
  // selbst dann, wenn die Karte gar keine eigene Tondatei hat.
  {
    const karte = document.createElement("ha-os-card");
    karte.setConfig({
      type: "custom:ha-os-card", card_type: "clock",
      timer_entity: "timer.kueche", sound_player: "media_player.buro",
    });
    document.body.append(karte);
    const mitTimer = (zustandName) => ({
      ...makeHass(),
      states: { ...makeHass().states, "timer.kueche": zustand("timer.kueche", zustandName, { duration: "0:05:00" }) },
    });

    karte.hass = mitTimer("active");
    karte.hass = mitTimer("idle");
    const sr6 = karte.shadowRoot;
    check("Knopf auch ohne eigene Tondatei", !sr6.querySelector(".clock-timer-btn.is-ringing").hidden);

    calls.length = 0;
    sr6.querySelector(".clock-timer-btn.is-ringing").click();
    check("stoppt den Lautsprecher",
      calls[0]?.dienst === "media_player.media_stop" && calls[0]?.daten?.entity_id === "media_player.buro",
      JSON.stringify(calls[0] || {}));
  }

  const angehalten = bauen({ timer_entity: "timer.kueche" },
    zustand("timer.kueche", "paused", { remaining: "0:07:30" }));
  check("angehalten zeigt den Rest",
    angehalten.shadowRoot.querySelector(".clock-timer").textContent === "Wecker angehalten · 7:30",
    angehalten.shadowRoot.querySelector(".clock-timer").textContent);
  calls.length = 0;
  laeuft.shadowRoot.querySelector(".clock-timer-btn").click();
  laeuft.shadowRoot.querySelector(".sheet-btn.danger").click();
  check("Abbrechen stoppt den Wecker", calls[0]?.dienst === "timer.cancel", JSON.stringify(calls[0] || {}));

  // Ein echtes Fenster: <dialog> in der Top Layer, nicht eine Schicht in der
  // Karte. Nur so entkommt es overflow, Stapelkontext und backdrop-filter.
  check("ist ein echtes Dialogfenster", sr4.querySelector(".sheet")?.tagName === "DIALOG",
    sr4.querySelector(".sheet")?.tagName);
  const stil = mit.shadowRoot.querySelector("style").textContent;
  const sheetCss = stil.slice(stil.indexOf("  .sheet {"), stil.indexOf("}", stil.indexOf("  .sheet {")));
  check("Fenster ist deckend", sheetCss.includes("--haos-scrim"), sheetCss.trim().slice(0, 90));
  check("eigener Hintergrund ueber der Seite", stil.includes(".sheet::backdrop"));

  // Klick daneben schliesst.
  sr4.querySelector(".clock-timer-btn").click();
  sr4.querySelector(".sheet").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  check("Klick auf den Hintergrund schliesst", !sr4.querySelector(".sheet").open);
}

console.log("\n14. Energieliste und Summen-Badge");
{
  const energieZustaende = {
    "sensor.a_energy_today": zustand("sensor.a_energy_today", "12.5", { device_class: "energy", friendly_name: "Aquarium" }),
    "sensor.b_energy_today": zustand("sensor.b_energy_today", "3.2", { device_class: "energy", friendly_name: "Pumpe" }),
    "sensor.c_energy_today": zustand("sensor.c_energy_today", "40", { device_class: "energy", friendly_name: "Ladestation" }),
    // Gesamtwert desselben Geraets - darf die Tagessumme nicht verfaelschen.
    "sensor.a_energy_total": zustand("sensor.a_energy_total", "980", { device_class: "energy", friendly_name: "Aquarium gesamt" }),
    // Ohne Messwert: wird uebergangen, nicht als 0 gewertet.
    "sensor.d_energy_today": zustand("sensor.d_energy_today", "unavailable", { device_class: "energy", friendly_name: "Tot" }),
    "sensor.kein_energie": zustand("sensor.kein_energie", "7", { friendly_name: "Temperatur", unit_of_measurement: "°C" }),
    // Ohne device_class, aber mit kWh: manche Integrationen liefern nur die
    // Einheit. Wer nur die Klasse prueft, uebersieht diese Zaehler.
    "sensor.e_energy_today": zustand("sensor.e_energy_today", "5", { unit_of_measurement: "kWh", friendly_name: "Ohne Klasse" }),
  };

  const karte = document.createElement("ha-os-card");
  karte.setConfig({ type: "custom:ha-os-card", card_type: "energy_list", suffix: "_energy_today" });
  document.body.append(karte);
  karte.hass = { ...makeHass(), states: energieZustaende };

  const zeilen = [...karte.shadowRoot.querySelectorAll(".energy-row")];
  check("auch Zaehler ohne Geraeteklasse", zeilen.length === 4, `${zeilen.length}`);
  check("nach Verbrauch sortiert",
    zeilen.map((z) => z.querySelector(".energy-name").textContent).join(" | ") === "Ladestation | Aquarium | Ohne Klasse | Pumpe",
    zeilen.map((z) => z.querySelector(".energy-name").textContent).join(" | "));
  check("groesster Balken voll", zeilen[0].querySelector(".energy-bar span").style.width === "100%",
    zeilen[0].querySelector(".energy-bar span").style.width);
  check("Summe stimmt",
    karte.shadowRoot.querySelector(".energy-total").textContent === "Summe 60,7 kWh",
    karte.shadowRoot.querySelector(".energy-total").textContent);

  // Shelly benennt auf Deutsch, Tasmota auf Englisch. Mehrere Endungen,
  // durch Komma getrennt - und die Einspeisung bleibt bewusst draussen.
  {
    const gemischt = {
      "sensor.tasmota_energy_today": zustand("sensor.tasmota_energy_today", "4", { device_class: "energy", friendly_name: "Steckdose" }),
      "sensor.shelly_energieverbrauch": zustand("sensor.shelly_energieverbrauch", "9", { device_class: "energy", friendly_name: "Shelly" }),
      "sensor.shelly_energieeinspeisung": zustand("sensor.shelly_energieeinspeisung", "300", { device_class: "energy", friendly_name: "Einspeisung" }),
    };
    const k = document.createElement("ha-os-card");
    k.setConfig({
      type: "custom:ha-os-card", card_type: "energy_list",
      suffix: "_energy_today, _energieverbrauch",
    });
    document.body.append(k);
    k.hass = { ...makeHass(), states: gemischt };

    const namen = [...k.shadowRoot.querySelectorAll(".energy-name")].map((n) => n.textContent);
    check("beide Schreibweisen werden gefunden", namen.join(" | ") === "Shelly | Steckdose", namen.join(" | "));
    check("Einspeisung bleibt draussen", !namen.includes("Einspeisung"), namen.join(" | "));
    check("Summe ohne Einspeisung",
      k.shadowRoot.querySelector(".energy-total").textContent === "Summe 13,0 kWh",
      k.shadowRoot.querySelector(".energy-total").textContent);
  }

  const gekuerzt = document.createElement("ha-os-card");
  gekuerzt.setConfig({ type: "custom:ha-os-card", card_type: "energy_list", suffix: "_energy_today", max_rows: 2 });
  document.body.append(gekuerzt);
  gekuerzt.hass = { ...makeHass(), states: energieZustaende };
  check("Begrenzung wirkt", gekuerzt.shadowRoot.querySelectorAll(".energy-row").length === 2);
  check("der Rest wird genannt",
    gekuerzt.shadowRoot.querySelector(".energy-total").textContent.includes("2 weitere"),
    gekuerzt.shadowRoot.querySelector(".energy-total").textContent);
}

console.log(failures === 0 ? "\nAlle Prüfungen bestanden.\n" : `\n${failures} Prüfung(en) fehlgeschlagen.\n`);
process.exit(failures === 0 ? 0 : 1);
