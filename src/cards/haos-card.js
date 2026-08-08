/**
 * HA-OS – generische Karte (Bubble-Card-Prinzip)
 *
 * EINE Karte für alle Darstellungen. Der Typ wird oben im Editor gewählt,
 * darunter erscheinen nur die Felder des gewählten Typs.
 *
 * Aufbaulogik: jeder Renderer hat `build()` (einmalig, erzeugt DOM) und
 * `update()` (bei jeder hass-Änderung, ändert nur Text/Klassen/Styles).
 * Kein Renderer darf im Update-Pfad innerHTML setzen.
 */

import {
  ENTITY_SURFACE_CSS,
  clampNumber,
  domainIcon,
  domainOf,
  flattenLegacyGroups,
  formatState,
  friendlyName,
  handleAction,
  isActive,
  isUnavailable,
  registerCard,
  showMoreInfo,
  statusClass,
  CONTROL_SURFACE_CSS,
  SEGMENTED_CSS,
  createSegmented,
  nextFrame,
} from "../shared/utils.js";

const TAG = "ha-os-card";
const EDITOR_TAG = "ha-os-card-editor";

export const CARD_TYPES = [
  { value: "button", label: "Button / Kachel", icon: "mdi:gesture-tap-button" },
  { value: "slider", label: "Slider", icon: "mdi:tune-vertical" },
  { value: "thermostat", label: "Thermostat", icon: "mdi:thermostat" },
  { value: "weather", label: "Wetter", icon: "mdi:weather-partly-cloudy" },
  { value: "energy", label: "Energie", icon: "mdi:lightning-bolt" },
  { value: "media", label: "Media Player", icon: "mdi:speaker" },
  { value: "members", label: "Mitglieder", icon: "mdi:account-group" },
  { value: "calendar", label: "Kalender", icon: "mdi:calendar" },
  { value: "select", label: "Auswahl", icon: "mdi:form-dropdown" },
  { value: "clock", label: "Uhr", icon: "mdi:clock-outline" },
  { value: "camera", label: "Kamera", icon: "mdi:cctv" },
  { value: "separator", label: "Trenner", icon: "mdi:format-horizontal-align-center" },
];

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const icon = (name) => {
  const node = document.createElement("ha-icon");
  node.setAttribute("icon", name);
  return node;
};

const STYLES = `
  :host { display: block; height: 100%; }
  * { box-sizing: border-box; }
  button { font: inherit; color: inherit; border: 0; background: none; cursor: pointer; }

  .card {
    height: 100%; padding: 16px; overflow: hidden;
    display: flex; flex-direction: column; gap: 10px;
    color: var(--haos-text, #fff);
    font-family: var(--haos-font-family);
    font-weight: var(--haos-font-weight-normal, 450);
    ${ENTITY_SURFACE_CSS}
  }
  .card.interactive { cursor: pointer; transition: transform .16s ease, box-shadow .16s ease; }
  .card.interactive:hover { transform: translateY(-1px); }

  /* Aktiv = neutraler Glasrahmen + inneres Akzentleuchten, KEIN blauer Aussenrahmen */
  .card.is-on {
    box-shadow:
      var(--haos-entity-shadow),
      var(--haos-entity-sheen),
      inset 0 0 40px color-mix(in srgb, var(--haos-accent, #0a84ff) 20%, transparent);
  }
  .card.is-unavailable { opacity: .55; }

  .row { display: flex; align-items: center; gap: 10px; }
  .spacer { flex: 1; }
  .title { font-size: 15px; font-weight: var(--haos-font-weight-semibold, 650); }
  .subtitle { font-size: 11px; color: rgba(var(--haos-text-rgb, 255,255,255), .55); }
  .muted { color: rgba(var(--haos-text-rgb, 255,255,255), .55); font-size: 11px; }

  .chip {
    width: 38px; height: 38px; flex: 0 0 38px; border-radius: 12px;
    display: grid; place-items: center;
    background: rgba(var(--haos-text-rgb, 255,255,255), .08);
  }
  .chip ha-icon { --mdc-icon-size: 20px; }
  .is-on .chip ha-icon { color: var(--haos-accent, #0a84ff); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--haos-accent, #0a84ff) 55%, transparent)); }
  .is-off .chip ha-icon { color: var(--haos-status-off, #a8b0b8); }
  .is-unavailable .chip ha-icon { color: var(--haos-status-unavailable, #ff6961); }

  /* --- Schalter --- */
  .switch {
    width: 46px; height: 27px; flex: 0 0 46px; border-radius: 999px; position: relative;
    background: rgba(var(--haos-text-rgb, 255,255,255), .18); transition: background .18s ease;
  }
  .switch::after {
    content: ""; position: absolute; top: 3px; left: 3px; width: 21px; height: 21px; border-radius: 50%;
    background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.3); transition: transform .18s ease;
  }
  .is-on .switch { background: var(--haos-accent, #0a84ff); }
  .is-on .switch::after { transform: translateX(19px); }

  /* Ohne !important gewinnen die display-Regeln der Bedienelemente. */
  [hidden] { display: none !important; }

  /* --- Taster (button, input_button, scene, script) ---
     Diese Entitäten haben keinen Zustand, den man umschalten könnte. Sie
     brauchen einen Druckknopf mit sichtbarer Rückmeldung, weil sonst nichts
     erkennen lässt, ob der Druck angekommen ist. */
  .press-btn {
    width: 46px; height: 46px; flex: 0 0 46px; border-radius: 50%;
    display: grid; place-items: center;
    transition: transform .12s ease, background .18s ease, color .18s ease;
    ${CONTROL_SURFACE_CSS}
  }
  .press-btn:hover { background: rgba(var(--haos-text-rgb, 255,255,255), .18); }
  .press-btn:active, .press-btn.is-pressed {
    transform: scale(.88);
    background: var(--haos-accent, #0a84ff);
    color: #fff;
    box-shadow: 0 0 18px color-mix(in srgb, var(--haos-accent, #0a84ff) 55%, transparent);
  }
  .press-btn ha-icon { --mdc-icon-size: 22px; }

  /* --- Rollo/Tor (cover) --- */
  .cover-ctrl { display: flex; gap: 6px; }
  .cover-ctrl button {
    width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center;
    transition: background .18s ease;
    ${CONTROL_SURFACE_CSS}
  }
  .cover-ctrl button:hover { background: rgba(var(--haos-text-rgb, 255,255,255), .18); }
  .cover-ctrl button:active { background: var(--haos-accent, #0a84ff); color: #fff; }
  .cover-ctrl ha-icon { --mdc-icon-size: 18px; }

  /* --- Slider --- */
  .slider-track { position: relative; height: 40px; border-radius: 14px; overflow: hidden; background: rgba(var(--haos-text-rgb, 255,255,255), .10); }
  .slider-fill { position: absolute; inset: 0 auto 0 0; width: 0%; background: color-mix(in srgb, var(--haos-accent, #0a84ff) 55%, transparent); transition: width .12s ease; }
  .slider-track input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: ew-resize; }
  .slider-value { position: absolute; inset: 0; display: flex; align-items: center; padding: 0 12px; font-size: 12px; font-weight: 650; pointer-events: none; }

  /* --- Thermostat --- */
  .dial-wrap { flex: 1; min-height: 0; display: grid; place-items: center; }
  .dial { position: relative; width: 100%; max-width: 220px; aspect-ratio: 1; }
  .dial svg { width: 100%; height: 100%; transform: rotate(135deg); }
  .dial .track { fill: none; stroke: rgba(var(--haos-text-rgb, 255,255,255), .14); stroke-linecap: round; }
  .dial .value { fill: none; stroke: var(--haos-accent, #0a84ff); stroke-linecap: round; transition: stroke-dashoffset .25s ease; filter: drop-shadow(0 0 6px color-mix(in srgb, var(--haos-accent, #0a84ff) 60%, transparent)); }
  .dial-center { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
  .dial-temp { font-size: 34px; font-weight: 700; letter-spacing: -.02em; }
  .dial-label { font-size: 11px; color: rgba(var(--haos-text-rgb, 255,255,255), .55); }
  .stepper { display: flex; justify-content: center; gap: 14px; }
  .stepper button { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; ${CONTROL_SURFACE_CSS} }
  .stepper button:hover { background: rgba(var(--haos-text-rgb, 255,255,255), .16); }
  .modes { display: flex; justify-content: space-around; gap: 6px; }
  .mode { display: grid; justify-items: center; gap: 5px; font-size: 10px; color: rgba(var(--haos-text-rgb, 255,255,255), .6); }
  .mode .dot { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; ${CONTROL_SURFACE_CSS} }
  .mode.active { color: var(--haos-text, #fff); }
  /* Die aktive Betriebsart bleibt kraeftig – sie soll sich von den uebrigen
     abheben, nicht mit ihnen verschwimmen. */
  .mode.active .dot {
    background: rgba(var(--haos-entity-surface-rgb, 255,255,255), calc(var(--haos-entity-opacity, .10) + .55));
    color: #18212a;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 4px 14px rgba(0,0,0,.18);
  }

  /* --- Wetter --- */
  .weather-head { display: flex; align-items: flex-start; gap: 10px; }
  .weather-now { font-size: 40px; font-weight: 300; letter-spacing: -.03em; line-height: 1; }
  .weather-now sup { font-size: 18px; vertical-align: super; }
  .weather-bottom { margin-top: auto; display: grid; gap: 2px; }

  /* Verlaufskurve: gleiche Spalteneinteilung wie die Vorhersagezeile darunter,
     damit jeder Kurvenpunkt über seinem Wert sitzt. */
  .weather-graph { height: 54px; }
  .weather-graph.is-hidden { display: none; }
  .weather-graph svg { display: block; width: 100%; height: 100%; overflow: visible; }
  .weather-graph .area { stroke: none; fill: url(#haos-weather-fade); }
  .weather-graph .line {
    fill: none; stroke: var(--haos-accent, #0a84ff); stroke-width: 2;
    stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke;
    filter: drop-shadow(0 0 5px color-mix(in srgb, var(--haos-accent, #0a84ff) 55%, transparent));
  }

  .forecast { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 4px; }
  .forecast-item { display: grid; justify-items: center; gap: 4px; font-size: 10px; color: rgba(var(--haos-text-rgb, 255,255,255), .6); }
  .forecast-item b { font-size: 13px; color: var(--haos-text, #fff); font-weight: 600; }
  .forecast-item ha-icon { --mdc-icon-size: 17px; }

  /* --- Balkendiagramm (Energie) --- */
  .bars { flex: 1; min-height: 60px; display: flex; align-items: flex-end; gap: 6px; }
  .bar-col { flex: 1; display: grid; grid-template-rows: 1fr auto; gap: 6px; height: 100%; }
  .bar { align-self: end; width: 100%; border-radius: 6px 6px 3px 3px; background: rgba(var(--haos-text-rgb, 255,255,255), .22); min-height: 3px; transition: height .3s ease; }
  .bar.peak { background: var(--haos-accent, #0a84ff); }
  .bar-label { text-align: center; font-size: 9px; color: rgba(var(--haos-text-rgb, 255,255,255), .5); }

  /* --- Media --- */
  .media-head { display: flex; gap: 12px; align-items: center; }
  .media-art { width: 52px; height: 52px; flex: 0 0 52px; border-radius: 10px; overflow: hidden; background: rgba(var(--haos-text-rgb, 255,255,255), .1); display: grid; place-items: center; }
  .media-art img { width: 100%; height: 100%; object-fit: cover; }
  .progress { height: 3px; border-radius: 2px; background: rgba(var(--haos-text-rgb, 255,255,255), .18); overflow: hidden; }
  .progress span { display: block; height: 100%; width: 0%; background: var(--haos-accent, #0a84ff); transition: width .5s linear; }
  .media-times { display: flex; justify-content: space-between; font-size: 9px; color: rgba(var(--haos-text-rgb, 255,255,255), .5); }
  .media-controls { display: flex; align-items: center; justify-content: space-between; }
  .media-controls button {
    width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center;
    color: rgba(var(--haos-text-rgb, 255,255,255), .75);
    ${CONTROL_SURFACE_CSS}
  }
  .media-controls button:hover { color: var(--haos-text, #fff); }
  /* Abspielen ist die Hauptaktion und bleibt deutlich heller als der Rest. */
  .media-controls .play {
    width: 44px; height: 44px; color: #18212a;
    background: rgba(var(--haos-entity-surface-rgb, 255,255,255), calc(var(--haos-entity-opacity, .10) + .70));
    box-shadow: inset 0 1px 0 rgba(255,255,255,.55), 0 5px 16px rgba(0,0,0,.20);
  }
  .media-controls button.is-active { color: var(--haos-accent, #0a84ff); }

  /* --- Mitglieder --- */
  .members { display: flex; align-items: center; }
  .member { width: 40px; height: 40px; margin-left: -10px; border-radius: 50%; overflow: hidden; border: 2px solid rgba(var(--haos-card-surface-rgb, 255,255,255), .35); display: grid; place-items: center; background: rgba(var(--haos-text-rgb, 255,255,255), .12); font-size: 11px; font-weight: 800; }
  .member:first-child { margin-left: 0; }
  .member img { width: 100%; height: 100%; object-fit: cover; }
  .member.is-home { border-color: color-mix(in srgb, var(--haos-status-home, #32d583) 80%, transparent); }
  .member.is-away { opacity: .7; border-color: color-mix(in srgb, var(--haos-status-away, #f7b955) 70%, transparent); }
  .member.is-unavailable { opacity: .45; filter: saturate(.3); }

  /* --- Kalender --- */
  .events { flex: 1; min-height: 0; overflow-y: auto; display: grid; align-content: start; gap: 7px; scrollbar-width: thin; }
  .event { display: grid; grid-template-columns: 42px 1fr; gap: 9px; align-items: center; }
  .event .when { font-size: 9px; text-align: center; color: rgba(var(--haos-text-rgb, 255,255,255), .55); }
  .event .when b { display: block; font-size: 14px; color: var(--haos-text, #fff); }
  .event .what { min-width: 0; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* --- Auswahl --- */
  ${SEGMENTED_CSS}
  select.dropdown { width: 100%; padding: 10px 12px; border-radius: 12px; font: inherit; color: var(--haos-text, #fff); background: rgba(var(--haos-text-rgb, 255,255,255), .09); border: 1px solid rgba(var(--haos-text-rgb, 255,255,255), .14); }
  select.dropdown option { color: #18212a; }

  /* --- Uhr --- */
  .clock { flex: 1; display: grid; place-content: center; text-align: center; }
  .clock-time { font-size: 44px; font-weight: 300; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
  .clock-date { font-size: 12px; color: rgba(var(--haos-text-rgb, 255,255,255), .55); }

  /* --- Kamera ---
     Das Bild füllt die Karte randlos. Die 16 px Polsterung der Karte werden
     über negative Ränder zurückgenommen, damit die Glaskante sauber bleibt. */
  .camera { position: relative; flex: 1; min-height: 0; margin: -16px; border-radius: inherit; overflow: hidden; background: rgba(0, 0, 0, .35); }
  .camera-image { width: 100%; height: 100%; object-fit: cover; display: block; }
  .camera-image[hidden] { display: none; }
  .camera-label {
    position: absolute; left: 0; right: 0; bottom: 0; padding: 18px 14px 10px;
    display: flex; align-items: center; gap: 7px; font-size: 13px;
    background: linear-gradient(to top, rgba(0, 0, 0, .55), transparent);
    pointer-events: none;
  }
  .camera-label[hidden] { display: none; }
  .camera-live { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; background: #ff453a; }
  .camera-note { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; gap: 6px; padding: 12px; font-size: 12px; color: rgba(var(--haos-text-rgb, 255,255,255), .6); }
  .camera-note[hidden] { display: none; }

  /* --- Trenner ---
     Bewusst ohne Glas: ein Trenner soll gliedern, nicht wie eine weitere
     Karte aussehen. Die Klasse plain nimmt der Flaeche Rahmen, Fuellung
     und Schatten. */
  .card.plain {
    border: 0; background: none; box-shadow: none; padding: 0 4px;
    backdrop-filter: none; -webkit-backdrop-filter: none;
  }
  .sep { flex: 1; display: flex; align-items: center; gap: 10px; min-width: 0; }
  .sep-text { flex: 0 0 auto; display: flex; align-items: center; gap: 7px; font-size: 13px; color: rgba(var(--haos-text-rgb, 255,255,255), .72); }
  .sep-text[hidden] { display: none; }
  .sep-text ha-icon { --mdc-icon-size: 17px; }
  .sep-line { flex: 1; height: 1px; min-width: 12px; background: rgba(var(--haos-text-rgb, 255,255,255), .18); }
  .sep-line[hidden] { display: none; }

  .error { display: grid; place-content: center; height: 100%; text-align: center; gap: 6px; font-size: 12px; color: rgba(var(--haos-text-rgb, 255,255,255), .6); }
`;

const pad = (value) => String(value).padStart(2, "0");

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${pad(total % 60)}`;
};

/**
 * Zahl aus einem Attribut lesen.
 *
 * Nicht durch Number() ersetzen: Number(null) und Number("") ergeben 0. Ein
 * fehlender Messwert würde dadurch als echte Null gezeichnet statt als "--".
 */
const numeric = (value) =>
  value === null || value === undefined || value === "" ? NaN : Number(value);

/**
 * Welche Bedienform braucht diese Entität?
 *
 * Der Auslöser für diese Unterscheidung: eine Entität der Domain `button`
 * ("Taste" in der deutschen Oberfläche) hat gar keinen Zustand, sondern nur
 * einen Zeitpunkt der letzten Betätigung. Ein Umschalter kann daran nichts
 * umschalten – die Kachel sah bedienbar aus und tat nichts.
 */
/**
 * Bits aus `supported_features`.
 *
 * Home Assistant meldet je Entitaet, was sie beherrscht. HA-OS hat das bisher
 * nirgends gelesen und deshalb Knoepfe angeboten, die ins Leere liefen.
 */
const MEDIA_FEATURE = {
  PAUSE: 1,
  VOLUME_SET: 4,
  VOLUME_MUTE: 8,
  PREVIOUS_TRACK: 16,
  NEXT_TRACK: 32,
  SELECT_SOURCE: 2048,
  PLAY: 16384,
  SHUFFLE_SET: 32768,
  REPEAT_SET: 262144,
};

const CLIMATE_FEATURE = {
  TARGET_TEMPERATURE: 1,
  TARGET_TEMPERATURE_RANGE: 2,
  PRESET_MODE: 16,
  FAN_MODE: 8,
};

/**
 * Wertebereich eines Reglers.
 *
 * Licht, Rollo, Luefter und Lautstaerke rechnen intern in Prozent. Eine
 * `number`- oder `input_number`-Entitaet dagegen hat ihren eigenen Bereich -
 * ein Sollwert von 5 bis 35 Grad etwa. Der Regler stand fest auf 0 bis 100
 * und schrieb dort schlicht falsche Werte.
 */
const sliderRange = (entityId, state) => {
  const domain = domainOf(entityId);
  if (domain === "number" || domain === "input_number") {
    const min = Number(state?.attributes?.min);
    const max = Number(state?.attributes?.max);
    const step = Number(state?.attributes?.step);
    return {
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) ? max : 100,
      step: Number.isFinite(step) && step > 0 ? step : 1,
      unit: state?.attributes?.unit_of_measurement || "",
    };
  }
  if (domain === "fan") {
    const step = Number(state?.attributes?.percentage_step);
    return { min: 0, max: 100, step: Number.isFinite(step) && step > 0 ? step : 1, unit: "%" };
  }
  return { min: 0, max: 100, step: 1, unit: "%" };
};

const PRESS_DOMAINS = new Set(["button", "input_button", "scene", "script"]);

const buttonKind = (entityId) => {
  const domain = domainOf(entityId);
  if (PRESS_DOMAINS.has(domain)) return "press";
  if (domain === "cover") return "cover";
  return "toggle";
};

/** Löst eine Taste, Szene oder ein Skript aus. */
const runPress = (ctx) => {
  const entityId = ctx.config.entity;
  if (!entityId) return;
  const domain = domainOf(entityId);
  const service = domain === "button" || domain === "input_button" ? "press" : "turn_on";
  ctx.hass?.callService(domain, service, { entity_id: entityId });

  // Sichtbare Rückmeldung, weil es keinen Zustand gibt, der sich ändern könnte.
  const node = ctx.nodes.press;
  if (!node) return;
  node.classList.add("is-pressed");
  clearTimeout(ctx.nodes.pressTimer);
  ctx.nodes.pressTimer = setTimeout(() => node.classList.remove("is-pressed"), 350);
};

/**
 * Beschriftung einer Vorhersagespalte.
 *
 * Bei Tagesvorhersagen liegen alle Einträge auf 00:00 UTC. Eine Uhrzeit
 * darunter zu schreiben ergab fünfmal denselben Wert – bei Enrico "02:00",
 * weil Mitteleuropa im Sommer zwei Stunden vorgeht. Für Tage gehört dorthin
 * der Wochentag, für Stunden die Uhrzeit.
 */
const forecastLabel = (datetime, forecastType) => {
  const when = new Date(datetime);
  if (Number.isNaN(when.getTime())) return "";

  if (forecastType === "daily" || forecastType === "twice_daily") {
    const today = new Date();
    const sameDay =
      when.getDate() === today.getDate() &&
      when.getMonth() === today.getMonth() &&
      when.getFullYear() === today.getFullYear();
    if (sameDay) return "Heute";
    try {
      return when.toLocaleDateString(undefined, { weekday: "short" });
    } catch (_error) {
      return ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][when.getDay()];
    }
  }

  return `${pad(when.getHours())}:${pad(when.getMinutes())}`;
};

/**
 * Wirft vergangene Tage aus der Vorhersage.
 *
 * Home Assistant liefert bei Tagesvorhersagen den laufenden Tag ab 00:00 UTC
 * mit. Kurz nach Mitternacht Ortszeit ist dieser Eintrag bereits gestern –
 * die Karte zeigte dann „Mi" vor „Heute". Stundenvorhersagen bleiben
 * unangetastet, dort ist die nächste volle Stunde erwünscht.
 */
const dropPastDays = (forecast, forecastType) => {
  if (forecastType !== "daily" && forecastType !== "twice_daily") return forecast;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const future = forecast.filter((entry) => {
    const when = new Date(entry?.datetime);
    return Number.isNaN(when.getTime()) || when.getTime() >= startOfToday.getTime();
  });

  // Lieber eine veraltete Spalte als eine leere Karte.
  return future.length ? future : forecast;
};

/**
 * Zeichnet die Temperaturkurve der Wetterkarte.
 *
 * Erzeugt bewusst KEIN DOM: die beiden Pfade stehen bereits, hier ändert sich
 * nur ihr d-Attribut. Die x-Positionen entsprechen den Spaltenmitten der
 * Vorhersagezeile darunter, damit Punkt und Wert übereinanderliegen.
 *
 * Die Kontrollpunkte werden zwischen die beiden Endwerte geklemmt. Ohne das
 * überschwingt eine Catmull-Rom-Kurve bei Temperatursprüngen und zeichnet
 * Werte, die es in der Vorhersage nicht gibt.
 */
const drawWeatherGraph = (ctx, items) => {
  const graph = ctx.nodes.graph;
  if (!graph) return;

  const values = (items || []).map((entry) => numeric(entry?.temperature));
  const usable =
    ctx.config.show_graph !== false && values.length >= 2 && values.every(Number.isFinite);

  graph.classList.toggle("is-hidden", !usable);
  if (!usable) return;

  const count = values.length;
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const top = 6;
  const base = 34;

  const points = values.map((value, index) => ({
    x: ((index + 0.5) / count) * 100,
    y: base - ((value - low) / span) * (base - top),
  }));

  const round = (value) => Math.round(value * 100) / 100;
  let path = `M ${round(points[0].x)} ${round(points[0].y)}`;

  for (let index = 0; index < count - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const before = points[index - 1] || start;
    const after = points[index + 2] || end;
    const lower = Math.min(start.y, end.y);
    const upper = Math.max(start.y, end.y);
    const clamp = (value) => Math.min(upper, Math.max(lower, value));

    const c1x = start.x + (end.x - before.x) / 6;
    const c1y = clamp(start.y + (end.y - before.y) / 6);
    const c2x = end.x - (after.x - start.x) / 6;
    const c2y = clamp(end.y - (after.y - start.y) / 6);

    path += ` C ${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(end.x)} ${round(end.y)}`;
  }

  ctx.nodes.graphLine.setAttribute("d", path);
  ctx.nodes.graphArea.setAttribute(
    "d",
    `${path} L ${round(points[count - 1].x)} 40 L ${round(points[0].x)} 40 Z`
  );
};

// ---------------------------------------------------------------- Renderer

const renderers = {
  // ------------------------------------------------------------- Button
  button: {
    build(ctx) {
      const root = el("div");
      const row = el("div", "row");
      ctx.nodes.chip = el("div", "chip");
      ctx.nodes.chipIcon = icon("mdi:circle-outline");
      ctx.nodes.chip.append(ctx.nodes.chipIcon);

      const text = el("div");
      ctx.nodes.title = el("div", "title");
      ctx.nodes.subtitle = el("div", "subtitle");
      text.append(ctx.nodes.title, ctx.nodes.subtitle);

      row.append(ctx.nodes.chip, text, el("div", "spacer"));

      // Alle drei Bedienformen entstehen hier einmal, update() blendet die
      // unpassenden aus. Beim Wechsel der Entität behält die Karte ihr DOM –
      // würde die Form erst hier entschieden, bliebe der falsche Regler stehen.
      ctx.nodes.toggle = el("div", "switch");

      ctx.nodes.press = el("button", "press-btn");
      ctx.nodes.pressIcon = icon("mdi:gesture-tap-button");
      ctx.nodes.press.append(ctx.nodes.pressIcon);
      ctx.nodes.press.addEventListener("click", (event) => {
        event.stopPropagation();
        runPress(ctx);
      });

      const coverButton = (label, symbol, service) => {
        const node = el("button");
        node.append(icon(symbol));
        node.title = label;
        node.setAttribute("aria-label", label);
        node.addEventListener("click", (event) => {
          event.stopPropagation();
          if (ctx.config.entity) ctx.hass?.callService("cover", service, { entity_id: ctx.config.entity });
        });
        return node;
      };
      ctx.nodes.cover = el("div", "cover-ctrl");
      ctx.nodes.cover.append(
        coverButton("Auf", "mdi:arrow-up", "open_cover"),
        coverButton("Stopp", "mdi:stop", "stop_cover"),
        coverButton("Zu", "mdi:arrow-down", "close_cover")
      );

      row.append(ctx.nodes.toggle, ctx.nodes.press, ctx.nodes.cover);
      root.append(row);

      ctx.card.classList.add("interactive");
      ctx.card.addEventListener("click", () => {
        const kind = buttonKind(ctx.config.entity);
        if (ctx.config.tap_action) {
          handleAction(ctx.host, ctx.hass, ctx.config.tap_action, ctx.config.entity);
          return;
        }
        if (kind === "press") {
          runPress(ctx);
          return;
        }
        // Bei Rollos wäre ein Umschalten auf die ganze Fläche zu grob –
        // dafür gibt es die drei Knöpfe.
        handleAction(ctx.host, ctx.hass, { action: kind === "cover" ? "more-info" : "toggle" }, ctx.config.entity);
      });
      return root;
    },
    update(ctx) {
      const entityId = ctx.config.entity;
      const state = ctx.hass?.states?.[entityId];
      const kind = buttonKind(entityId);

      // Der angezeigte Zustand darf von einer anderen Entität kommen. Eine
      // Taste hat keinen – der Türkontakt oder Binärsensor daneben schon.
      const stateId = ctx.config.state_entity || entityId;

      ctx.nodes.chipIcon.setAttribute("icon", ctx.config.icon || domainIcon(entityId, state));
      ctx.nodes.title.textContent = ctx.config.name || friendlyName(entityId, state);
      ctx.nodes.subtitle.textContent =
        ctx.config.show_state === false ? "" : formatState(ctx.hass, stateId);

      const visible = ctx.config.show_toggle !== false;
      ctx.nodes.toggle.hidden = !(visible && kind === "toggle");
      ctx.nodes.press.hidden = !(visible && kind === "press");
      ctx.nodes.cover.hidden = !(visible && kind === "cover");

      if (kind === "press") {
        ctx.nodes.pressIcon.setAttribute("icon", ctx.config.press_icon || "mdi:gesture-tap-button");
      }
    },
    disconnect(ctx) {
      clearTimeout(ctx.nodes.pressTimer);
    },
  },

  // ------------------------------------------------------------- Slider
  slider: {
    build(ctx) {
      const root = el("div");
      const head = el("div", "row");
      ctx.nodes.chip = el("div", "chip");
      ctx.nodes.chipIcon = icon("mdi:brightness-6");
      ctx.nodes.chip.append(ctx.nodes.chipIcon);
      ctx.nodes.title = el("div", "title");
      head.append(ctx.nodes.chip, ctx.nodes.title);

      const track = el("div", "slider-track");
      ctx.nodes.fill = el("div", "slider-fill");
      ctx.nodes.output = el("div", "slider-value");
      const input = document.createElement("input");
      input.type = "range";
      input.min = 0;
      input.max = 100;
      input.step = 1;
      ctx.nodes.input = input;

      // Während des Ziehens keine Zustandsübernahme von aussen – sonst springt der Regler.
      input.addEventListener("pointerdown", () => {
        ctx.nodes.dragging = true;
      });
      const release = () => {
        ctx.nodes.dragging = false;
      };
      input.addEventListener("pointerup", release);
      input.addEventListener("pointercancel", release);
      input.addEventListener("input", () => {
        const { min, max, unit } = ctx.nodes.range || { min: 0, max: 100, unit: "%" };
        const anteil = max > min ? ((Number(input.value) - min) / (max - min)) * 100 : 0;
        ctx.nodes.fill.style.width = `${anteil}%`;
        ctx.nodes.output.textContent = `${input.value}${unit ? ` ${unit}` : ""}`;
      });
      input.addEventListener("change", () => {
        release();
        renderers.slider.commit(ctx, Number(input.value));
      });

      track.append(ctx.nodes.fill, ctx.nodes.output, input);
      root.append(head, track);
      return root;
    },
    read(ctx) {
      const entityId = ctx.config.entity || "";
      const state = ctx.hass?.states?.[entityId];
      if (!state) return 0;
      const domain = entityId.split(".")[0];
      if (domain === "light") return Math.round(((state.attributes.brightness || 0) / 255) * 100);
      if (domain === "cover") return Number(state.attributes.current_position ?? 0);
      if (domain === "fan") return Number(state.attributes.percentage ?? 0);
      if (domain === "media_player") return Math.round((state.attributes.volume_level || 0) * 100);
      const { min, max } = sliderRange(entityId, state);
      return clampNumber(state.state, min, max, min);
    },
    commit(ctx, value) {
      const entityId = ctx.config.entity || "";
      const domain = entityId.split(".")[0];
      const hass = ctx.hass;
      if (!hass || !entityId) return;

      if (domain === "light") {
        hass.callService("light", "turn_on", { entity_id: entityId, brightness_pct: value });
      } else if (domain === "cover") {
        hass.callService("cover", "set_cover_position", { entity_id: entityId, position: value });
      } else if (domain === "fan") {
        hass.callService("fan", "set_percentage", { entity_id: entityId, percentage: value });
      } else if (domain === "media_player") {
        hass.callService("media_player", "volume_set", { entity_id: entityId, volume_level: value / 100 });
      } else if (domain === "number" || domain === "input_number") {
        hass.callService(domain, "set_value", { entity_id: entityId, value });
      }
    },
    update(ctx) {
      const state = ctx.hass?.states?.[ctx.config.entity];
      ctx.nodes.chipIcon.setAttribute("icon", ctx.config.icon || domainIcon(ctx.config.entity, state));
      ctx.nodes.title.textContent = ctx.config.name || friendlyName(ctx.config.entity, state);

      // Bereich der Entitaet uebernehmen, bevor der Wert gesetzt wird -
      // sonst beschneidet das Eingabefeld ihn auf die alten 0 bis 100.
      const range = sliderRange(ctx.config.entity, state);
      ctx.nodes.range = range;
      ctx.nodes.input.min = range.min;
      ctx.nodes.input.max = range.max;
      ctx.nodes.input.step = range.step;

      if (ctx.nodes.dragging) return;

      const value = renderers.slider.read(ctx);
      ctx.nodes.input.value = value;
      const anteil = range.max > range.min ? ((value - range.min) / (range.max - range.min)) * 100 : 0;
      ctx.nodes.fill.style.width = `${anteil}%`;
      ctx.nodes.output.textContent = `${value}${range.unit ? ` ${range.unit}` : ""}`;
    },
  },

  // ------------------------------------------------------------- Thermostat
  thermostat: {
    build(ctx) {
      const root = el("div");
      root.style.cssText = "display:flex;flex-direction:column;gap:10px;flex:1;min-height:0";

      const head = el("div", "row");
      const text = el("div");
      ctx.nodes.title = el("div", "title");
      ctx.nodes.subtitle = el("div", "subtitle");
      text.append(ctx.nodes.title, ctx.nodes.subtitle);
      ctx.nodes.toggle = el("div", "switch");
      head.append(text, el("div", "spacer"), ctx.nodes.toggle);
      ctx.nodes.toggle.addEventListener("click", (event) => {
        event.stopPropagation();
        ctx.hass?.callService("climate", "toggle", { entity_id: ctx.config.entity });
      });

      const wrap = el("div", "dial-wrap");
      const dial = el("div", "dial");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 100 100");

      const circumference = 2 * Math.PI * 42;
      const arc = circumference * 0.75; // 270-Grad-Bogen

      const track = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      track.setAttribute("class", "track");
      track.setAttribute("cx", "50");
      track.setAttribute("cy", "50");
      track.setAttribute("r", "42");
      track.setAttribute("stroke-width", "7");
      track.setAttribute("stroke-dasharray", `${arc} ${circumference}`);

      const value = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      value.setAttribute("class", "value");
      value.setAttribute("cx", "50");
      value.setAttribute("cy", "50");
      value.setAttribute("r", "42");
      value.setAttribute("stroke-width", "7");
      value.setAttribute("stroke-dasharray", `${arc} ${circumference}`);
      value.setAttribute("stroke-dashoffset", String(arc));

      ctx.nodes.arcLength = arc;
      ctx.nodes.arc = value;
      svg.append(track, value);

      const center = el("div", "dial-center");
      ctx.nodes.temp = el("div", "dial-temp", "--");
      ctx.nodes.tempLabel = el("div", "dial-label", "Temperatur");
      center.append(ctx.nodes.temp, ctx.nodes.tempLabel);

      dial.append(svg, center);
      wrap.append(dial);

      const stepper = el("div", "stepper");
      const down = document.createElement("button");
      down.append(icon("mdi:minus"));
      const up = document.createElement("button");
      up.append(icon("mdi:plus"));
      down.addEventListener("click", () => renderers.thermostat.step(ctx, -0.5));
      up.addEventListener("click", () => renderers.thermostat.step(ctx, 0.5));
      stepper.append(down, up);

      ctx.nodes.modes = el("div", "modes");

      root.append(head, wrap, stepper, ctx.nodes.modes);
      return root;
    },
    step(ctx, delta) {
      const state = ctx.hass?.states?.[ctx.config.entity];
      if (!state) return;
      const current = Number(state.attributes.temperature);
      if (!Number.isFinite(current)) return;
      const step = Number(state.attributes.target_temp_step) || Math.abs(delta);
      const next = Math.round((current + Math.sign(delta) * step) * 10) / 10;
      ctx.hass.callService("climate", "set_temperature", { entity_id: ctx.config.entity, temperature: next });
    },
    update(ctx) {
      const state = ctx.hass?.states?.[ctx.config.entity];
      ctx.nodes.title.textContent = ctx.config.name || friendlyName(ctx.config.entity, state);
      ctx.nodes.subtitle.textContent = state?.attributes?.friendly_name || "";

      const target = Number(state?.attributes?.temperature);
      const current = Number(state?.attributes?.current_temperature);
      const min = Number(state?.attributes?.min_temp ?? 7);
      const max = Number(state?.attributes?.max_temp ?? 35);

      const shown = Number.isFinite(target) ? target : current;
      ctx.nodes.temp.textContent = Number.isFinite(shown) ? `${shown}°` : "--";
      ctx.nodes.tempLabel.textContent = Number.isFinite(current) ? `Aktuell ${current}°` : "Temperatur";

      const ratio = Number.isFinite(shown) && max > min ? clampNumber((shown - min) / (max - min), 0, 1, 0) : 0;
      ctx.nodes.arc.setAttribute("stroke-dashoffset", String(ctx.nodes.arcLength * (1 - ratio)));

      // Betriebsarten
      const modes = state?.attributes?.hvac_modes || [];
      const labels = { off: "Aus", heat: "Heizen", cool: "Kühlen", auto: "Auto", dry: "Trocken", fan_only: "Lüfter", heat_cool: "Auto" };
      const icons = { off: "mdi:power", heat: "mdi:fire", cool: "mdi:snowflake", auto: "mdi:autorenew", dry: "mdi:water-percent", fan_only: "mdi:fan", heat_cool: "mdi:sun-snowflake" };

      if (ctx.nodes.modeKey !== modes.join("|")) {
        ctx.nodes.modeKey = modes.join("|");
        ctx.nodes.modes.replaceChildren();
        ctx.nodes.modeButtons = new Map();
        modes.forEach((mode) => {
          const button = el("button", "mode");
          const dot = el("span", "dot");
          dot.append(icon(icons[mode] || "mdi:circle-outline"));
          button.append(dot, el("span", null, labels[mode] || mode));
          button.addEventListener("click", () =>
            ctx.hass.callService("climate", "set_hvac_mode", { entity_id: ctx.config.entity, hvac_mode: mode })
          );
          ctx.nodes.modeButtons.set(mode, button);
          ctx.nodes.modes.append(button);
        });
      }
      ctx.nodes.modeButtons?.forEach((button, mode) => button.classList.toggle("active", state?.state === mode));
    },
  },

  // ------------------------------------------------------------- Wetter
  weather: {
    build(ctx) {
      const root = el("div");
      root.style.cssText = "display:flex;flex-direction:column;gap:10px;flex:1;min-height:0";

      const head = el("div", "weather-head");
      ctx.nodes.now = el("div", "weather-now");
      const meta = el("div");
      ctx.nodes.condition = el("div", "title");
      ctx.nodes.wind = el("div", "subtitle");
      meta.append(ctx.nodes.condition, ctx.nodes.wind);
      head.append(ctx.nodes.now, meta);

      // Verlaufskurve. Das DOM entsteht hier einmal und vollständig; im
      // Update-Pfad ändert sich ausschliesslich das d-Attribut der beiden Pfade.
      const SVG_NS = "http://www.w3.org/2000/svg";
      ctx.nodes.graph = el("div", "weather-graph");
      const graphSvg = document.createElementNS(SVG_NS, "svg");
      graphSvg.setAttribute("viewBox", "0 0 100 40");
      graphSvg.setAttribute("preserveAspectRatio", "none");

      // Die id wirkt nur im Shadow Root dieser Karte – keine Kollision mit
      // weiteren Wetterkarten auf derselben Seite.
      const defs = document.createElementNS(SVG_NS, "defs");
      const fade = document.createElementNS(SVG_NS, "linearGradient");
      fade.setAttribute("id", "haos-weather-fade");
      fade.setAttribute("x1", "0");
      fade.setAttribute("y1", "0");
      fade.setAttribute("x2", "0");
      fade.setAttribute("y2", "1");
      [
        ["0%", "currentColor", ".38"],
        ["100%", "currentColor", "0"],
      ].forEach(([offset, color, opacity]) => {
        const stop = document.createElementNS(SVG_NS, "stop");
        stop.setAttribute("offset", offset);
        stop.setAttribute("stop-color", color);
        stop.setAttribute("stop-opacity", opacity);
        fade.append(stop);
      });
      defs.append(fade);

      ctx.nodes.graphArea = document.createElementNS(SVG_NS, "path");
      ctx.nodes.graphArea.setAttribute("class", "area");
      ctx.nodes.graphArea.setAttribute("d", "");
      ctx.nodes.graphLine = document.createElementNS(SVG_NS, "path");
      ctx.nodes.graphLine.setAttribute("class", "line");
      ctx.nodes.graphLine.setAttribute("d", "");

      graphSvg.append(defs, ctx.nodes.graphArea, ctx.nodes.graphLine);
      ctx.nodes.graph.append(graphSvg);
      ctx.nodes.graph.style.color = "var(--haos-accent, #0a84ff)";

      ctx.nodes.forecast = el("div", "forecast");
      const bottom = el("div", "weather-bottom");
      bottom.append(ctx.nodes.graph, ctx.nodes.forecast);
      root.append(head, bottom);
      return root;
    },
    update(ctx) {
      const state = ctx.hass?.states?.[ctx.config.entity];
      if (!state) return;

      const temp = Math.round(numeric(state.attributes.temperature));
      ctx.nodes.now.textContent = Number.isFinite(temp) ? `${temp}°` : "--";
      ctx.nodes.condition.textContent = ctx.config.name || friendlyName(ctx.config.entity, state);
      const speed = state.attributes.wind_speed;
      ctx.nodes.wind.textContent = speed ? `Wind ${speed} ${state.attributes.wind_speed_unit || "km/h"}` : state.state;

      // Vorhersage: neuere HA-Versionen liefern sie nicht mehr als Attribut.
      const forecast = state.attributes.forecast || ctx.nodes.forecastData || [];
      const items = dropPastDays(forecast, ctx.config.forecast_type).slice(
        0,
        Number(ctx.config.forecast_count) || 5
      );

      if (ctx.nodes.forecast.childElementCount !== items.length) {
        ctx.nodes.forecast.replaceChildren();
        ctx.nodes.forecastNodes = items.map(() => {
          const node = el("div", "forecast-item");
          const value = el("b");
          const symbol = icon("mdi:weather-cloudy");
          const label = el("span");
          node.append(value, symbol, label);
          ctx.nodes.forecast.append(node);
          return { value, symbol, label };
        });
      }

      const conditionIcons = {
        sunny: "mdi:weather-sunny", clear: "mdi:weather-sunny", "clear-night": "mdi:weather-night",
        cloudy: "mdi:weather-cloudy", partlycloudy: "mdi:weather-partly-cloudy", rainy: "mdi:weather-rainy",
        pouring: "mdi:weather-pouring", snowy: "mdi:weather-snowy", fog: "mdi:weather-fog",
        windy: "mdi:weather-windy", lightning: "mdi:weather-lightning", hail: "mdi:weather-hail",
      };

      items.forEach((entry, index) => {
        const node = ctx.nodes.forecastNodes?.[index];
        if (!node) return;
        const value = Math.round(numeric(entry?.temperature));
        node.value.textContent = Number.isFinite(value) ? `${value}°` : "--";
        node.symbol.setAttribute("icon", conditionIcons[entry.condition] || "mdi:weather-cloudy");
        node.label.textContent = forecastLabel(entry?.datetime, ctx.config.forecast_type);
      });

      drawWeatherGraph(ctx, items);
    },
    /** Holt die Vorhersage einmalig per WebSocket-Abo (HA 2024.x+). */
    async connect(ctx) {
      if (!ctx.hass?.connection || !ctx.config.entity || ctx.nodes.forecastUnsub) return;
      try {
        ctx.nodes.forecastUnsub = await ctx.hass.connection.subscribeMessage(
          (message) => {
            ctx.nodes.forecastData = message.forecast || [];
            renderers.weather.update(ctx);
          },
          { type: "weather/subscribe_forecast", entity_id: ctx.config.entity, forecast_type: ctx.config.forecast_type || "hourly" }
        );
      } catch (_error) {
        // Ältere HA-Version: Vorhersage kommt weiter über das Attribut.
      }
    },
    disconnect(ctx) {
      ctx.nodes.forecastUnsub?.();
      ctx.nodes.forecastUnsub = null;
    },
  },

  // ------------------------------------------------------------- Energie
  energy: {
    build(ctx) {
      const root = el("div");
      root.style.cssText = "display:flex;flex-direction:column;gap:10px;flex:1;min-height:0";
      const head = el("div", "row");
      ctx.nodes.title = el("div", "title");
      ctx.nodes.total = el("div", "muted");
      head.append(ctx.nodes.title, el("div", "spacer"), ctx.nodes.total);
      ctx.nodes.bars = el("div", "bars");
      root.append(head, ctx.nodes.bars);
      return root;
    },
    update(ctx) {
      const state = ctx.hass?.states?.[ctx.config.entity];
      ctx.nodes.title.textContent = ctx.config.name || friendlyName(ctx.config.entity, state);
      const unit = state?.attributes?.unit_of_measurement || "";
      ctx.nodes.total.textContent = state ? `${state.state} ${unit}` : "";

      const values = ctx.nodes.history || [];
      if (!values.length) return;

      const max = Math.max(...values.map((entry) => entry.value), 1);

      if (ctx.nodes.bars.childElementCount !== values.length) {
        ctx.nodes.bars.replaceChildren();
        ctx.nodes.barNodes = values.map(() => {
          const column = el("div", "bar-col");
          const bar = el("div", "bar");
          const label = el("div", "bar-label");
          column.append(bar, label);
          ctx.nodes.bars.append(column);
          return { bar, label };
        });
      }

      const peak = values.reduce((best, entry, index) => (entry.value > values[best].value ? index : best), 0);
      values.forEach((entry, index) => {
        const node = ctx.nodes.barNodes?.[index];
        if (!node) return;
        node.bar.style.height = `${Math.max(3, (entry.value / max) * 100)}%`;
        node.bar.classList.toggle("peak", index === peak);
        node.label.textContent = entry.label;
      });
    },
    /**
     * Holt die Tageswerte.
     *
     * Ueber `recorder/statistics_during_period`, nicht ueber den Verlauf.
     * Zaehler wie ein Energiezaehler laufen monoton hoch; aus dem Verlauf
     * liess sich daraus nur der hoechste Stand des Tages ablesen, nicht der
     * Verbrauch. Home Assistant fuehrt fuer solche Entitaeten Statistiken mit
     * einer Summe je Stunde und Tag - `change` ist genau der Tagesverbrauch.
     *
     * Faellt auf den Verlauf zurueck, wenn keine Statistik vorliegt: nicht
     * jede Entitaet hat eine `state_class` und damit Statistikdaten.
     */
    async connect(ctx) {
      if (!ctx.hass || !ctx.config.entity || ctx.nodes.historyLoaded) return;
      ctx.nodes.historyLoaded = true;

      const days = Number(ctx.config.days) || 7;
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - (days - 1));
      start.setHours(0, 0, 0, 0);

      const weekdays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
      const beschriften = (reihen) =>
        reihen.slice(-days).map(([key, value]) => ({ value, label: weekdays[new Date(key).getDay()] }));

      try {
        const statistik = await ctx.hass.callWS({
          type: "recorder/statistics_during_period",
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          statistic_ids: [ctx.config.entity],
          period: "day",
          types: ["change", "state", "sum"],
        });

        const punkte = statistik?.[ctx.config.entity] || [];
        if (punkte.length) {
          const werte = punkte
            .map((punkt) => {
              // `change` ist der Verbrauch im Zeitraum. Ohne den nimmt die
              // Karte den Zustand - bei Momentanwerten wie Leistung richtig.
              const wert = punkt.change ?? punkt.state;
              const zahl = numeric(wert);
              return Number.isFinite(zahl) ? [new Date(punkt.start).toISOString().slice(0, 10), zahl] : null;
            })
            .filter(Boolean);

          if (werte.length) {
            ctx.nodes.history = beschriften(werte);
            ctx.nodes.historySource = "statistik";
            renderers.energy.update(ctx);
            return;
          }
        }
      } catch (_error) {
        /* Keine Statistik - unten weiter mit dem Verlauf. */
      }

      try {
        const pfad =
          `history/period/${encodeURIComponent(start.toISOString())}` +
          `?filter_entity_id=${encodeURIComponent(ctx.config.entity)}` +
          `&end_time=${encodeURIComponent(end.toISOString())}&minimal_response&no_attributes`;
        const ergebnis = await ctx.hass.callApi("GET", pfad);
        const reihe = ergebnis?.[0] || [];

        const eimer = new Map();
        reihe.forEach((punkt) => {
          const wert = numeric(punkt.state);
          if (!Number.isFinite(wert)) return;
          const wann = new Date(punkt.last_changed || punkt.last_updated);
          const key = wann.toISOString().slice(0, 10);
          eimer.set(key, Math.max(eimer.get(key) ?? 0, wert));
        });

        ctx.nodes.history = beschriften([...eimer.entries()].sort(([a], [b]) => a.localeCompare(b)));
        ctx.nodes.historySource = "verlauf";
        renderers.energy.update(ctx);
      } catch (_error) {
        ctx.nodes.historyLoaded = false;
      }
    },
  },

  // ------------------------------------------------------------- Media
  media: {
    build(ctx) {
      const root = el("div");
      root.style.cssText = "display:flex;flex-direction:column;gap:9px;flex:1;min-height:0;justify-content:center";

      const head = el("div", "media-head");
      ctx.nodes.art = el("div", "media-art");
      ctx.nodes.artIcon = icon("mdi:music");
      ctx.nodes.art.append(ctx.nodes.artIcon);
      const meta = el("div");
      meta.style.minWidth = "0";
      ctx.nodes.track = el("div", "title");
      ctx.nodes.artist = el("div", "subtitle");
      meta.append(ctx.nodes.track, ctx.nodes.artist);
      head.append(ctx.nodes.art, meta);

      ctx.nodes.progress = el("div", "progress");
      ctx.nodes.progressBar = el("span");
      ctx.nodes.progress.append(ctx.nodes.progressBar);

      const times = el("div", "media-times");
      ctx.nodes.elapsed = el("span", null, "0:00");
      ctx.nodes.duration = el("span", null, "0:00");
      times.append(ctx.nodes.elapsed, ctx.nodes.duration);

      const controls = el("div", "media-controls");

      /**
       * Ein Bedienknopf.
       *
       * `feature` ist das Bit aus `supported_features`. Ein Player, der kein
       * Mischen kann, bekommt den Knopf gar nicht erst zu sehen.
       */
      const make = (symbol, feature, onClick, className = "") => {
        const button = el("button", className);
        button.append(icon(symbol));
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          if (ctx.config.entity) onClick();
        });
        return { node: button, feature, symbol };
      };

      const call = (service, data = {}) =>
        ctx.hass?.callService("media_player", service, { entity_id: ctx.config.entity, ...data });

      // shuffle_set und repeat_set brauchen zwingend einen Wert. Ohne den
      // wies Home Assistant den Aufruf ab und beide Knoepfe taten nichts.
      const shuffle = make("mdi:shuffle-variant", MEDIA_FEATURE.SHUFFLE_SET, () => {
        const on = ctx.hass?.states?.[ctx.config.entity]?.attributes?.shuffle === true;
        call("shuffle_set", { shuffle: !on });
      });

      const repeat = make("mdi:repeat", MEDIA_FEATURE.REPEAT_SET, () => {
        const jetzt = ctx.hass?.states?.[ctx.config.entity]?.attributes?.repeat || "off";
        const naechste = { off: "all", all: "one", one: "off" }[jetzt] || "off";
        call("repeat_set", { repeat: naechste });
      });

      const previous = make("mdi:skip-previous", MEDIA_FEATURE.PREVIOUS_TRACK, () =>
        call("media_previous_track")
      );
      const next = make("mdi:skip-next", MEDIA_FEATURE.NEXT_TRACK, () => call("media_next_track"));
      const play = make("mdi:pause", MEDIA_FEATURE.PLAY | MEDIA_FEATURE.PAUSE, () => call("media_play_pause"), "play");

      ctx.nodes.play = play.node;
      ctx.nodes.shuffle = shuffle;
      ctx.nodes.repeat = repeat;
      ctx.nodes.mediaButtons = [shuffle, previous, play, next, repeat];
      controls.append(...ctx.nodes.mediaButtons.map((b) => b.node));

      root.append(head, ctx.nodes.progress, times, controls);
      return root;
    },
    update(ctx) {
      const state = ctx.hass?.states?.[ctx.config.entity];
      const attributes = state?.attributes || {};

      ctx.nodes.track.textContent = attributes.media_title || ctx.config.name || friendlyName(ctx.config.entity, state);
      ctx.nodes.artist.textContent = attributes.media_artist || attributes.media_series_title || state?.state || "";

      const picture = attributes.entity_picture || "";
      if (picture !== ctx.nodes.artUrl) {
        ctx.nodes.artUrl = picture;
        if (picture) {
          const img = document.createElement("img");
          img.src = picture;
          img.alt = "";
          ctx.nodes.art.replaceChildren(img);
        } else {
          ctx.nodes.art.replaceChildren(ctx.nodes.artIcon);
        }
      }

      const duration = Number(attributes.media_duration) || 0;
      let position = Number(attributes.media_position) || 0;
      if (attributes.media_position_updated_at && state?.state === "playing") {
        position += (Date.now() - new Date(attributes.media_position_updated_at).getTime()) / 1000;
      }
      const ratio = duration > 0 ? clampNumber(position / duration, 0, 1, 0) : 0;
      ctx.nodes.progressBar.style.width = `${ratio * 100}%`;
      ctx.nodes.elapsed.textContent = formatDuration(position);
      ctx.nodes.duration.textContent = formatDuration(duration);

      ctx.nodes.play.querySelector("ha-icon")?.setAttribute("icon", state?.state === "playing" ? "mdi:pause" : "mdi:play");

      // Nur zeigen, was der Player wirklich kann.
      const features = Number(attributes.supported_features) || 0;
      ctx.nodes.mediaButtons?.forEach(({ node, feature }) => {
        node.hidden = !(features & feature);
      });

      // Mischen und Wiederholen zeigen ihren Zustand an.
      ctx.nodes.shuffle?.node.classList.toggle("is-active", attributes.shuffle === true);
      const repeat = attributes.repeat || "off";
      ctx.nodes.repeat?.node.classList.toggle("is-active", repeat !== "off");
      ctx.nodes.repeat?.node
        .querySelector("ha-icon")
        ?.setAttribute("icon", repeat === "one" ? "mdi:repeat-once" : "mdi:repeat");
    },
  },

  // ------------------------------------------------------------- Mitglieder
  members: {
    build(ctx) {
      const root = el("div");
      const head = el("div", "row");
      ctx.nodes.title = el("div", "title");
      head.append(ctx.nodes.title, el("div", "spacer"));
      ctx.nodes.list = el("div", "members");
      root.append(head, ctx.nodes.list);
      return root;
    },
    update(ctx) {
      ctx.nodes.title.textContent = ctx.config.name || "Mitglieder";
      const ids = ctx.config.entities?.length
        ? ctx.config.entities
        : Object.keys(ctx.hass?.states || {}).filter((id) => id.startsWith("person."));

      if (ctx.nodes.memberKey !== ids.join("|")) {
        ctx.nodes.memberKey = ids.join("|");
        ctx.nodes.list.replaceChildren();
        ctx.nodes.memberNodes = new Map();
        ids.forEach((id) => {
          const node = el("button", "member");
          node.addEventListener("click", () => showMoreInfo(ctx.host, id));
          ctx.nodes.memberNodes.set(id, { node, picture: null });
          ctx.nodes.list.append(node);
        });
      }

      ctx.nodes.memberNodes?.forEach((record, id) => {
        const state = ctx.hass?.states?.[id];
        const name = friendlyName(id, state);
        const status = isUnavailable(state) ? "unavailable" : state.state === "home" ? "home" : "away";
        record.node.classList.remove("is-home", "is-away", "is-unavailable");
        record.node.classList.add(`is-${status}`);
        record.node.title = name;

        const picture = state?.attributes?.entity_picture || "";
        if (picture !== record.picture) {
          record.picture = picture;
          if (picture) {
            const img = document.createElement("img");
            img.src = picture;
            img.alt = "";
            record.node.replaceChildren(img);
          } else {
            record.node.textContent = (name[0] || "?").toUpperCase();
          }
        }
      });
    },
  },

  // ------------------------------------------------------------- Kalender
  calendar: {
    build(ctx) {
      const root = el("div");
      root.style.cssText = "display:flex;flex-direction:column;gap:10px;flex:1;min-height:0";
      ctx.nodes.title = el("div", "title");
      ctx.nodes.events = el("div", "events");
      root.append(ctx.nodes.title, ctx.nodes.events);
      return root;
    },
    update(ctx) {
      ctx.nodes.title.textContent = ctx.config.name || "Kalender";
      const events = ctx.nodes.events_data || [];

      if (!events.length) {
        ctx.nodes.events.replaceChildren(el("div", "muted", "Keine Termine"));
        return;
      }

      const months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
      ctx.nodes.events.replaceChildren(
        ...events.slice(0, Number(ctx.config.max_events) || 6).map((event) => {
          const row = el("div", "event");
          const when = el("div", "when");
          const date = new Date(event.start?.dateTime || event.start?.date || event.start);
          when.append(el("b", null, String(date.getDate())), el("span", null, months[date.getMonth()] || ""));
          row.append(when, el("div", "what", event.summary || "Termin"));
          return row;
        })
      );
    },
    async connect(ctx) {
      const entities = ctx.config.entities?.length ? ctx.config.entities : [ctx.config.entity].filter(Boolean);
      if (!ctx.hass || !entities.length || ctx.nodes.eventsLoaded) return;
      ctx.nodes.eventsLoaded = true;

      const days = Number(ctx.config.days) || 7;
      const start = new Date();
      const end = new Date(start.getTime() + days * 86400000);

      try {
        const lists = await Promise.all(
          entities.map((entityId) =>
            ctx.hass
              .callApi(
                "GET",
                `calendars/${encodeURIComponent(entityId)}?start=${encodeURIComponent(
                  start.toISOString()
                )}&end=${encodeURIComponent(end.toISOString())}`
              )
              .catch(() => [])
          )
        );
        ctx.nodes.events_data = lists
          .flat()
          .sort((a, b) =>
            String(a.start?.dateTime || a.start?.date || "").localeCompare(String(b.start?.dateTime || b.start?.date || ""))
          );
        renderers.calendar.update(ctx);
      } catch (_error) {
        ctx.nodes.eventsLoaded = false;
      }
    },
  },

  // ------------------------------------------------------------- Auswahl
  select: {
    build(ctx) {
      const root = el("div");
      root.style.cssText = "display:flex;flex-direction:column;gap:10px";
      ctx.nodes.title = el("div", "title");
      ctx.nodes.body = el("div");
      root.append(ctx.nodes.title, ctx.nodes.body);
      return root;
    },
    update(ctx) {
      const entityId = ctx.config.entity;
      const state = ctx.hass?.states?.[entityId];
      ctx.nodes.title.textContent = ctx.config.name || friendlyName(entityId, state);

      const options = state?.attributes?.options || [];
      const domain = String(entityId || "").split(".")[0];
      const mode = ctx.config.display === "buttons" ? "buttons" : "dropdown";
      const key = `${mode}|${options.join("|")}`;

      if (ctx.nodes.selectKey !== key) {
        ctx.nodes.selectKey = key;
        ctx.nodes.body.replaceChildren();

        if (mode === "dropdown") {
          const select = document.createElement("select");
          select.className = "dropdown";
          options.forEach((option) => {
            const node = document.createElement("option");
            node.value = option;
            node.textContent = option;
            select.append(node);
          });
          select.addEventListener("change", () =>
            ctx.hass?.callService(domain, "select_option", { entity_id: entityId, option: select.value })
          );
          ctx.nodes.select = select;
          ctx.nodes.optionButtons = null;
          ctx.nodes.body.append(select);
        } else {
          // Segmentumschalter statt einzelner Knoepfe – dieselbe Optik wie
          // die Reiter der Shell und die Auswahl in der Druckerkarte.
          ctx.nodes.segmented = createSegmented({
            options,
            value: state?.state ?? "",
            onChange: (option) =>
              ctx.hass?.callService(domain, "select_option", { entity_id: entityId, option }),
          });
          ctx.nodes.optionButtons = null;
          ctx.nodes.select = null;
          ctx.nodes.body.append(ctx.nodes.segmented.element);
          nextFrame(() => ctx.nodes.segmented.place());
        }
      }

      if (ctx.nodes.select && ctx.nodes.select.value !== state?.state) ctx.nodes.select.value = state?.state ?? "";
      ctx.nodes.segmented?.update(state?.state ?? "", options);
    },
  },

  // ------------------------------------------------------------- Trenner
  /**
   * Eine Beschriftung mit Linie, zum Gliedern eines Rasters.
   *
   * Ohne Entitaet und ohne Glasflaeche – als Karte getarnt waere er genau
   * das, was er nicht sein soll. Ein kleiner Hoehenfaktor (etwa 0,3) passt
   * dazu; der Editor sagt das im Hilfetext.
   */
  separator: {
    build(ctx) {
      ctx.card.classList.add("plain");

      const root = el("div", "sep");
      ctx.nodes.lineBefore = el("div", "sep-line");
      ctx.nodes.text = el("div", "sep-text");
      ctx.nodes.icon = icon("mdi:tag");
      ctx.nodes.label = el("span");
      ctx.nodes.text.append(ctx.nodes.icon, ctx.nodes.label);
      ctx.nodes.lineAfter = el("div", "sep-line");

      root.append(ctx.nodes.lineBefore, ctx.nodes.text, ctx.nodes.lineAfter);
      return root;
    },
    update(ctx) {
      const label = ctx.config.name || "";
      ctx.nodes.label.textContent = label;
      ctx.nodes.label.hidden = !label;

      ctx.nodes.icon.hidden = !ctx.config.icon;
      if (ctx.config.icon) ctx.nodes.icon.icon = ctx.config.icon;
      ctx.nodes.text.hidden = !label && !ctx.config.icon;

      // Ohne Text sitzt die Linie durchgehend. Mit Text liegt sie je nach
      // Ausrichtung links, rechts oder auf beiden Seiten.
      const align = ctx.config.align || "left";
      const showLine = ctx.config.show_line !== false;
      ctx.nodes.lineBefore.hidden = !showLine || (align === "left" && ctx.nodes.text.hidden === false);
      ctx.nodes.lineAfter.hidden = !showLine || (align === "right" && ctx.nodes.text.hidden === false);
      if (ctx.nodes.text.hidden) {
        ctx.nodes.lineBefore.hidden = !showLine;
        ctx.nodes.lineAfter.hidden = true;
      }
    },
  },

  // ------------------------------------------------------------- Kamera
  /**
   * Zwei Betriebsarten, im Editor je Karte wählbar:
   *
   * - **Standbild**: holt `entity_picture` neu, im eingestellten Takt. Das ist
   *   genau ein Bild pro Intervall, sonst schweigt die Leitung.
   * - **Livebild**: `/api/camera_proxy_stream/` liefert MJPEG. Das läuft in
   *   einem schlichten <img> und braucht kein nachgeladenes HA-Element —
   *   `ha-camera-stream` ist von außen nicht zuverlässig zu bekommen, dieselbe
   *   Falle wie beim Kartenwähler. Dafür überträgt MJPEG dauerhaft.
   *
   * Warum der IntersectionObserver: Die Shell blendet Seiten nur mit
   * `display: none` aus, die Karten bleiben am Leben. Ohne die Prüfung liefe
   * ein Livebild auf einer längst verlassenen Seite endlos weiter.
   */
  camera: {
    build(ctx) {
      const root = el("div", "camera");

      ctx.nodes.image = el("img", "camera-image");
      ctx.nodes.image.alt = "";
      ctx.nodes.image.decoding = "async";
      ctx.nodes.note = el("div", "camera-note");
      ctx.nodes.label = el("div", "camera-label");
      ctx.nodes.liveDot = el("span", "camera-live");
      ctx.nodes.labelText = el("span", null, "");
      ctx.nodes.label.append(ctx.nodes.liveDot, ctx.nodes.labelText);
      root.append(ctx.nodes.image, ctx.nodes.note, ctx.nodes.label);

      ctx.nodes.visible = true;
      ctx.nodes.failed = false;

      ctx.nodes.image.addEventListener("error", () => {
        // Ein abgelaufenes Token oder eine schlafende Kamera. Beim nächsten
        // Takt liegt ein frisches entity_picture vor, deshalb kein Dauerfehler.
        ctx.nodes.failed = true;
        renderers.camera._paint(ctx);
      });
      ctx.nodes.image.addEventListener("load", () => {
        if (!ctx.nodes.failed) return;
        ctx.nodes.failed = false;
        renderers.camera._paint(ctx);
      });

      // Tippen öffnet standardmäßig HAs Kameradialog – dort läuft der echte
      // Stream, auch wenn die Karte selbst nur ein Standbild zeigt.
      ctx.card.classList.add("interactive");
      root.addEventListener("click", () =>
        handleAction(ctx.host, ctx.hass, ctx.config.tap_action || { action: "more-info" }, ctx.config.entity)
      );

      // Fehlt die Schnittstelle (ältere Browser, Testumgebung), gilt die Karte
      // durchgehend als sichtbar. Dann läuft ein Livebild wie früher weiter –
      // unschön, aber immer noch besser als eine Karte, die gar nicht baut.
      if (typeof IntersectionObserver === "function") {
        ctx.nodes.observer = new IntersectionObserver((entries) => {
          const visible = entries.some((entry) => entry.isIntersecting);
          if (visible === ctx.nodes.visible) return;
          ctx.nodes.visible = visible;
          if (visible) renderers.camera.reconnect(ctx);
          else renderers.camera._stop(ctx);
        });
        ctx.nodes.observer.observe(ctx.host);
      }

      return root;
    },

    update(ctx) {
      const wanted = renderers.camera._interval(ctx);
      const modeChanged = ctx.nodes.mode !== renderers.camera._mode(ctx);
      if (modeChanged || ctx.nodes.interval !== wanted) renderers.camera.reconnect(ctx);
      else renderers.camera._paint(ctx);
    },

    reconnect(ctx) {
      if (!ctx.nodes.image) return;
      renderers.camera._stop(ctx);
      if (!ctx.nodes.visible) return;

      ctx.nodes.mode = renderers.camera._mode(ctx);
      ctx.nodes.interval = renderers.camera._interval(ctx);
      renderers.camera._paint(ctx);

      // Nur das Standbild braucht einen Takt. Der Livestream läuft von selbst.
      if (ctx.nodes.mode === "still") {
        ctx.nodes.timer = setInterval(() => renderers.camera._paint(ctx), ctx.nodes.interval);
      }
    },

    disconnect(ctx) {
      renderers.camera._stop(ctx);
      ctx.nodes.observer?.disconnect();
      ctx.nodes.observer = null;
    },

    /** Hält den Takt an und kappt eine laufende MJPEG-Verbindung. */
    _stop(ctx) {
      clearInterval(ctx.nodes.timer);
      ctx.nodes.timer = null;
      // Ein leeres src beendet den Stream. Ohne das lädt der Browser weiter,
      // auch wenn die Karte niemand sieht.
      if (ctx.nodes.image?.getAttribute("src")) ctx.nodes.image.removeAttribute("src");
    },

    _mode(ctx) {
      return ctx.config.camera_mode === "live" ? "live" : "still";
    },

    _interval(ctx) {
      return clampNumber(ctx.config.refresh_interval, 1, 300, 10) * 1000;
    },

    _paint(ctx) {
      const state = ctx.hass?.states?.[ctx.config.entity];
      const picture = state?.attributes?.entity_picture;
      const unavailable = !state || state.state === "unavailable" || !picture;

      const note = ctx.nodes.note;
      if (unavailable) {
        renderers.camera._stop(ctx);
        note.textContent = !ctx.config.entity
          ? "Keine Kamera gewählt."
          : !state
            ? `Unbekannte Entität: ${ctx.config.entity}`
            : "Kamera nicht erreichbar.";
        note.hidden = false;
        ctx.nodes.image.hidden = true;
        ctx.nodes.label.hidden = true;
        return;
      }

      if (ctx.nodes.failed) {
        note.textContent = "Bild konnte nicht geladen werden.";
        note.hidden = false;
      } else {
        note.hidden = true;
      }

      ctx.nodes.image.hidden = false;
      ctx.nodes.image.src =
        ctx.nodes.mode === "live"
          ? picture.replace("/api/camera_proxy/", "/api/camera_proxy_stream/")
          // Ohne den Zeitstempel liefert der Browser das zwischengespeicherte
          // Bild aus und die Kamera stünde still.
          : `${picture}${picture.includes("?") ? "&" : "?"}_=${Date.now()}`;

      const name = ctx.config.name || state.attributes.friendly_name || "";
      ctx.nodes.labelText.textContent = name;
      ctx.nodes.liveDot.hidden = ctx.nodes.mode !== "live";
      ctx.nodes.label.hidden = !name && ctx.nodes.mode !== "live";
    },
  },

  // ------------------------------------------------------------- Uhr
  clock: {
    build(ctx) {
      const root = el("div", "clock");
      ctx.nodes.time = el("div", "clock-time", "--:--");
      ctx.nodes.date = el("div", "clock-date");
      root.append(ctx.nodes.time, ctx.nodes.date);

      ctx.nodes.tick = () => {
        const now = new Date();
        const options = {
          hour: "2-digit",
          minute: "2-digit",
          hour12: ctx.config.hour_format === "12",
        };
        if (ctx.config.show_seconds) options.second = "2-digit";
        if (ctx.config.time_zone) options.timeZone = ctx.config.time_zone;

        try {
          ctx.nodes.time.textContent = now.toLocaleTimeString("de-DE", options);
          ctx.nodes.date.textContent =
            ctx.config.show_date === false
              ? ""
              : now.toLocaleDateString("de-DE", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  timeZone: ctx.config.time_zone || undefined,
                });
        } catch (_error) {
          // Ungültige Zeitzone o. Ä. – auf einfache Anzeige zurückfallen.
          ctx.nodes.time.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
          ctx.nodes.date.textContent = "";
        }
      };

      renderers.clock.reconnect(ctx);
      return root;
    },
    update(ctx) {
      // Die Anzeige läuft über den eigenen Timer. Hier wird nur geprüft, ob
      // die Taktrate wegen der Sekundenanzeige angepasst werden muss.
      const wanted = ctx.config.show_seconds ? 1000 : 15000;
      if (ctx.nodes.interval !== wanted) renderers.clock.reconnect(ctx);
    },
    reconnect(ctx) {
      if (!ctx.nodes.tick) return;
      clearInterval(ctx.nodes.timer);
      ctx.nodes.interval = ctx.config.show_seconds ? 1000 : 15000;
      ctx.nodes.tick();
      ctx.nodes.timer = setInterval(ctx.nodes.tick, ctx.nodes.interval);
    },
    disconnect(ctx) {
      clearInterval(ctx.nodes.timer);
      ctx.nodes.timer = null;
    },
  },
};

// ---------------------------------------------------------------- Karte

class HaOsCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._ctx = null;
    this._connected = false;
  }

  static getConfigElement() {
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig() {
    return { type: `custom:${TAG}`, card_type: "button", entity: "" };
  }

  setConfig(rawConfig) {
    // Ältere Konfigurationen haben Name und Symbol unter "darstellung" liegen.
    const config = flattenLegacyGroups(rawConfig);

    if (!config?.card_type) throw new Error("Bitte oben einen Kartentyp auswählen.");
    if (!renderers[config.card_type]) throw new Error(`Unbekannter Kartentyp: ${config.card_type}`);

    const previous = this._config;
    this._config = config;

    const typeChanged = previous?.card_type !== config.card_type;
    if (typeChanged || !this._ctx) {
      this._build();
      return;
    }

    // Gleicher Typ: DOM behalten, nur Konfiguration übernehmen.
    this._ctx.config = config;

    // Zeigt die Karte jetzt auf andere Entitäten, müssen Abos und
    // Verlaufsdaten neu geholt werden – sonst bleiben alte Daten stehen.
    const sourceChanged =
      previous?.entity !== config.entity ||
      previous?.state_entity !== config.state_entity ||
      String(previous?.entities || "") !== String(config.entities || "") ||
      previous?.days !== config.days;

    if (sourceChanged) {
      renderers[config.card_type].disconnect?.(this._ctx);
      ["forecastData", "forecastUnsub", "history", "historyLoaded", "events_data", "eventsLoaded"].forEach(
        (key) => delete this._ctx.nodes[key]
      );
      this._ctx.connected = false;
    }

    this._safeUpdate();

    if (sourceChanged && this._hass) {
      this._ctx.connected = true;
      renderers[config.card_type].connect?.(this._ctx);
    }
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (!this._ctx) return;
    this._ctx.hass = hass;

    // Home Assistant schiebt bei JEDER Zustandsänderung im ganzen System ein
    // neues hass-Objekt herein. Ohne diesen Filter würde jede Karte hunderte
    // Male pro Minute aktualisiert, obwohl sie gar nicht betroffen ist.
    if (first || this._watchedChanged(hass)) this._safeUpdate();

    if (!this._ctx.connected) {
      this._ctx.connected = true;
      renderers[this._config.card_type].connect?.(this._ctx);
    }
  }

  get hass() {
    return this._hass;
  }

  /** Entitäten, auf die diese Karte tatsächlich reagieren muss. */
  _watchedEntities() {
    const config = this._config || {};
    const ids = [config.entity, config.state_entity, ...(config.entities || [])].filter(Boolean);

    // Mitglieder ohne feste Liste beobachten alle Personen.
    if (config.card_type === "members" && !config.entities?.length) {
      return Object.keys(this._hass?.states || {}).filter((id) => id.startsWith("person."));
    }
    return ids;
  }

  _watchedChanged(hass) {
    const watched = this._watchedEntities();

    // Karten ohne Entität (z. B. Uhr) brauchen keine hass-Updates.
    if (!watched.length) return false;

    const previous = this._lastStates;
    const current = new Map(watched.map((id) => [id, hass?.states?.[id]]));
    this._lastStates = current;

    if (!previous || previous.size !== current.size) return true;
    for (const [id, state] of current) {
      // HA erzeugt nur bei echter Änderung ein neues State-Objekt.
      if (previous.get(id) !== state) return true;
    }
    return false;
  }

  connectedCallback() {
    this._connected = true;
    // Wird die Karte im DOM verschoben, muss z. B. der Uhr-Timer weiterlaufen.
    if (this._ctx) renderers[this._config?.card_type]?.reconnect?.(this._ctx);
  }

  disconnectedCallback() {
    this._connected = false;
    if (this._ctx) renderers[this._config?.card_type]?.disconnect?.(this._ctx);
  }

  getCardSize() {
    return 3;
  }

  _build() {
    if (this._ctx) renderers[this._ctx.type]?.disconnect?.(this._ctx);

    const style = document.createElement("style");
    style.textContent = STYLES;

    const card = el("div", "card");
    this._ctx = {
      host: this,
      card,
      config: this._config,
      hass: this._hass,
      nodes: {},
      type: this._config.card_type,
      connected: false,
    };

    try {
      card.append(renderers[this._config.card_type].build(this._ctx));
    } catch (error) {
      card.replaceChildren(el("div", "error", `Fehler beim Aufbau: ${error.message}`));
    }

    this.shadowRoot.replaceChildren(style, card);
    this._safeUpdate();
  }

  _safeUpdate() {
    if (!this._ctx || !this._hass) return;
    try {
      renderers[this._config.card_type].update(this._ctx);
    } catch (error) {
      console.error(`[${TAG}] Update fehlgeschlagen`, error);
      return;
    }

    // Statusklasse für Akzentleuchten – gilt für alle Typen mit Entität.
    // Ist eine getrennte Zustandsentität gesetzt, zählt deren Zustand: eine
    // Taste ist nie "an", der Sensor daneben schon.
    const statusId = this._config.state_entity || this._config.entity;
    const state = this._hass.states?.[statusId];
    this._ctx.card.classList.remove("is-on", "is-off", "is-unavailable");
    if (statusId) this._ctx.card.classList.add(statusClass(state));
  }
}

if (!customElements.get(TAG)) customElements.define(TAG, HaOsCard);

registerCard({
  type: TAG,
  name: "HA-OS Karte",
  description: "Eine Karte für alle Typen – Button, Slider, Thermostat, Wetter, Energie, Medien und mehr.",
  preview: false,
});

export { HaOsCard, TAG as CARD_TAG, EDITOR_TAG as CARD_EDITOR_TAG, renderers };
