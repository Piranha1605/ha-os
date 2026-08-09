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
  isEnergySensor,
  matchesSuffix,
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
  { value: "energy_list", label: "Energieliste", icon: "mdi:format-list-numbered" },
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
  .weather-icon { margin-left: auto; flex: 0 0 auto; --mdc-icon-size: 46px; color: rgba(var(--haos-text-rgb, 255,255,255), .85); }
  .weather-icon[hidden] { display: none; }
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
  /* --- Farbschleier hinter dem Medienspieler ---
     Drei weiche Kreise, gefaerbt aus dem Titelbild. Sie liegen im
     Karteninneren und werden vom Glas darueber aufgenommen. */
  .media-body { position: relative; flex: 1; min-height: 0; display: flex; }
  .media-stack { position: relative; z-index: 1; flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 9px; justify-content: center; }
  .media-glow {
    position: absolute; inset: -18px; z-index: 0; pointer-events: none;
    border-radius: inherit;
    transition: background .6s ease;
    background:
      radial-gradient(circle at 18% 22%, rgba(var(--glow-a, var(--haos-accent-rgb, 10,132,255)), .38), transparent 42%),
      radial-gradient(circle at 82% 30%, rgba(var(--glow-b, var(--haos-accent-rgb, 10,132,255)), .30), transparent 44%),
      radial-gradient(circle at 50% 104%, rgba(var(--glow-a, var(--haos-accent-rgb, 10,132,255)), .22), transparent 52%);
  }
  .media-glow[hidden] { display: none; }

  .media-art { width: 52px; height: 52px; flex: 0 0 52px; border-radius: 10px; overflow: hidden; background: rgba(var(--haos-text-rgb, 255,255,255), .1); display: grid; place-items: center; }
  .media-art img { width: 100%; height: 100%; object-fit: cover; }
  .progress { height: 3px; border-radius: 2px; background: rgba(var(--haos-text-rgb, 255,255,255), .18); overflow: hidden; }
  /* Zum Springen: mehr Hoehe zum Treffen, ohne dass der Balken dicker wirkt. */
  .progress.seekable { cursor: pointer; height: 3px; padding: 0; border-top: 6px solid transparent; border-bottom: 6px solid transparent; background-clip: padding-box; }
  .media-fav {
    width: 30px; height: 30px; flex: 0 0 30px; border-radius: 50%; display: grid; place-items: center;
    color: rgba(var(--haos-text-rgb, 255,255,255), .7);
    ${CONTROL_SURFACE_CSS}
  }
  .media-fav[hidden] { display: none; }
  .media-fav:hover { color: var(--haos-bad, #ff6b6b); }
  .media-fav ha-icon { --mdc-icon-size: 17px; }
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

  /* --- Lautstaerke --- */
  .volume { display: flex; align-items: center; gap: 9px; }
  .volume[hidden] { display: none; }
  .mute {
    width: 30px; height: 30px; flex: 0 0 30px; border-radius: 50%; display: grid; place-items: center;
    color: rgba(var(--haos-text-rgb, 255,255,255), .75);
    ${CONTROL_SURFACE_CSS}
  }
  .mute[hidden] { display: none; }
  .mute.is-active { color: var(--haos-accent, #0a84ff); }
  .mute ha-icon { --mdc-icon-size: 17px; }
  .volume-track {
    position: relative; flex: 1; height: 10px; border-radius: 99px; overflow: hidden;
    background: rgba(var(--haos-text-rgb, 255,255,255), .16);
  }
  .volume-track[hidden] { display: none; }
  .volume-track span { display: block; height: 100%; width: 0; background: var(--haos-accent, #0a84ff); transition: width .18s ease; }
  .volume-track input[type="range"] { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: ew-resize; }
  .volume-value { flex: 0 0 auto; font-size: 11px; min-width: 38px; text-align: right; color: rgba(var(--haos-text-rgb, 255,255,255), .6); }
  .volume-value[hidden] { display: none; }
  select.source { font-size: 12px; padding: 7px 10px; }
  select.source[hidden] { display: none; }

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
  .clock { position: relative; }
  .clock-timer { margin-top: 6px; font-size: 13px; font-variant-numeric: tabular-nums; color: var(--haos-accent, #0a84ff); }
  /* Die letzte Minute faellt auf – ohne zu blinken, das nervt auf einem
     Geraet, das den ganzen Tag an der Wand haengt. */
  .clock-timer.is-soon { color: var(--haos-bad, #ff6b6b); }
  .clock-timer[hidden] { display: none; }
  .clock-timer-btn {
    position: absolute; top: -4px; right: -4px;
    width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center;
    color: rgba(var(--haos-text-rgb, 255,255,255), .6);
    ${CONTROL_SURFACE_CSS}
  }
  .clock-timer-btn[hidden] { display: none; }
  .clock-timer-btn.is-active { color: var(--haos-accent, #0a84ff); }
  /* Der Stoppknopf sitzt an derselben Stelle und tritt an die Stelle des
     Weckers, solange es klingelt. */
  .clock-timer-btn.is-ringing { color: var(--haos-bad, #ff6b6b); }
  .clock-timer-btn ha-icon { --mdc-icon-size: 17px; position: relative; z-index: 1; }
  /* Ring um das Symbol. Beginnt oben und laeuft im Uhrzeigersinn ab. */
  .timer-ring { position: absolute; inset: -1px; transform: rotate(-90deg); pointer-events: none; }
  .timer-ring .ring-track { fill: none; stroke: rgba(var(--haos-text-rgb, 255,255,255), .16); stroke-width: 2.5; }
  .timer-ring .ring-value {
    fill: none; stroke: var(--haos-accent, #0a84ff); stroke-width: 2.5; stroke-linecap: round;
    transition: stroke-dashoffset .9s linear;
  }

  /* Echtes Fenster: <dialog> mit showModal(). Es liegt in der Top Layer des
     Browsers, also ueber allem - unabhaengig davon, was die Karte an
     overflow, Stapelkontexten oder backdrop-filter mitbringt. */
  .sheet {
    border: 0; padding: 0; max-width: min(320px, 92vw); width: max-content;
    border-radius: var(--haos-entity-radius, 20px);
    color: var(--haos-text, #fff);
    background: var(--haos-scrim, rgba(14, 18, 24, .92));
    box-shadow: 0 24px 60px rgba(0, 0, 0, .38);
    overflow: visible;
  }
  .sheet::backdrop {
    background: rgba(0, 0, 0, .45);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }
  .sheet-inner { display: flex; align-items: center; gap: 14px; padding: 14px 16px; }
  .timer-dial {
    flex: 0 0 auto; width: 122px; aspect-ratio: 1;
    cursor: pointer; touch-action: none;
  }
  .timer-dial .dial-temp { font-size: 26px; font-weight: 650; }
  .timer-dial .dial-label { font-size: 10px; }
  .sheet-actions { display: flex; flex-direction: column; gap: 6px; }
  .sheet-btn {
    padding: 7px 12px; border-radius: 10px; font-size: 12px; cursor: pointer; white-space: nowrap;
    color: var(--haos-text, #fff);
    ${CONTROL_SURFACE_CSS}
  }
  .sheet-btn.primary { color: var(--haos-accent, #0a84ff); }
  .sheet-btn.danger { color: var(--haos-bad, #ff6b6b); }
  .sheet-btn[hidden] { display: none; }

  /* --- Trenner ---
     Bewusst ohne Glas: ein Trenner soll gliedern, nicht wie eine weitere
     Karte aussehen. Die Klasse plain nimmt der Flaeche Rahmen, Fuellung
     und Schatten.

     Diese Regeln waren beim Umbau des Weckerfensters versehentlich
     mitgeloescht worden - dadurch bekamen alle Trenner ploetzlich einen
     Rahmen. Die Pruefung dazu sah nur die Klasse am Element, nicht ob es
     die Regel noch gibt; genau das prueft sie jetzt auch. */
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

  /* --- Energieliste --- */
  .energy-list { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 8px; }
  .energy-rows { flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: none; display: flex; flex-direction: column; gap: 7px; }
  .energy-rows::-webkit-scrollbar { display: none; }
  .energy-row { display: flex; flex-direction: column; gap: 4px; }
  .energy-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-size: 12px; }
  .energy-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgba(var(--haos-text-rgb, 255,255,255), .72); }
  .energy-value { flex: 0 0 auto; font-weight: var(--haos-font-weight-medium, 500); font-variant-numeric: tabular-nums; }
  .energy-bar { height: 4px; border-radius: 99px; overflow: hidden; background: rgba(var(--haos-text-rgb, 255,255,255), .12); }
  .energy-bar span { display: block; height: 100%; width: 0; background: var(--haos-accent, #0a84ff); transition: width .3s ease; }
  .energy-total { flex: 0 0 auto; padding-top: 6px; font-size: 12px; font-variant-numeric: tabular-nums; border-top: 1px solid rgba(var(--haos-text-rgb, 255,255,255), .12); color: rgba(var(--haos-text-rgb, 255,255,255), .8); }
  .energy-total[hidden] { display: none; }
  .energy-empty { font-size: 12px; color: rgba(var(--haos-text-rgb, 255,255,255), .5); }
  .energy-empty[hidden] { display: none; }

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
/**
 * Wetterlagen von Home Assistant auf Symbole.
 *
 * Auf Modulebene, weil sie an zwei Stellen gebraucht wird: fuer das grosse
 * Symbol der aktuellen Lage und fuer die Vorhersagespalten. Zweimal
 * gepflegt wuerde sie zwangslaeufig auseinanderlaufen.
 *
 * Die Liste folgt den Zustaenden, die HAs Wetterintegrationen melden.
 * `exceptional` steht fuer Unwetterwarnungen.
 */
const CONDITION_ICONS = {
  sunny: "mdi:weather-sunny",
  clear: "mdi:weather-sunny",
  "clear-night": "mdi:weather-night",
  cloudy: "mdi:weather-cloudy",
  partlycloudy: "mdi:weather-partly-cloudy",
  rainy: "mdi:weather-rainy",
  pouring: "mdi:weather-pouring",
  snowy: "mdi:weather-snowy",
  "snowy-rainy": "mdi:weather-snowy-rainy",
  fog: "mdi:weather-fog",
  windy: "mdi:weather-windy",
  "windy-variant": "mdi:weather-windy-variant",
  lightning: "mdi:weather-lightning",
  "lightning-rainy": "mdi:weather-lightning-rainy",
  hail: "mdi:weather-hail",
  exceptional: "mdi:alert-circle-outline",
};

/** Energiewerte: bis 100 mit einer Nachkommastelle, darueber ohne. */
const formatEnergy = (value) =>
  Math.abs(value) >= 100
    ? Math.round(value).toLocaleString("de-DE")
    : value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const MEDIA_FEATURE = {
  PAUSE: 1,
  SEEK: 2,
  STOP: 4096,
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

      // Grosses Symbol der aktuellen Lage, rechts aussen. Es steht bewusst
      // neben der Temperatur und nicht darueber: die Zeile darunter traegt
      // schon die Vorhersage, ein zweites Symbol in der Senkrechten machte
      // die Karte unruhig.
      ctx.nodes.nowIcon = icon("mdi:weather-cloudy");
      ctx.nodes.nowIcon.className = "weather-icon";

      head.append(ctx.nodes.now, meta, ctx.nodes.nowIcon);

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

      // Die aktuelle Lage steckt im Zustand der Entitaet, nicht in einem
      // Attribut. Unbekannte Lagen bekommen kein erfundenes Symbol - dann
      // bleibt der Platz leer, statt Sonne zu zeigen, wo Hagel faellt.
      const symbol = CONDITION_ICONS[state.state];
      ctx.nodes.nowIcon.hidden = !symbol;
      if (symbol) ctx.nodes.nowIcon.setAttribute("icon", symbol);

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

      items.forEach((entry, index) => {
        const node = ctx.nodes.forecastNodes?.[index];
        if (!node) return;
        const value = Math.round(numeric(entry?.temperature));
        node.value.textContent = Number.isFinite(value) ? `${value}°` : "--";
        node.symbol.setAttribute("icon", CONDITION_ICONS[entry.condition] || "mdi:weather-cloudy");
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
      const root = el("div", "media-body");

      /*
       * Farbschleier hinter dem Glas.
       *
       * Drei weiche Kreise, deren Farben aus dem Titelbild kommen – das Glas
       * darueber nimmt sie auf. Ohne Bild oder ohne lesbare Farben bleibt es
       * bei der Akzentfarbe.
       *
       * Die Schicht liegt IM Karteninneren, nicht dahinter: sie soll die
       * Karte faerben, nicht das Dashboard.
       */
      ctx.nodes.glow = el("div", "media-glow");
      root.append(ctx.nodes.glow);

      const head = el("div", "media-head");
      ctx.nodes.art = el("div", "media-art");
      ctx.nodes.artIcon = icon("mdi:music");
      ctx.nodes.art.append(ctx.nodes.artIcon);
      const meta = el("div");
      meta.style.minWidth = "0";
      ctx.nodes.track = el("div", "title");
      ctx.nodes.artist = el("div", "subtitle");
      meta.append(ctx.nodes.track, ctx.nodes.artist);

      /*
       * Favorit.
       *
       * Music Assistant legt je Player eine eigene Knopf-Entitaet an
       * (`button.<player>_..._favorisieren`). Sie wird gesucht statt
       * verlangt: wer den Player wechselt, soll nicht auch noch ein zweites
       * Feld nachziehen muessen. Ausdruecklich gesetzt gewinnt trotzdem.
       */
      ctx.nodes.favorite = el("button", "media-fav");
      ctx.nodes.favorite.append(icon("mdi:heart-outline"));
      ctx.nodes.favorite.title = "Titel favorisieren";
      ctx.nodes.favorite.addEventListener("click", (event) => {
        event.stopPropagation();
        const ziel = renderers.media._favoriteEntity(ctx);
        if (ziel) ctx.hass?.callService("button", "press", { entity_id: ziel });
      });

      head.append(ctx.nodes.art, meta, ctx.nodes.favorite);

      /*
       * Zeitleiste zum Springen.
       *
       * Der Klickpunkt wird ins Verhaeltnis zur Breite gesetzt – das ist die
       * einzige Stelle, an der die Karte eine Pixelbreite braucht. Sie wird
       * im Moment des Klicks gemessen, nicht gespeichert: die Karte kann
       * jederzeit ihre Groesse aendern.
       */
      ctx.nodes.progress = el("div", "progress");
      ctx.nodes.progressBar = el("span");
      ctx.nodes.progress.append(ctx.nodes.progressBar);
      ctx.nodes.progress.addEventListener("click", (event) => {
        event.stopPropagation();
        if (!ctx.nodes.canSeek) return;
        const dauer = Number(ctx.hass?.states?.[ctx.config.entity]?.attributes?.media_duration) || 0;
        if (!dauer) return;
        const kasten = ctx.nodes.progress.getBoundingClientRect();
        if (!kasten.width) return;
        const anteil = Math.max(0, Math.min(1, (event.clientX - kasten.left) / kasten.width));
        call("media_seek", { seek_position: Math.round(anteil * dauer) });
      });

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
      const stop = make("mdi:stop", MEDIA_FEATURE.STOP, () => call("media_stop"));

      ctx.nodes.play = play.node;
      ctx.nodes.shuffle = shuffle;
      ctx.nodes.repeat = repeat;
      ctx.nodes.mediaButtons = [shuffle, previous, play, stop, next, repeat];
      controls.append(...ctx.nodes.mediaButtons.map((b) => b.node));

      /*
       * Lautstaerke.
       *
       * Der Regler liegt unsichtbar ueber einer eigenen Spur – der native
       * laesst sich nicht zuverlaessig einfaerben, dieselbe Loesung wie bei
       * den Lueftern der Druckerkarte.
       *
       * Gesendet wird erst beim Loslassen. Waehrend des Ziehens ueber jeden
       * Zwischenwert zu schicken, ergaebe bei einem Zug von 20 auf 80 rund
       * sechzig Aufrufe – manche Player kommen damit nicht mit.
       */
      const volumeRow = el("div", "volume");
      ctx.nodes.muteButton = el("button", "mute");
      ctx.nodes.muteIcon = icon("mdi:volume-high");
      ctx.nodes.muteButton.append(ctx.nodes.muteIcon);
      ctx.nodes.muteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        const muted = ctx.hass?.states?.[ctx.config.entity]?.attributes?.is_volume_muted === true;
        call("volume_mute", { is_volume_muted: !muted });
      });

      const volumeTrack = el("div", "volume-track");
      ctx.nodes.volumeFill = el("span");
      ctx.nodes.volumeInput = document.createElement("input");
      ctx.nodes.volumeInput.type = "range";
      ctx.nodes.volumeInput.min = "0";
      ctx.nodes.volumeInput.max = "100";
      ctx.nodes.volumeInput.step = "1";
      volumeTrack.append(ctx.nodes.volumeFill, ctx.nodes.volumeInput);

      ctx.nodes.volumeValue = el("span", "volume-value", "–");

      ctx.nodes.volumeInput.addEventListener("input", (event) => {
        event.stopPropagation();
        ctx.nodes.volumeFill.style.width = `${ctx.nodes.volumeInput.value}%`;
        ctx.nodes.volumeValue.textContent = `${ctx.nodes.volumeInput.value} %`;
      });
      ctx.nodes.volumeInput.addEventListener("change", (event) => {
        event.stopPropagation();
        call("volume_set", { volume_level: Number(ctx.nodes.volumeInput.value) / 100 });
      });

      volumeRow.append(ctx.nodes.muteButton, volumeTrack, ctx.nodes.volumeValue);
      ctx.nodes.volumeRow = volumeRow;

      // Quellenwahl. Ein Aufklappmenue statt Segmenten: manche Player melden
      // zwanzig Quellen, die nebeneinander niemand mehr trifft.
      ctx.nodes.sourceSelect = document.createElement("select");
      ctx.nodes.sourceSelect.className = "dropdown source";
      ctx.nodes.sourceSelect.addEventListener("click", (event) => event.stopPropagation());
      ctx.nodes.sourceSelect.addEventListener("change", (event) => {
        event.stopPropagation();
        call("select_source", { source: ctx.nodes.sourceSelect.value });
      });

      const inhalt = el("div", "media-stack");
      inhalt.append(head, ctx.nodes.progress, times, controls, volumeRow, ctx.nodes.sourceSelect);
      root.append(inhalt);
      return root;
    },
    /** Sucht die Favoriten-Knopf-Entitaet zum gewaehlten Player. */
    _favoriteEntity(ctx) {
      if (ctx.config.favorite_entity) return ctx.config.favorite_entity;
      const objectId = String(ctx.config.entity || "").split(".")[1];
      if (!objectId || !ctx.hass?.states) return "";
      return (
        Object.keys(ctx.hass.states).find(
          (id) => id.startsWith(`button.${objectId}_`) && /favorit|favourite|favorisieren/i.test(id)
        ) || ""
      );
    },

    /**
     * Liest zwei kraeftige Farben aus dem Titelbild und faerbt damit die
     * Schleier.
     *
     * Das Bild wird auf 12x12 verkleinert – mehr braucht es nicht, und ein
     * grosses Bild Pixel fuer Pixel zu lesen kostet bei jedem Titelwechsel
     * spuerbar Zeit. Blasse und sehr dunkle Punkte fallen raus, sonst
     * gewinnt bei fast jedem Cover der schwarze Rand.
     *
     * Liegt das Bild auf einer fremden Adresse, verweigert der Browser das
     * Auslesen (der Zeichenbereich gilt dann als "verunreinigt"). Dann bleibt
     * es bei der Akzentfarbe – deshalb der try/catch.
     */
    _glowFromArt(ctx, img) {
      const setzen = (a, b) => {
        ctx.nodes.glow.style.setProperty("--glow-a", a);
        ctx.nodes.glow.style.setProperty("--glow-b", b);
      };

      if (!img || ctx.config.glow === false) {
        setzen("", "");
        return;
      }

      try {
        const size = 12;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;
        context.drawImage(img, 0, 0, size, size);
        const { data } = context.getImageData(0, 0, size, size);

        const kandidaten = [];
        for (let i = 0; i < data.length; i += 4) {
          const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saettigung = max === 0 ? 0 : (max - min) / max;
          if (max < 40 || saettigung < 0.18) continue;
          kandidaten.push({ r, g, b, gewicht: saettigung * max });
        }

        if (!kandidaten.length) {
          setzen("", "");
          return;
        }

        kandidaten.sort((a, b) => b.gewicht - a.gewicht);
        const erste = kandidaten[0];
        // Die zweite Farbe bewusst vom anderen Ende: zwei fast gleiche Toene
        // ergeben keinen Verlauf, sondern eine Flaeche.
        const zweite = kandidaten[Math.floor(kandidaten.length * 0.6)] || erste;
        setzen(`${erste.r}, ${erste.g}, ${erste.b}`, `${zweite.r}, ${zweite.g}, ${zweite.b}`);
      } catch (_error) {
        // Fremde Adresse – Auslesen nicht erlaubt.
        setzen("", "");
      }
    },

    update(ctx) {
      const state = ctx.hass?.states?.[ctx.config.entity];
      const attributes = state?.attributes || {};

      // Standardmaessig an – das Leuchten ist der Grund, warum es die
      // Schicht gibt. Wer es nicht mag, schaltet es im Editor ab.
      ctx.nodes.glow.hidden = ctx.config.glow === false;

      ctx.nodes.track.textContent = attributes.media_title || ctx.config.name || friendlyName(ctx.config.entity, state);
      ctx.nodes.artist.textContent = attributes.media_artist || attributes.media_series_title || state?.state || "";

      /*
       * Titelbild.
       *
       * Es gibt drei Quellen, und welche gefuellt ist, haengt an der
       * Integration:
       *
       *   entity_picture        von Home Assistant durchgereicht und
       *                         angemeldet – der Normalfall
       *   entity_picture_local  dasselbe bei einigen Integrationen
       *   media_image_url       die Originaladresse beim Anbieter. Nur
       *                         brauchbar, wenn HA sie ausdruecklich als
       *                         von aussen erreichbar meldet; sonst laeuft
       *                         sie ins Leere oder verlangt Anmeldung.
       *
       * Bei Streamingdiensten wie YouTube ist haeufig nur die letzte gesetzt.
       * Wer nur `entity_picture` liest, bekommt dort ein leeres Kaestchen.
       */
      const picture =
        attributes.entity_picture ||
        attributes.entity_picture_local ||
        (attributes.media_image_remotely_accessible ? attributes.media_image_url : "") ||
        "";

      if (picture !== ctx.nodes.artUrl) {
        ctx.nodes.artUrl = picture;
        if (picture) {
          const img = document.createElement("img");
          img.alt = "";
          // Ohne diesen Zweig bliebe bei einer toten Adresse ein graues
          // Kaestchen stehen – das Symbol sagt wenigstens, dass es ein
          // Medienspieler ist.
          img.addEventListener("error", () => {
            if (ctx.nodes.artUrl !== picture) return;
            ctx.nodes.artUrl = "";
            ctx.nodes.art.replaceChildren(ctx.nodes.artIcon);
          });
          img.addEventListener("load", () => {
            if (ctx.nodes.artUrl === picture) renderers.media._glowFromArt(ctx, img);
          });
          img.src = picture;
          ctx.nodes.art.replaceChildren(img);
        } else {
          ctx.nodes.art.replaceChildren(ctx.nodes.artIcon);
          renderers.media._glowFromArt(ctx, null);
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

      // --- Lautstaerke, Stummschalten, Quelle
      const kann = (bit) => (features & bit) === bit;
      ctx.nodes.volumeRow.hidden = !kann(MEDIA_FEATURE.VOLUME_SET) && !kann(MEDIA_FEATURE.VOLUME_MUTE);
      ctx.nodes.muteButton.hidden = !kann(MEDIA_FEATURE.VOLUME_MUTE);
      ctx.nodes.volumeInput.parentElement.hidden = !kann(MEDIA_FEATURE.VOLUME_SET);
      ctx.nodes.volumeValue.hidden = !kann(MEDIA_FEATURE.VOLUME_SET);

      const muted = attributes.is_volume_muted === true;
      ctx.nodes.muteIcon.icon = muted ? "mdi:volume-off" : "mdi:volume-high";
      ctx.nodes.muteButton.classList.toggle("is-active", muted);

      const level = Number(attributes.volume_level);
      if (Number.isFinite(level)) {
        const prozent = Math.round(level * 100);
        // Nicht ueberschreiben, waehrend jemand zieht – sonst springt der
        // Regler unter dem Finger zurueck.
        if (document.activeElement !== ctx.nodes.volumeInput) {
          ctx.nodes.volumeInput.value = String(prozent);
          ctx.nodes.volumeFill.style.width = `${prozent}%`;
        }
        ctx.nodes.volumeValue.textContent = muted ? "stumm" : `${prozent} %`;
      } else {
        ctx.nodes.volumeValue.textContent = muted ? "stumm" : "–";
      }

      /*
       * Quellenwahl.
       *
       * Massgeblich ist die Liste, nicht das Feature-Bit: manche
       * Integrationen melden `source_list`, ohne SELECT_SOURCE zu setzen –
       * dann waere die Auswahl unsichtbar, obwohl sie funktioniert. Ohne
       * Liste gibt es dagegen nichts zu waehlen, auch wenn das Bit gesetzt
       * ist.
       */
      ctx.nodes.canSeek = kann(MEDIA_FEATURE.SEEK) && Number(attributes.media_duration) > 0;
      ctx.nodes.progress.classList.toggle("seekable", ctx.nodes.canSeek);

      const favorit = renderers.media._favoriteEntity(ctx);
      ctx.nodes.favorite.hidden = !favorit;

      const sources = Array.isArray(attributes.source_list) ? attributes.source_list : [];
      ctx.nodes.sourceSelect.hidden = !sources.length;
      if (!ctx.nodes.sourceSelect.hidden) {
        const schluessel = sources.join("|");
        if (ctx.nodes.sourceKeys !== schluessel) {
          ctx.nodes.sourceKeys = schluessel;
          ctx.nodes.sourceSelect.replaceChildren(
            ...sources.map((quelle) => {
              const option = document.createElement("option");
              option.value = quelle;
              option.textContent = quelle;
              return option;
            })
          );
        }
        const aktuell = attributes.source || "";
        if (aktuell && ctx.nodes.sourceSelect.value !== aktuell) ctx.nodes.sourceSelect.value = aktuell;
      }

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

  // ------------------------------------------------------------- Energieliste
  /**
   * Mehrere Energiezaehler untereinander, nach Verbrauch sortiert.
   *
   * Gedacht fuer eine eigene Seite: wer dreissig Steckdosen misst, will sie
   * nicht als dreissig Karten, sondern als Liste - mit einem Balken, der den
   * Anteil zeigt, und einer Summe unten.
   *
   * Ohne feste Auswahl nimmt die Karte alle Sensoren mit `device_class:
   * energy`. Das sind bei einer gewachsenen Anlage schnell fuenfzig, von
   * denen die meisten Varianten desselben Zaehlers sind (heute, gestern,
   * gesamt) - deshalb das Feld *Endung*: `_today` liefert genau die
   * Tageswerte.
   */
  energy_list: {
    build(ctx) {
      const root = el("div", "energy-list");
      ctx.nodes.rows = el("div", "energy-rows");
      ctx.nodes.total = el("div", "energy-total");
      ctx.nodes.empty = el("div", "energy-empty", "Keine Energiezähler gefunden.");
      root.append(ctx.nodes.rows, ctx.nodes.empty, ctx.nodes.total);
      ctx.nodes.rowCache = new Map();
      return root;
    },

    /** Welche Entitaeten gehoeren in die Liste? */
    _entities(ctx) {
      const gewaehlt = Array.isArray(ctx.config.entities) ? ctx.config.entities.filter(Boolean) : [];
      if (gewaehlt.length) return gewaehlt;

      const states = ctx.hass?.states || {};

      return Object.keys(states).filter(
        (id) => id.startsWith("sensor.") && isEnergySensor(states[id]) && matchesSuffix(id, ctx.config.suffix)
      );
    },

    update(ctx) {
      const states = ctx.hass?.states || {};
      const einheit = ctx.config.unit || "kWh";

      const werte = renderers.energy_list
        ._entities(ctx)
        .map((id) => {
          const state = states[id];
          const zahl = numeric(state?.state);
          return {
            id,
            name: ctx.config.use_entity_names === false ? id : friendlyName(id, state),
            wert: Number.isFinite(zahl) ? zahl : null,
          };
        })
        // Zaehler ohne Wert fliegen raus statt als 0 zu erscheinen - eine
        // Steckdose, die nichts meldet, hat nicht null verbraucht.
        .filter((eintrag) => eintrag.wert !== null)
        .sort((a, b) => b.wert - a.wert);

      const grenze = Number(ctx.config.max_rows) || 0;
      const sichtbar = grenze > 0 ? werte.slice(0, grenze) : werte;
      const summe = werte.reduce((gesamt, eintrag) => gesamt + eintrag.wert, 0);
      const groesster = sichtbar[0]?.wert || 0;

      ctx.nodes.empty.hidden = werte.length > 0;

      // Zeilen wiederverwenden: die Liste aendert sich bei jedem Messwert,
      // ihr Aufbau aber selten.
      const gebraucht = new Set();
      sichtbar.forEach((eintrag, index) => {
        let zeile = ctx.nodes.rowCache.get(eintrag.id);
        if (!zeile) {
          const node = el("div", "energy-row");
          const kopf = el("div", "energy-head");
          const name = el("span", "energy-name");
          const wert = el("span", "energy-value");
          kopf.append(name, wert);
          const bahn = el("div", "energy-bar");
          const fuellung = el("span");
          bahn.append(fuellung);
          node.append(kopf, bahn);
          zeile = { node, name, wert, fuellung };
          ctx.nodes.rowCache.set(eintrag.id, zeile);
        }
        gebraucht.add(eintrag.id);

        zeile.name.textContent = eintrag.name;
        zeile.name.title = eintrag.name;
        zeile.wert.textContent = `${formatEnergy(eintrag.wert)} ${einheit}`;
        zeile.fuellung.style.width = groesster > 0 ? `${(eintrag.wert / groesster) * 100}%` : "0%";

        if (ctx.nodes.rows.children[index] !== zeile.node) {
          ctx.nodes.rows.insertBefore(zeile.node, ctx.nodes.rows.children[index] || null);
        }
      });

      ctx.nodes.rowCache.forEach((zeile, id) => {
        if (gebraucht.has(id)) return;
        zeile.node.remove();
        ctx.nodes.rowCache.delete(id);
      });

      const versteckt = werte.length - sichtbar.length;
      ctx.nodes.total.textContent = werte.length
        ? `Summe ${formatEnergy(summe)} ${einheit}${versteckt > 0 ? ` · ${versteckt} weitere` : ""}`
        : "";
      ctx.nodes.total.hidden = !ctx.nodes.total.textContent;
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
      ctx.nodes.timerLine = el("div", "clock-timer");
      root.append(ctx.nodes.time, ctx.nodes.date, ctx.nodes.timerLine);

      /*
       * Kurzzeitwecker.
       *
       * Gesteuert wird ein `timer`-Helfer von Home Assistant, kein Zaehler im
       * Browser. Ein Wecker, der beim Neuladen des Tablets verschwindet, ist
       * keiner - und nur die Entitaet kann spaeter etwas ausloesen.
       *
       * Das Fenster ist ein echtes `<dialog>` mit `showModal()`. Es rendert
       * in der Top Layer des Browsers und entkommt damit allem, was eine
       * Karte sonst einsperrt: `overflow: hidden`, Stapelkontexte und der
       * `backdrop-filter`, der die Karte zum Bezugsrahmen fuer fest
       * positionierte Kinder macht. Ein `position: fixed` haette genau
       * daran nichts geaendert - deshalb ist es KEIN Ausweg, sondern das
       * falsche Werkzeug.
       *
       * Es bleibt trotzdem im Shadow-DOM dieser Karte, unsere Stile gelten
       * also weiter. Esc und der Klick auf den Hintergrund schliessen.
       */
      ctx.nodes.timerButton = el("button", "clock-timer-btn");

      // Ring um das Symbol. Er leert sich, waehrend der Wecker laeuft –
      // die Zahl darunter sagt wie lange, der Ring sagt wie weit.
      const RING = "http://www.w3.org/2000/svg";
      const ringSvg = document.createElementNS(RING, "svg");
      ringSvg.setAttribute("viewBox", "0 0 36 36");
      ringSvg.setAttribute("class", "timer-ring");
      const ringUmfang = 2 * Math.PI * 16;
      const ringBahn = document.createElementNS(RING, "circle");
      ringBahn.setAttribute("class", "ring-track");
      ringBahn.setAttribute("cx", "18");
      ringBahn.setAttribute("cy", "18");
      ringBahn.setAttribute("r", "16");
      const ringWert = document.createElementNS(RING, "circle");
      ringWert.setAttribute("class", "ring-value");
      ringWert.setAttribute("cx", "18");
      ringWert.setAttribute("cy", "18");
      ringWert.setAttribute("r", "16");
      ringWert.setAttribute("stroke-dasharray", String(ringUmfang));
      ringWert.setAttribute("stroke-dashoffset", String(ringUmfang));
      ringSvg.append(ringBahn, ringWert);
      ctx.nodes.timerRing = ringWert;
      ctx.nodes.timerRingLength = ringUmfang;

      ctx.nodes.timerButton.append(ringSvg, icon("mdi:timer-outline"));

      /*
       * Ton abstellen.
       *
       * Sitzt an derselben Stelle wie der Weckerknopf und tritt an dessen
       * Platz, solange es klingelt. Zwei Knoepfe nebeneinander waeren in
       * dieser Ecke zu eng, und der Wecker laesst sich ohnehin nicht neu
       * stellen, waehrend der alte noch laeutet.
       *
       * Er stoppt beides: den Ton im Browser und - falls ein Lautsprecher
       * eingetragen ist - den der Automation.
       */
      ctx.nodes.silenceButton = el("button", "clock-timer-btn is-ringing");
      ctx.nodes.silenceButton.append(icon("mdi:bell-off"));
      ctx.nodes.silenceButton.title = "Ton abstellen";
      ctx.nodes.silenceButton.hidden = true;
      ctx.nodes.silenceButton.addEventListener("click", (event) => {
        event.stopPropagation();
        renderers.clock._silence(ctx);
      });
      ctx.nodes.timerButton.title = "Kurzzeitwecker";
      ctx.nodes.timerButton.addEventListener("click", (event) => {
        event.stopPropagation();
        ctx.nodes.minutes = renderers.clock._remaining(ctx) || 5;
        renderers.clock._openSheet(ctx);
        renderers.clock._paintDial(ctx);
      });
      root.append(ctx.nodes.timerButton, ctx.nodes.silenceButton);

      // --- Fenster mit Drehregler
      const sheet = document.createElement("dialog");
      sheet.className = "sheet";
      const dial = el("div", "dial timer-dial");
      const SVG = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(SVG, "svg");
      svg.setAttribute("viewBox", "0 0 100 100");

      const umfang = 2 * Math.PI * 42;
      const bogen = umfang * 0.75;
      const kreis = (klasse, offset) => {
        const node = document.createElementNS(SVG, "circle");
        node.setAttribute("class", klasse);
        node.setAttribute("cx", "50");
        node.setAttribute("cy", "50");
        node.setAttribute("r", "42");
        node.setAttribute("stroke-width", "7");
        node.setAttribute("stroke-dasharray", `${bogen} ${umfang}`);
        if (offset !== undefined) node.setAttribute("stroke-dashoffset", String(offset));
        return node;
      };
      ctx.nodes.timerArc = kreis("value", bogen);
      ctx.nodes.timerArcLength = bogen;
      svg.append(kreis("track"), ctx.nodes.timerArc);

      const mitte = el("div", "dial-center");
      ctx.nodes.timerValue = el("div", "dial-temp", "5");
      ctx.nodes.timerUnit = el("div", "dial-label", "Minuten");
      mitte.append(ctx.nodes.timerValue, ctx.nodes.timerUnit);
      dial.append(svg, mitte);

      /*
       * Ziehen auf dem Ring.
       *
       * Der Bogen ist um 135 Grad gedreht: er beginnt unten LINKS und laeuft
       * ueber 270 Grad im Uhrzeigersinn bis unten rechts. Rechts vom
       * Mittelpunkt liegen deshalb 50 Minuten, nicht 10 - genau das hatte
       * die erste Fassung falsch.
       *
       * Unten zwischen Ende und Anfang klafft die Luecke von 90 Grad. Wer
       * dort tippt, bekommt den naeheren Rand: 0 oder 60.
       */
      const START = 225; // Grad im Uhrzeigersinn ab zwoelf Uhr
      const ausZeiger = (event) => {
        const kasten = dial.getBoundingClientRect();
        if (!kasten.width) return null;
        const x = event.clientX - (kasten.left + kasten.width / 2);
        const y = event.clientY - (kasten.top + kasten.height / 2);
        let winkel = (Math.atan2(y, x) * 180) / Math.PI + 90;
        if (winkel < 0) winkel += 360;
        let aufBogen = winkel - START;
        if (aufBogen < 0) aufBogen += 360;
        if (aufBogen > 270) return aufBogen < 315 ? 60 : 0;
        return Math.round((aufBogen / 270) * 60);
      };

      const setzen = (event) => {
        const minuten = ausZeiger(event);
        if (minuten === null) return;
        ctx.nodes.minutes = Math.max(0, Math.min(60, minuten));
        renderers.clock._paintDial(ctx);
      };

      let zieht = false;
      dial.addEventListener("pointerdown", (event) => {
        zieht = true;
        dial.setPointerCapture?.(event.pointerId);
        setzen(event);
      });
      dial.addEventListener("pointermove", (event) => {
        if (zieht) setzen(event);
      });
      dial.addEventListener("pointerup", () => {
        zieht = false;
      });

      const knoepfe = el("div", "sheet-actions");
      ctx.nodes.timerStart = el("button", "sheet-btn primary", "Starten");
      const abbrechen = el("button", "sheet-btn", "Schließen");
      ctx.nodes.timerCancel = el("button", "sheet-btn danger", "Abbrechen");
      knoepfe.append(ctx.nodes.timerCancel, abbrechen, ctx.nodes.timerStart);

      abbrechen.addEventListener("click", (event) => {
        event.stopPropagation();
        renderers.clock._closeSheet(ctx);
      });
      ctx.nodes.timerStart.addEventListener("click", (event) => {
        event.stopPropagation();
        const ziel = ctx.config.timer_entity;
        if (!ziel) return;
        const minuten = Math.max(1, ctx.nodes.minutes || 1);
        ctx.hass?.callService("timer", "start", {
          entity_id: ziel,
          duration: `00:${String(minuten).padStart(2, "0")}:00`,
        });
        renderers.clock._closeSheet(ctx);
      });
      ctx.nodes.timerCancel.addEventListener("click", (event) => {
        event.stopPropagation();
        if (ctx.config.timer_entity) ctx.hass?.callService("timer", "cancel", { entity_id: ctx.config.timer_entity });
        renderers.clock._closeSheet(ctx);
      });

      const inhalt = el("div", "sheet-inner");
      inhalt.append(dial, knoepfe);
      sheet.append(inhalt);

      // Klick auf den Hintergrund schliesst. Der Dialog selbst ist das
      // Ziel nur dann, wenn daneben getroffen wurde - der Inhalt faengt
      // seine eigenen Klicks ab.
      sheet.addEventListener("click", (event) => {
        if (event.target === sheet) renderers.clock._closeSheet(ctx);
      });

      ctx.nodes.sheet = sheet;
      root.append(sheet);

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

        renderers.clock._maybeChime(ctx);
        renderers.clock._paintRemaining(ctx);
      };

      renderers.clock.reconnect(ctx);
      return root;
    },
    /**
     * Oeffnen und Schliessen.
     *
     * `showModal` gibt es nicht ueberall - in der Testumgebung etwa nicht.
     * Dann wird das `open`-Attribut gesetzt; der Dialog erscheint dadurch
     * ohne Top Layer, aber er erscheint.
     */
    _openSheet(ctx) {
      const sheet = ctx.nodes.sheet;
      if (sheet.open) return;
      try {
        sheet.showModal();
      } catch (_error) {
        sheet.open = true;
      }
    },

    _closeSheet(ctx) {
      const sheet = ctx.nodes.sheet;
      if (!sheet.open) return;
      try {
        sheet.close();
      } catch (_error) {
        sheet.open = false;
      }
    },

    /** Restminuten des laufenden Weckers, aufgerundet – fuer den Drehregler. */
    _remaining(ctx) {
      return Math.ceil(renderers.clock._remainingSeconds(ctx) / 60);
    },

    /**
     * Restsekunden.
     *
     * Home Assistant meldet beim Timer nur Start und Ende, nicht jede
     * Sekunde. Der Rest wird deshalb aus `finishes_at` gegen die aktuelle
     * Zeit gerechnet und vom Takt der Uhr fortgeschrieben – sonst stuende
     * die Zahl still, bis irgendwann eine andere Meldung eintrifft.
     *
     * Im angehaltenen Zustand gibt es kein `finishes_at`; dort steht die
     * verbleibende Dauer im Attribut `remaining` als "H:MM:SS".
     */
    _remainingSeconds(ctx) {
      const state = ctx.hass?.states?.[ctx.config.timer_entity];
      if (!state) return 0;

      if (state.state === "paused") {
        const teile = String(state.attributes?.remaining || "").split(":").map(Number);
        if (teile.length === 3 && teile.every(Number.isFinite)) {
          return teile[0] * 3600 + teile[1] * 60 + teile[2];
        }
        return 0;
      }

      if (state.state !== "active") return 0;
      const ende = Date.parse(state.attributes?.finishes_at || "");
      if (!Number.isFinite(ende)) return 0;
      return Math.max(0, Math.round((ende - Date.now()) / 1000));
    },

    /** "12:34" – bei ueber einer Stunde mit Stundenanteil. */
    _formatRemaining(sekunden) {
      const gesamt = Math.max(0, Math.round(sekunden));
      const std = Math.floor(gesamt / 3600);
      const min = Math.floor((gesamt % 3600) / 60);
      const sek = gesamt % 60;
      return std
        ? `${std}:${String(min).padStart(2, "0")}:${String(sek).padStart(2, "0")}`
        : `${min}:${String(sek).padStart(2, "0")}`;
    },

    /** Schreibt die Restzeit in die Karte. Laeuft im Takt der Uhr mit. */
    _paintRemaining(ctx) {
      if (!ctx.nodes.timerLine) return;
      const state = ctx.config.timer_entity ? ctx.hass?.states?.[ctx.config.timer_entity] : null;

      if (state?.state === "active") {
        ctx.nodes.timerLine.textContent = `Wecker ${renderers.clock._formatRemaining(
          renderers.clock._remainingSeconds(ctx)
        )}`;
      } else if (state?.state === "paused") {
        ctx.nodes.timerLine.textContent = `Wecker angehalten · ${renderers.clock._formatRemaining(
          renderers.clock._remainingSeconds(ctx)
        )}`;
      } else {
        ctx.nodes.timerLine.textContent = "";
      }
      ctx.nodes.timerLine.hidden = !ctx.nodes.timerLine.textContent;

      const rest = renderers.clock._remainingSeconds(ctx);
      ctx.nodes.timerLine.classList.toggle("is-soon", rest <= 60 && state?.state === "active");

      // Solange es klingelt, tritt der Stoppknopf an die Stelle des Weckers.
      const klingelt = renderers.clock._isRinging(ctx);
      ctx.nodes.silenceButton.hidden = !klingelt;
      ctx.nodes.timerButton.hidden = klingelt || !ctx.config.timer_entity;
      if (klingelt) {
        ctx.nodes.timerLine.textContent = "Wecker abgelaufen";
        ctx.nodes.timerLine.hidden = false;
        ctx.nodes.timerLine.classList.add("is-soon");
      }

      // Ring: voll bei Start, leer am Ende. Die Gesamtdauer steht in
      // `duration` als "H:MM:SS" – ohne sie liesse sich kein Anteil bilden.
      if (ctx.nodes.timerRing) {
        const teile = String(state?.attributes?.duration || "").split(":").map(Number);
        const gesamt = teile.length === 3 && teile.every(Number.isFinite)
          ? teile[0] * 3600 + teile[1] * 60 + teile[2]
          : 0;
        const anteil = gesamt > 0 ? Math.max(0, Math.min(1, rest / gesamt)) : 0;
        ctx.nodes.timerRing.setAttribute(
          "stroke-dashoffset",
          String(ctx.nodes.timerRingLength * (1 - anteil))
        );
      }
    },

    /**
     * Ton beim Ablaufen.
     *
     * Abgespielt wird im Browser, sobald der Wecker von "active" auf etwas
     * anderes springt. Das trifft nur zu, wenn dieses Geraet gerade
     * hinsieht – laeuft der Wecker ab, waehrend das Tablet aus ist, hoert
     * niemand etwas. Wer den Ton sicher haben will, laesst ihn per
     * Automation auf `timer.finished` ueber einen Lautsprecher ansagen.
     *
     * Der Browser erlaubt Ton erst nach einer Bedienung durch den Anwender.
     * Das ist hier gegeben: den Wecker startet man mit einem Tipp auf
     * dieselbe Seite.
     */
    _maybeChime(ctx) {
      const jetzt = ctx.hass?.states?.[ctx.config.timer_entity]?.state || "";
      const vorher = ctx.nodes.timerPrevState;
      ctx.nodes.timerPrevState = jetzt;

      if (vorher !== "active" || jetzt === "active" || jetzt === "paused") return;

      // Auch ohne eigene Tondatei gilt die Karte als klingelnd, sofern ein
      // Lautsprecher eingetragen ist: dann laeuft der Ton ueber die
      // Automation, und der Knopf soll ihn abstellen koennen.
      ctx.nodes.ringingUntil = Date.now() + 90000;

      if (!ctx.config.sound) return;

      try {
        const ton = new Audio(ctx.config.sound);
        ton.volume = clampNumber(ctx.config.sound_volume, 0, 100, 80) / 100;
        ton.addEventListener?.("ended", () => {
          if (ctx.nodes.audio === ton) ctx.nodes.audio = null;
        });
        ctx.nodes.audio = ton;
        // Ein abgelehntes Abspielen ist kein Fehler, den jemand sehen muss:
        // dann fehlte die Bedienung, oder die Datei gibt es nicht.
        ton.play?.().catch(() => {});
      } catch (_error) {
        /* Kein Ton moeglich. */
      }
    },

    /** Klingelt gerade etwas, das sich abstellen laesst? */
    _isRinging(ctx) {
      if (ctx.nodes.audio) return true;
      if (!ctx.config.sound_player) return false;
      return Date.now() < (ctx.nodes.ringingUntil || 0);
    },

    /** Stellt den Ton ab – im Browser und auf dem Lautsprecher. */
    _silence(ctx) {
      const ton = ctx.nodes.audio;
      if (ton) {
        try {
          ton.pause?.();
          ton.currentTime = 0;
        } catch (_error) {
          /* Schon vorbei. */
        }
        ctx.nodes.audio = null;
      }

      ctx.nodes.ringingUntil = 0;

      if (ctx.config.sound_player) {
        ctx.hass?.callService("media_player", "media_stop", { entity_id: ctx.config.sound_player });
      }

      renderers.clock._paintRemaining(ctx);
    },

    /** Zeichnet den Ring und die Zahl im Fenster. */
    _paintDial(ctx) {
      const minuten = Math.max(0, Math.min(60, ctx.nodes.minutes ?? 5));
      ctx.nodes.timerValue.textContent = String(minuten);
      ctx.nodes.timerUnit.textContent = minuten === 1 ? "Minute" : "Minuten";
      const anteil = minuten / 60;
      ctx.nodes.timerArc.setAttribute(
        "stroke-dashoffset",
        String(ctx.nodes.timerArcLength * (1 - anteil))
      );
    },

    update(ctx) {
      // Kurzzeitwecker: der Knopf erscheint nur, wenn eine Timer-Entitaet
      // gesetzt ist. Ohne sie waere er ein Knopf ohne Wirkung.
      const timer = ctx.config.timer_entity ? ctx.hass?.states?.[ctx.config.timer_entity] : null;
      if (!ctx.config.timer_entity) renderers.clock._closeSheet(ctx);

      const laeuft = timer?.state === "active";
      ctx.nodes.timerCancel.hidden = !laeuft;
      ctx.nodes.timerButton.classList.toggle("is-active", laeuft);

      renderers.clock._paintRemaining(ctx);

      // Die Anzeige läuft über den eigenen Timer. Hier wird nur geprüft, ob
      // die Taktrate wegen der Sekundenanzeige angepasst werden muss.
      // Laeuft ein Wecker, muss die Uhr im Sekundentakt schlagen – sonst
      // springt die Restzeit in Fuenfzehnersaetzen.
      const wanted = ctx.config.show_seconds || laeuft ? 1000 : 15000;
      if (ctx.nodes.interval !== wanted) renderers.clock.reconnect(ctx);
    },
    reconnect(ctx) {
      if (!ctx.nodes.tick) return;
      clearInterval(ctx.nodes.timer);
      ctx.nodes.interval =
        ctx.config.show_seconds || ctx.hass?.states?.[ctx.config.timer_entity]?.state === "active" ? 1000 : 15000;
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
    // `timer_entity` gehoert dazu, sonst erreichen den Wecker keine
    // Zustandsmeldungen: die Uhr hat sonst gar keine Entitaet und wuerde
    // vom Filter komplett uebergangen.
    const ids = [config.entity, config.state_entity, config.timer_entity, ...(config.entities || [])].filter(
      Boolean
    );

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
