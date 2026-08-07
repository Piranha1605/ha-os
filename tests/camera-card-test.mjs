/**
 * Prüft die Kamerakarte.
 *
 * Zwei Punkte sind heikel und deshalb einzeln abgesichert:
 *
 * 1. **Standbild ohne Zeitstempel steht still.** Der Browser liefert dann das
 *    zwischengespeicherte Bild aus, und die Kamera scheint eingefroren.
 * 2. **Ein Livebild auf einer verlassenen Seite läuft weiter.** Die Shell
 *    blendet Seiten nur mit `display: none` aus, die Karten bleiben am Leben.
 *    Ohne das Kappen der Verbindung überträgt MJPEG endlos.
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

// jsdom kennt IntersectionObserver nicht. Die Karte muss auch ohne bauen –
// das wird unten geprüft. Für den Sichtbarkeitstest wird er nachgereicht.
let observers = [];
class FakeIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    observers.push(this);
  }
  observe() {}
  disconnect() {
    observers = observers.filter((o) => o !== this);
  }
  fire(isIntersecting) {
    this.callback([{ isIntersecting }]);
  }
}

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

const PICTURE = "/api/camera_proxy/camera.haustuer?token=abc123";
const state = (id, value, attributes = {}) => ({ entity_id: id, state: value, attributes });

const makeHass = () => ({
  states: {
    "camera.haustuer": state("camera.haustuer", "idle", {
      friendly_name: "Haustür",
      entity_picture: PICTURE,
    }),
    "camera.tot": state("camera.tot", "unavailable", { friendly_name: "Garage" }),
  },
  callService: () => Promise.resolve(),
  formatEntityState: (s) => s.state,
  connection: { subscribeMessage: () => Promise.reject(new Error("nicht unterstützt")) },
});

const build = (config) => {
  const card = document.createElement("ha-os-card");
  card.setConfig({ type: "custom:ha-os-card", card_type: "camera", ...config });
  document.body.append(card);
  card.hass = makeHass();
  return card;
};

const img = (card) => card.shadowRoot.querySelector(".camera-image");
const note = (card) => card.shadowRoot.querySelector(".camera-note");

console.log("\n1. Ohne IntersectionObserver baut die Karte trotzdem");
check("kein IntersectionObserver vorhanden", typeof globalThis.IntersectionObserver !== "function");
const einfach = build({ entity: "camera.haustuer" });
check("Karte gebaut", Boolean(img(einfach)));
check("Bild wird angezeigt", !img(einfach).hidden);

console.log("\n2. Standbild");
const still = build({ entity: "camera.haustuer", refresh_interval: 5 });
const ersteQuelle = img(still).getAttribute("src");
check("nutzt camera_proxy", ersteQuelle.startsWith("/api/camera_proxy/"), ersteQuelle);
check("kein Stream-Endpunkt", !ersteQuelle.includes("camera_proxy_stream"), ersteQuelle);
check("Zeitstempel gegen den Browsercache", /[?&]_=\d+/.test(ersteQuelle), ersteQuelle);
check("Token bleibt erhalten", ersteQuelle.includes("token=abc123"), ersteQuelle);

await new Promise((resolve) => setTimeout(resolve, 20));
still.hass = makeHass();
const zweiteQuelle = img(still).getAttribute("src");
check("neue Anfrage bekommt einen neuen Zeitstempel", zweiteQuelle !== ersteQuelle, `${ersteQuelle} → ${zweiteQuelle}`);
check("Beschriftung nennt die Kamera", still.shadowRoot.querySelector(".camera-label").textContent.includes("Haustür"));

console.log("\n3. Livebild");
const live = build({ entity: "camera.haustuer", camera_mode: "live" });
const liveQuelle = img(live).getAttribute("src");
check("nutzt camera_proxy_stream", liveQuelle.startsWith("/api/camera_proxy_stream/"), liveQuelle);
check("kein Zeitstempel nötig", !/[?&]_=\d+/.test(liveQuelle), liveQuelle);
check("Token bleibt erhalten", liveQuelle.includes("token=abc123"), liveQuelle);
check("roter Punkt sichtbar", !live.shadowRoot.querySelector(".camera-live").hidden);
check("Standbild zeigt keinen roten Punkt", still.shadowRoot.querySelector(".camera-live").hidden);

console.log("\n4. Wechsel der Bildart ohne Neuaufbau");
const vorher = img(live);
live.setConfig({ type: "custom:ha-os-card", card_type: "camera", entity: "camera.haustuer", camera_mode: "still" });
check("dasselbe Bildelement", img(live) === vorher);
check("Quelle auf Standbild umgestellt", img(live).getAttribute("src").startsWith("/api/camera_proxy/"),
  img(live).getAttribute("src"));

console.log("\n5. Nicht erreichbare Kamera");
const tot = build({ entity: "camera.tot" });
check("Hinweis statt Bild", !note(tot).hidden && img(tot).hidden);
check("Hinweis benennt das Problem", note(tot).textContent.includes("nicht erreichbar"), note(tot).textContent);
check("keine Bildanfrage", !img(tot).getAttribute("src"), img(tot).getAttribute("src") || "");

console.log("\n6. Verlassene Seite kappt den Livestream");
globalThis.IntersectionObserver = FakeIntersectionObserver;
dom.window.IntersectionObserver = FakeIntersectionObserver;
observers = [];
const beobachtet = build({ entity: "camera.haustuer", camera_mode: "live" });
check("Karte wird beobachtet", observers.length === 1, `${observers.length} Beobachter`);
check("Stream läuft", img(beobachtet).getAttribute("src")?.includes("camera_proxy_stream"));

observers[0].fire(false);
check("unsichtbar: Verbindung gekappt", !img(beobachtet).getAttribute("src"),
  img(beobachtet).getAttribute("src") || "");

observers[0].fire(true);
check("wieder sichtbar: Stream läuft erneut", img(beobachtet).getAttribute("src")?.includes("camera_proxy_stream"),
  img(beobachtet).getAttribute("src") || "");

beobachtet.remove();
check("aus dem DOM entfernt: Verbindung gekappt", !img(beobachtet).getAttribute("src"),
  img(beobachtet).getAttribute("src") || "");

console.log(failures === 0 ? "\nAlle Prüfungen bestanden.\n" : `\n${failures} Prüfung(en) fehlgeschlagen.\n`);
process.exit(failures === 0 ? 0 : 1);
