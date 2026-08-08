/**
 * HA-OS – Shell-Karte (Grundgerüst)
 *
 * Verantwortlich für: Glasfläche, Seitenleiste, Kopfzeile mit Tabs/Badges/Benutzern,
 * drei Raster, interne Seiten, iFrame-Seiten und die interne Einstellungsseite.
 *
 * WICHTIG – Unterschied zur alten Glass-Shell:
 * Diese Karte baut ihr DOM EINMAL auf und aktualisiert danach nur noch einzelne
 * Knoten. Es gibt bewusst kein `shadowRoot.innerHTML = ...` im Update-Pfad.
 * Die alte Shell hat bei jeder hass-Änderung das komplette DOM inklusive aller
 * Kinderkarten neu erzeugt – dadurch liefen die Ladeschutz-Flags der Kinderkarten
 * ins Leere und die Entity-Registry wurde bei jedem Standort-Update neu geladen.
 */

import { HaOsTheme } from "../shared/theme.js";
import {
  normalizeShellConfig,
  stripHaOsKeys,
  createEmptyGrids,
  SETTINGS_PAGE_ID,
  DEFAULT_GRID_WIDTHS,
} from "../shared/config.js";
import {
  CARD_SURFACE_CSS,
  ENTITY_SURFACE_CSS,
  IMAGE_FIELD_CSS,
  SEGMENTED_CSS,
  createCardElement,
  createSegmented,
  nextFrame,
  createImageField,
  domainIcon,
  formatState,
  friendlyName,
  handleAction,
  isEqualConfig,
  isUnavailable,
  registerCard,
  showMoreInfo,
  statusClass,
} from "../shared/utils.js";

const TAG = "ha-os-shell";
const EDITOR_TAG = "ha-os-shell-editor";

const TOPBAR_HEIGHT = 62;

const STYLES = `
  :host {
    display: block;
    position: relative;
    /* Eigener Stapelkontext.
       Ohne ihn rutscht die Bildschicht (z-index: -1) unter den Hintergrund
       uebergeordneter Elemente - und damit unter ein Hintergrundbild, das
       ein Home-Assistant-Theme setzt. Genau so verschwand das Wallpaper auf
       dem Tablet: sichtbar war HAs Bild, unseres lag darunter.
       Mit isolation gilt das negative z-index nur innerhalb dieser Karte:
       hinter dem Glas, aber vor allem, was HA darunter malt. */
    isolation: isolate;
    margin: var(--haos-margin, 25px);
    width: calc(100% - 2 * var(--haos-margin, 25px));
  }
  * { box-sizing: border-box; }
  button { font: inherit; color: inherit; }

  /* Hintergrundbild.
     Liegt fest hinter dem gesamten Fenster, nicht in der Shell: das Glas soll
     etwas haben, wodurch es hindurchschaut. Eine Flaeche innerhalb der Shell
     waere von ihr selbst verdeckt.
     pointer-events: none, damit die Schicht keine Klicks abfaengt. */
  .wallpaper {
    position: fixed; inset: 0; z-index: -1; pointer-events: none;
    background-image: var(--haos-background-image, none);
    background-size: cover; background-position: center; background-repeat: no-repeat;
  }
  /* In der Vorschau des Karteneditors bleibt das Bild INNERHALB der Karte.
     Mit position:fixed legte es sich sonst hinter den ganzen Dialog - man sah
     Einstellungen auf dem eigenen Hintergrundbild statt auf dem Dialog. */
  .wallpaper.contained { position: absolute; }
  .wallpaper::after {
    content: ""; position: absolute; inset: 0;
    background: rgba(0, 0, 0, var(--haos-background-dim, 0));
  }
  .wallpaper[hidden] { display: none; }

  .shell {
    min-height: var(--haos-shell-height, 480px);
    padding: var(--haos-shell-gap, 16px);
    display: grid;
    gap: var(--haos-shell-gap, 16px);
    grid-template-columns: 72px minmax(0, 1fr);
    grid-template-rows: ${TOPBAR_HEIGHT}px minmax(0, 1fr);
    grid-template-areas: "sidebar topbar" "sidebar content";
    color: var(--haos-text, #fff);
    font-family: var(--haos-font-family);
    font-weight: var(--haos-font-weight-normal, 450);
    border-radius: calc(var(--haos-card-radius, 14px) + 8px);
    overflow: hidden;
    ${CARD_SURFACE_CSS}
  }

  /* ---------- Seitenleiste ---------- */
  .sidebar { grid-area: sidebar; min-width: 0; min-height: 0; ${ENTITY_SURFACE_CSS} }
  .sidebar nav { height: 100%; padding: 7px 6px; display: flex; flex-direction: column; align-items: center; }
  /* Etwas Luft nach beiden Seiten, damit der Rand des aktiven Knopfes nicht
     direkt an der Scroll-Kante klebt. */
  .side-top { width: 100%; flex: 1; min-height: 0; padding: 2px 3px; display: flex; flex-direction: column; align-items: center; gap: 7px; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; }
  .side-top::-webkit-scrollbar { display: none; }
  .side-bottom { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 7px; }
  .side-divider { width: 28px; height: 1px; margin: 3px 0; background: rgba(var(--haos-text-rgb, 255,255,255), .18); }

  .icon-button {
    position: relative; width: 44px; height: 44px; flex: 0 0 44px;
    border: 1px solid transparent; border-radius: 14px;
    display: grid; place-items: center;
    color: rgba(var(--haos-text-rgb, 255,255,255), .68);
    background: transparent; cursor: pointer;
    transition: transform .16s ease, color .16s ease, background .16s ease, box-shadow .16s ease;
  }
  .icon-button:hover { color: var(--haos-text, #fff); background: rgba(var(--haos-text-rgb, 255,255,255), .09); transform: translateY(-1px); }
  .icon-button:active { transform: scale(.96); }
  .icon-button:disabled { opacity: .34; cursor: default; transform: none; }
  .icon-button ha-icon { --mdc-icon-size: 20px; }
  .icon-button.active {
    color: var(--haos-text, #fff);
    border-color: rgba(var(--haos-card-border-rgb, 255,255,255), calc(var(--haos-card-border-opacity, .25) + .20));
    background: linear-gradient(145deg, rgba(var(--haos-card-border-rgb, 255,255,255), .18), rgba(var(--haos-card-surface-rgb, 255,255,255), .07));
    /* Schatten bewusst flach: die Leiste scrollt (overflow-y: auto) und
       schneidet alles ab, was über den aktiven Knopf hinausragt. Ein weiter
       Schlagschatten wirkte dadurch abgeschnitten statt weich. */
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.38),
      inset 0 -10px 22px color-mix(in srgb, var(--haos-accent, #0a84ff) 18%, transparent),
      0 2px 6px rgba(0,0,0,.14),
      0 0 6px color-mix(in srgb, var(--haos-accent, #0a84ff) 16%, transparent);
  }
  .icon-button.active ha-icon { filter: drop-shadow(0 0 5px color-mix(in srgb, var(--haos-accent, #0a84ff) 55%, transparent)); }

  /* ---------- Kopfzeile ---------- */
  .topbar {
    grid-area: topbar; min-width: 0; height: ${TOPBAR_HEIGHT}px;
    padding: 7px 12px; display: flex; align-items: center; gap: 12px;
    ${ENTITY_SURFACE_CSS}
  }
  .tabs { min-width: 0; flex: 1; display: flex; align-items: center; overflow-x: auto; scrollbar-width: none; }
  .tabs::-webkit-scrollbar { display: none; }
  ${SEGMENTED_CSS}
  /* Die Reiter tragen denselben Umschalter wie die Karten, nur groesser. */
  .tabs .haos-seg-option { font-size: 15px; padding: 8px 16px; }

  .badges { flex: 0 0 auto; display: flex; align-items: center; gap: 7px; }
  .badge {
    height: 44px; max-width: 210px; flex: 0 0 auto; padding: 5px 12px 5px 9px;
    display: flex; align-items: center; gap: 8px; cursor: pointer;
    ${ENTITY_SURFACE_CSS}
  }
  .badge.icon-only { width: 44px; padding: 0; justify-content: center; }
  .badge:hover { background: rgba(var(--haos-entity-surface-rgb, 255,255,255), calc(var(--haos-entity-opacity, .10) + .08)); }
  .badge ha-icon { --mdc-icon-size: 19px; }
  .badge .badge-text { min-width: 0; display: grid; text-align: left; }
  .badge b, .badge small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .badge b { font-size: 11px; }
  .badge small { margin-top: 2px; font-size: 9px; color: rgba(var(--haos-text-rgb, 255,255,255), .58); }
  .badge.is-on { box-shadow: var(--haos-entity-shadow), var(--haos-entity-sheen), inset 0 0 24px color-mix(in srgb, var(--haos-status-on, #0a84ff) 28%, transparent); }
  .badge.is-on ha-icon { color: var(--haos-status-on, #0a84ff); filter: drop-shadow(0 0 5px color-mix(in srgb, var(--haos-status-on, #0a84ff) 48%, transparent)); }
  .badge.is-off ha-icon { color: var(--haos-status-off, #a8b0b8); opacity: .72; }
  .badge.is-unavailable { opacity: .68; }
  .badge.is-unavailable ha-icon { color: var(--haos-status-unavailable, #ff6961); }

  .users { flex: 0 0 auto; display: flex; align-items: center; padding-left: 4px; }
  .user {
    position: relative; width: 42px; height: 42px; margin-left: -10px; padding: 3px;
    border: 1px solid rgba(var(--haos-card-border-rgb, 255,255,255), calc(var(--haos-card-border-opacity, .25) + .18));
    border-radius: 50%; overflow: hidden; display: grid; place-items: center; cursor: pointer;
    color: var(--haos-text, #fff);
    background: rgba(var(--haos-card-surface-rgb, 255,255,255), calc(var(--haos-card-opacity, .10) + .14));
    box-shadow: var(--haos-user-shadow);
    backdrop-filter: blur(var(--haos-card-blur, 16px)) saturate(var(--haos-card-saturation, 160%));
    font-size: 11px; font-weight: 800;
  }
  .user:first-child { margin-left: 0; }
  .user img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
  .user .initials { width: 100%; height: 100%; border-radius: 50%; display: grid; place-items: center; background: rgba(var(--haos-entity-surface-rgb, 255,255,255), var(--haos-entity-opacity, .10)); }
  .user.is-home { box-shadow: var(--haos-user-shadow), inset 0 0 0 2px color-mix(in srgb, var(--haos-status-home, #32d583) 72%, transparent), 0 0 12px color-mix(in srgb, var(--haos-status-home, #32d583) 24%, transparent); }
  .user.is-away { opacity: .68; box-shadow: var(--haos-user-shadow), inset 0 0 0 2px color-mix(in srgb, var(--haos-status-away, #f7b955) 58%, transparent); }
  .user.is-unavailable { opacity: .42; filter: saturate(.25); box-shadow: var(--haos-user-shadow), inset 0 0 0 2px color-mix(in srgb, var(--haos-status-unavailable, #ff6961) 62%, transparent); }

  /* ---------- Inhalt ---------- */
  .content { grid-area: content; min-width: 0; min-height: 0; display: grid; }
  .page { grid-area: 1 / 1; min-width: 0; min-height: 0; display: grid; gap: var(--haos-shell-gap, 16px); grid-template-columns: var(--haos-grid-template, 1fr 1.55fr 1.05fr); }
  .page[hidden] { display: none; }
  .grid-column { min-width: 0; min-height: 0; display: grid; gap: var(--haos-shell-gap, 16px); align-content: start; }
  .slot { min-width: 0; min-height: 0; height: var(--slot-height, 125px); }
  .slot > * { display: block; height: 100%; }

  .grid-empty {
    min-height: 90px; display: grid; place-content: center; gap: 8px; text-align: center;
    border: 1px dashed rgba(var(--haos-text-rgb, 255,255,255), .22);
    border-radius: var(--haos-entity-radius, 14px);
    background: rgba(var(--haos-text-rgb, 255,255,255), .035);
    color: rgba(var(--haos-text-rgb, 255,255,255), .5); font-size: 12px;
  }
  .grid-empty ha-icon { margin: auto; --mdc-icon-size: 20px; }

  /* ---------- iFrame-Seite ---------- */
  .frame-page { grid-column: 1 / -1; min-width: 0; min-height: 0; overflow: hidden; ${ENTITY_SURFACE_CSS} }
  /* Ohne feste Höhe füllt der Rahmen die Seite. Ist eine Höhe eingestellt,
     wird er genau so hoch und richtet sich oben aus – die frühere
     frühere Mindesthöhe hätte jede kleinere Angabe überstimmt. */
  .frame-page { align-content: start; }
  .frame-page iframe { width: 100%; height: 100%; min-height: 0; border: 0; display: block; background: #fff; }
  .frame-page.fixed { height: auto; }
  .frame-empty { display: grid; place-content: center; gap: 8px; text-align: center; padding: 40px; color: rgba(var(--haos-text-rgb, 255,255,255), .68); }
  .frame-empty ha-icon { margin: auto; --mdc-icon-size: 30px; }

  /* ---------- Einstellungsseite ---------- */
  .settings { grid-column: 1 / -1; min-width: 0; min-height: 0; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; overflow: hidden; ${ENTITY_SURFACE_CSS} }
  .settings > header, .settings > footer { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
  .settings > header { border-bottom: 1px solid rgba(var(--haos-text-rgb, 255,255,255), .10); }
  .settings > footer { border-top: 1px solid rgba(var(--haos-text-rgb, 255,255,255), .10); }
  .settings .eyebrow { color: var(--haos-accent, #0a84ff); font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
  .settings h2 { margin: 3px 0 0; font-size: 23px; }
  .settings-body { min-height: 0; padding: 16px 20px; display: grid; align-content: start; gap: 14px; overflow-y: auto; overscroll-behavior: contain; }

  .group { border: 1px solid rgba(var(--haos-text-rgb, 255,255,255), .12); border-radius: 15px; overflow: hidden; background: rgba(var(--haos-entity-surface-rgb, 255,255,255), var(--haos-entity-opacity, .10)); }
  .group > button { width: 100%; min-height: 52px; padding: 12px 14px; border: 0; background: transparent; display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; text-align: left; }
  .group > button:hover { background: rgba(var(--haos-text-rgb, 255,255,255), .06); }
  .group h3 { margin: 0; font-size: 13px; }
  .group-body { padding: 0 14px 14px; border-top: 1px solid rgba(var(--haos-text-rgb, 255,255,255), .08); }
  .group-body[hidden] { display: none; }

  .control { min-height: 58px; padding: 9px 4px; display: grid; grid-template-columns: minmax(140px, 1fr) 60px minmax(140px, 1.2fr); align-items: center; gap: 12px; border-top: 1px solid rgba(var(--haos-text-rgb, 255,255,255), .08); }
  .group-body > .control:first-child { border-top: 0; }
  .control.color { grid-template-columns: 1fr 58px; }
  /* Bildauswahl braucht die volle Breite – Vorschau und Uploadfläche passen
     nicht in eine Rasterspalte. */
  .control.stacked { display: grid; grid-template-columns: 1fr; gap: 8px; }
  .control.stacked input.path {
    width: 100%; padding: 8px 10px; font: inherit; font-size: 12px;
    color: var(--haos-text, #fff);
    background: rgba(var(--haos-text-rgb, 255,255,255), .08);
    border: 1px solid rgba(var(--haos-text-rgb, 255,255,255), .16); border-radius: 8px;
  }
  ${IMAGE_FIELD_CSS}
  .control.dimmed { opacity: .45; }
  .switch {
    position: relative; width: 46px; height: 27px; flex: 0 0 46px; justify-self: end;
    border-radius: 999px; cursor: pointer;
    background: rgba(var(--haos-text-rgb, 255,255,255), .18);
    transition: background .18s ease;
  }
  .switch::after {
    content: ""; position: absolute; top: 3px; left: 3px; width: 21px; height: 21px;
    border-radius: 50%; background: #fff; transition: transform .18s ease;
  }
  .switch input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; }
  .switch:has(input:checked) { background: var(--haos-accent, #0a84ff); }
  .switch:has(input:checked)::after { transform: translateX(19px); }
  .control b { display: block; font-size: 12px; }
  .control small { display: block; margin-top: 3px; font-size: 9px; color: rgba(var(--haos-text-rgb, 255,255,255), .53); }
  .control output { text-align: right; font-size: 11px; font-weight: 750; color: rgba(var(--haos-text-rgb, 255,255,255), .82); }
  .control input[type="range"] { width: 100%; accent-color: var(--haos-accent, #0a84ff); }
  /* Farbwähler.
     Der native Farbfleck laesst sich nicht zuverlaessig rund bekommen – die
     Regeln fuer ::-webkit-color-swatch greifen je nach Browserversion nicht,
     dann sitzt ein abgerundetes Quadrat im Kreis. Deshalb wird der Kreis
     selbst gezeichnet und das Bedienelement unsichtbar darübergelegt. Optik
     wie die Knoepfe der Seitenleiste: 44 px, Rand, Glanzkante, Schatten. */
  .swatch {
    position: relative; width: 44px; height: 44px; justify-self: end;
    border-radius: 50%; cursor: pointer;
    border: 1px solid rgba(var(--haos-card-border-rgb, 255,255,255), calc(var(--haos-card-border-opacity, .25) + .18));
    background: var(--swatch-color, #0a84ff);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.42), 0 7px 18px rgba(0,0,0,.15);
    transition: transform .16s ease, box-shadow .16s ease;
  }
  .swatch:hover { transform: translateY(-1px); }
  .swatch:active { transform: scale(.96); }
  .swatch input[type="color"] {
    position: absolute; inset: 0; width: 100%; height: 100%;
    opacity: 0; border: 0; padding: 0; cursor: pointer;
  }

  .settings footer button {
    min-height: 42px; padding: 0 16px; display: flex; align-items: center; gap: 7px; cursor: pointer;
    border: 1px solid rgba(var(--haos-card-border-rgb, 255,255,255), calc(var(--haos-card-border-opacity, .25) + .14));
    border-radius: 14px;
    background: linear-gradient(145deg, rgba(var(--haos-card-border-rgb, 255,255,255), .16), rgba(var(--haos-card-surface-rgb, 255,255,255), .06));
    box-shadow: inset 0 1px 0 rgba(255,255,255,.34), 0 7px 18px rgba(0,0,0,.13);
  }
  .settings footer .primary {
    border-color: color-mix(in srgb, var(--haos-accent, #0a84ff) 34%, rgba(var(--haos-card-border-rgb, 255,255,255), .35));
    background: linear-gradient(145deg, color-mix(in srgb, var(--haos-accent, #0a84ff) 24%, rgba(var(--haos-card-border-rgb, 255,255,255), .13)), color-mix(in srgb, var(--haos-accent, #0a84ff) 12%, rgba(var(--haos-card-surface-rgb, 255,255,255), .05)));
    font-weight: 750;
  }
  .settings footer ha-icon { --mdc-icon-size: 17px; }

  button:focus-visible { outline: 2px solid color-mix(in srgb, var(--haos-accent, #0a84ff) 70%, #fff); outline-offset: 3px; }

  /* ---------- Responsiv ---------- */
  @media (max-width: 1050px) {
    .page { grid-template-columns: 1fr 1fr; }
    .grid-column:nth-child(3) { grid-column: 1 / -1; }
  }
  @media (max-width: 720px) {
    :host { margin: 8px; width: calc(100% - 16px); }
    .shell { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto auto; grid-template-areas: "topbar" "sidebar" "content"; }
    .sidebar nav { flex-direction: row; padding: 5px 7px; }
    .side-top { flex-direction: row; overflow-x: auto; overflow-y: hidden; }
    .side-bottom { width: auto; flex-direction: row; }
    .side-divider { width: 1px; height: 28px; margin: 0 3px; }
    .icon-button { width: 38px; height: 38px; flex-basis: 38px; border-radius: 11px; }
    .page { grid-template-columns: minmax(0, 1fr); }
    .grid-column:nth-child(3) { grid-column: auto; }
    .badge .badge-text { display: none; }
    .badge { width: 42px; padding: 0; justify-content: center; }
  }
`;

const THEME_CONTROLS = [
  {
    group: "general",
    key: "follow_ha",
    label: "Farben von Home Assistant",
    hint: "Akzent, Text, Statusfarben und Hintergrund folgen dem HA-Theme. Glas bleibt hier einstellbar.",
    type: "switch",
  },
  { group: "general", key: "accent", label: "Akzentfarbe", hint: "Aktive Elemente", type: "color" },
  { group: "general", key: "margin", label: "Außenabstand", hint: "Abstand um die Shell", min: 0, max: 60, step: 1, unit: "px" },
  // Gilt für alle Karten: sämtliche Beschriftungen und Werte leiten ihre
  // Abstufungen von dieser einen Farbe ab.
  { group: "general", key: "textDark", label: "Textfarbe Dunkel", hint: "Schrift im dunklen Modus", type: "color" },
  { group: "general", key: "textLight", label: "Textfarbe Hell", hint: "Schrift im hellen Modus", type: "color" },
  // Getrennt für Hell und Dunkel: ein Grün, das auf dunklem Glas leuchtet,
  // ist auf hellem nicht mehr zu lesen. Genau daran ist der frühere feste
  // Wert gescheitert.
  { group: "status", key: "statusGoodDark", label: "Aktiv · Dunkel", hint: "„ok“, „verriegelt“, „geschlossen“", type: "color" },
  { group: "status", key: "statusGoodLight", label: "Aktiv · Hell", hint: "Dieselben Zustände im hellen Modus", type: "color" },
  { group: "status", key: "statusOffDark", label: "Inaktiv · Dunkel", hint: "Ausgeschaltet, ohne Meldung", type: "color" },
  { group: "status", key: "statusOffLight", label: "Inaktiv · Hell", hint: "Dieselben Zustände im hellen Modus", type: "color" },
  { group: "status", key: "statusBadDark", label: "Nicht erreichbar · Dunkel", hint: "Warnung, offen, Fehler", type: "color" },
  { group: "status", key: "statusBadLight", label: "Nicht erreichbar · Hell", hint: "Dieselben Zustände im hellen Modus", type: "color" },
  { group: "background", key: "backgroundDark", label: "Bild für Dunkel", hint: "Hintergrund im dunklen Modus", type: "image" },
  { group: "background", key: "backgroundLight", label: "Bild für Hell", hint: "Hintergrund im hellen Modus", type: "image" },
  { group: "background", key: "backgroundDim", label: "Abdunkeln", hint: "Schwarze Schicht über dem Bild", min: 0, max: 80, step: 1, unit: "%" },
  { group: "card", key: "cardSurface", label: "Grundfarbe", hint: "Farbe der Glasfläche", type: "color" },
  { group: "card", key: "cardOpacity", label: "Transparenz", hint: "Hintergrundkarte", min: 0, max: 95, step: 1, unit: "%" },
  { group: "card", key: "cardBlur", label: "Unschärfe", hint: "Hintergrundkarte", min: 0, max: 50, step: 1, unit: "px" },
  { group: "card", key: "cardSaturation", label: "Sättigung", hint: "Hintergrundkarte", min: 50, max: 240, step: 5, unit: "%" },
  { group: "card", key: "cardRadius", label: "Rundung", hint: "Hintergrundkarte", min: 0, max: 48, step: 1, unit: "px" },
  { group: "card", key: "cardBorder", label: "Rahmenfarbe", hint: "Kontur", type: "color" },
  { group: "card", key: "cardBorderOpacity", label: "Rahmenstärke", hint: "Hintergrundkarte", min: 0, max: 80, step: 1, unit: "%" },
  { group: "card", key: "cardSheen", label: "Glanz", hint: "Helle Kante oben, Schimmer über der Fläche", min: 0, max: 100, step: 1, unit: "%" },
  { group: "entity", key: "entitySurface", label: "Grundfarbe", hint: "Farbe der Kartenfläche", type: "color" },
  { group: "entity", key: "entityOpacity", label: "Transparenz", hint: "Entitätskarte", min: 0, max: 95, step: 1, unit: "%" },
  { group: "entity", key: "entityBlur", label: "Unschärfe", hint: "Entitätskarte", min: 0, max: 50, step: 1, unit: "px" },
  { group: "entity", key: "entitySaturation", label: "Sättigung", hint: "Entitätskarte", min: 50, max: 240, step: 5, unit: "%" },
  { group: "entity", key: "entityRadius", label: "Rundung", hint: "Entitätskarte", min: 0, max: 48, step: 1, unit: "px" },
  { group: "entity", key: "entityBorder", label: "Rahmenfarbe", hint: "Kontur", type: "color" },
  { group: "entity", key: "entityBorderOpacity", label: "Rahmenstärke", hint: "Entitätskarte", min: 0, max: 80, step: 1, unit: "%" },
  { group: "entity", key: "entitySheen", label: "Glanz", hint: "Helle Kante oben, Schimmer über der Fläche", min: 0, max: 100, step: 1, unit: "%" },
];

const GROUP_TITLES = {
  general: "Allgemein",
  status: "Statusfarben",
  background: "Hintergrundbild",
  card: "Hintergrundkarte",
  entity: "Entitätskarten",
};

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const iconEl = (icon) => {
  const node = document.createElement("ha-icon");
  node.setAttribute("icon", icon);
  return node;
};

class HaOsShell extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this._config = null;
    this._hass = null;
    this._built = false;
    this._activePageId = "home";
    this._returnPageId = "home";
    this._fullscreenOptimistic = undefined;
    this._openGroups = new Set(["general"]);

    /** pageId -> { root, columns: [HTMLElement], entries: [{config, element, wrapper}] } */
    this._pages = new Map();
    /** badgeId -> { root, icon, name, state } */
    this._badges = new Map();
    /** entityId -> { root } */
    this._users = new Map();
    /** pageId -> tab button */
    this._tabs = new Map();

    this._frameObservers = new Set();

    this._onThemeChanged = () => {
      // Nur die Einstellungsseite muss auf Theme-Änderungen reagieren – alles
      // andere hängt an CSS-Variablen und aktualisiert sich von selbst.
      this._syncMetrics();
      if (this._activePageId === SETTINGS_PAGE_ID) this._syncSettingsValues();
    };
    this._onKeyDown = (event) => {
      if (event.key === "Escape" && this._activePageId === SETTINGS_PAGE_ID) this._closeSettings();
    };
  }

  // ---------------------------------------------------------------- Lovelace

  static getConfigElement() {
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig() {
    return {
      type: `custom:${TAG}`,
      gap: 16,
      row_height: 125,
      pages: [{ id: "home", name: "Home", icon: "mdi:home", grid_widths: DEFAULT_GRID_WIDTHS, grids: createEmptyGrids() }],
    };
  }

  connectedCallback() {
    window.addEventListener("haos-theme-changed", this._onThemeChanged);
    window.addEventListener("keydown", this._onKeyDown);
    this._syncWallpaperScope();
  }

  /**
   * Steckt die Karte in einer Vorschau des Karteneditors?
   *
   * Der Weg nach oben führt durch Shadow-Grenzen, deshalb wird bei jedem
   * Wurzelknoten auf dessen `host` gewechselt. Gesucht sind HAs
   * Vorschau-Elemente – findet sich eines, bleibt das Hintergrundbild
   * innerhalb der Karte.
   */
  _inPreview() {
    const marker = ["HUI-CARD-PREVIEW", "HUI-DIALOG-EDIT-CARD", "HUI-CARD-ELEMENT-EDITOR"];
    let node = this;
    for (let step = 0; step < 40 && node; step += 1) {
      if (node.tagName && marker.includes(node.tagName)) return true;
      node = node.parentNode?.host || node.parentNode || node.host;
    }
    return false;
  }

  _syncWallpaperScope() {
    if (!this._wallpaper) return;
    this._wallpaper.classList.toggle("contained", this._inPreview());
  }

  disconnectedCallback() {
    window.removeEventListener("haos-theme-changed", this._onThemeChanged);
    window.removeEventListener("keydown", this._onKeyDown);
    this._disconnectFrameObservers();
  }

  setConfig(config) {
    const next = normalizeShellConfig(config);
    const previous = this._config;
    this._config = next;

    if (!this._built) this._build();

    if (!next.pages.some((page) => page.id === this._activePageId) && this._activePageId !== SETTINGS_PAGE_ID) {
      this._activePageId = next.pages[0]?.id || "home";
    }

    // Vorgaben aus der Karte an das Theme reichen – sie greifen dort, wo auf
    // diesem Geraet nichts Eigenes eingestellt ist.
    HaOsTheme.setFallbacks(next);

    this._syncSidebar();
    this._syncTabs();
    this._dropRemovedPages(previous);
    this._syncActivePage();
    this._syncMetrics();
    this._updateStates();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (!this._built) return;

    // Die eigene Kopfzeile nur aktualisieren, wenn sich eine Entität geändert
    // hat, die hier auch wirklich angezeigt wird.
    if (first || this._watchedChanged(hass)) this._updateStates();

    // hass IMMER durchreichen – die Kinderkarten filtern selbst.
    this._pages.forEach((page) => {
      page.entries.forEach((entry) => {
        if (entry.element) entry.element.hass = hass;
      });
    });
  }

  get hass() {
    return this._hass;
  }

  /** Entitäten, die in Seitenleiste, Badges und Benutzerleiste vorkommen. */
  _watchedEntities() {
    const users = this._config.users.length
      ? this._config.users
      : Object.keys(this._hass?.states || {}).filter((id) => id.startsWith("person."));

    const badges = (this._activePage()?.badges || []).filter((badge) => badge.entity).map((badge) => badge.entity);
    const actions = this._config.quick_actions.filter((action) => action.entity).map((action) => action.entity);
    const fullscreen = this._config.fullscreen_entity ? [this._config.fullscreen_entity] : [];

    return [...users, ...badges, ...actions, ...fullscreen];
  }

  _watchedChanged(hass) {
    const watched = this._watchedEntities();
    const previous = this._lastStates;
    const current = new Map(watched.map((id) => [id, hass?.states?.[id]]));
    this._lastStates = current;

    if (!previous || previous.size !== current.size) return true;
    for (const [id, state] of current) {
      if (previous.get(id) !== state) return true;
    }
    return false;
  }

  /** Höhe in HA-Section-Rasterzeilen, damit die Shell mit den Karten wächst. */
  getCardSize() {
    return Math.max(4, Math.ceil(this._measureHeight() / 60));
  }

  getGridOptions() {
    return { rows: this.getCardSize(), columns: "full", min_rows: 6, min_columns: 6 };
  }

  getLayoutOptions() {
    return { grid_rows: this.getCardSize(), grid_columns: "full" };
  }

  // ---------------------------------------------------------------- Aufbau

  _build() {
    const style = document.createElement("style");
    style.textContent = STYLES;

    this._shell = el("section", "shell");

    this._sidebar = el("aside", "sidebar");
    this._sidebarNav = el("nav");
    this._sidebarNav.setAttribute("aria-label", "Seitenleiste");
    this._sideTop = el("div", "side-top");
    this._sideBottom = el("div", "side-bottom");
    this._sidebarNav.append(this._sideTop, this._sideBottom);
    this._sidebar.append(this._sidebarNav);

    this._topbar = el("header", "topbar");
    this._tabList = el("div", "tabs");
    this._tabList.setAttribute("role", "tablist");
    this._badgeList = el("div", "badges");
    this._userList = el("div", "users");
    this._userList.setAttribute("aria-label", "Personen");
    this._topbar.append(this._tabList, this._badgeList, this._userList);

    this._content = el("main", "content");

    this._wallpaper = el("div", "wallpaper");
    this._wallpaper.setAttribute("aria-hidden", "true");

    this._shell.append(this._sidebar, this._topbar, this._content);
    this.shadowRoot.append(style, this._wallpaper, this._shell);
    this._built = true;
    this._syncWallpaperScope();
  }

  // ---------------------------------------------------------------- Seitenleiste

  _syncSidebar() {
    const config = this._config;

    this._sideTop.replaceChildren();

    // Seiten als Symbolliste. Die Reiter oben bleiben davon unberührt – wer
    // viele Seiten hat, kommt über die Leiste schneller hin, ohne dass die
    // Kopfzeile überläuft.
    this._sidebarPages = new Map();
    if (config.sidebar_pages) {
      config.pages.forEach((page) => {
        const button = el("button", "icon-button");
        button.title = page.name;
        button.setAttribute("aria-label", page.name);
        button.append(iconEl(page.icon || "mdi:view-dashboard-outline"));
        button.addEventListener("click", () => this._selectPage(page.id));
        this._sidebarPages.set(page.id, button);
        this._sideTop.append(button);
      });
      if (config.pages.length && config.quick_actions.length) {
        this._sideTop.append(el("div", "side-divider"));
      }
    }

    // Schnellaktionen
    this._quickActions = new Map();
    config.quick_actions.forEach((action) => {
      const button = el("button", "icon-button");
      button.title = action.name || action.entity || "Aktion";
      button.append(iconEl(action.icon));
      button.addEventListener("click", () => handleAction(this, this._hass, action.tap_action, action.entity));
      this._quickActions.set(action.id, { root: button, action });
      this._sideTop.append(button);
    });

    // Systemknöpfe
    this._sideBottom.replaceChildren();
    if (config.quick_actions.length) this._sideBottom.append(el("div", "side-divider"));

    if (config.show_settings_button) {
      this._settingsButton = el("button", "icon-button");
      this._settingsButton.title = "Systemeinstellungen";
      this._settingsButton.append(iconEl("mdi:cog-outline"));
      this._settingsButton.addEventListener("click", () => this._toggleSettings());
      this._sideBottom.append(this._settingsButton);
    } else {
      this._settingsButton = null;
    }

    if (config.fullscreen_entity) {
      this._fullscreenButton = el("button", "icon-button");
      this._fullscreenButton.append(iconEl("mdi:fullscreen"));
      this._fullscreenButton.addEventListener("click", () => this._toggleFullscreen());
      this._sideBottom.append(this._fullscreenButton);
    } else {
      this._fullscreenButton = null;
    }

    if (config.show_theme_button) {
      this._themeButton = el("button", "icon-button");
      this._themeButton.append(iconEl("mdi:white-balance-sunny"));
      this._themeButton.addEventListener("click", () => this._toggleMode());
      this._sideBottom.append(this._themeButton);
    } else {
      this._themeButton = null;
    }
  }

  /**
   * Hell/Dunkel umschalten.
   *
   * Wenn die Farben von Home Assistant kommen, muss der Knopf auch **dort**
   * umschalten – sonst aendert er nichts Sichtbares mehr: HA-OS wuerde
   * weiterhin die Farben eines hellen HA-Themes anzeigen, waehrend es sich
   * selbst fuer dunkel haelt.
   *
   * `frontend.set_theme` mit `mode` ist der einzige Weg von aussen. Der Name
   * des Themes bleibt unangetastet; ohne ihn faellt Home Assistant auf seine
   * Vorgabe zurueck und der Anwender verlaere sein gewaehltes Theme.
   */
  _toggleMode() {
    HaOsTheme.toggleMode();

    if (!HaOsTheme.get().follow_ha || !this._hass?.callService) return;

    const mode = HaOsTheme.get().mode === "light" ? "light" : "dark";
    const name = this._hass.themes?.theme || "Backend-selected";
    this._hass.callService("frontend", "set_theme", { name, mode });
  }

  // ---------------------------------------------------------------- Tabs

  /**
   * Reiter als Segmentumschalter – dieselbe Optik wie in den Karten.
   *
   * Der Umschalter wird bei einer Strukturaenderung neu gebaut, nicht bei
   * jedem Seitenwechsel: dort wandert nur die Pille. Sonst spraenge sie
   * statt zu gleiten.
   */
  _syncTabs() {
    this._tabList.replaceChildren();
    this._tabs.clear();
    this._tabSeg = null;

    if (!this._config.topbar_tabs) return;

    this._tabSeg = createSegmented({
      options: this._config.pages.map((page) => ({ value: page.id, label: page.name })),
      value: this._activePageId,
      ariaLabel: "Seiten",
      onChange: (pageId) => this._selectPage(pageId),
    });
    this._tabList.append(this._tabSeg.element);

    // Die Pille braucht die Breiten der Knoepfe – die stehen erst nach dem
    // Einhaengen fest.
    nextFrame(() => this._tabSeg?.place());
  }

  // ---------------------------------------------------------------- Seiten

  _dropRemovedPages(previousConfig) {
    if (!previousConfig) return;
    const validIds = new Set([...this._config.pages.map((page) => page.id), SETTINGS_PAGE_ID]);
    [...this._pages.keys()].forEach((pageId) => {
      if (validIds.has(pageId)) return;
      this._pages.get(pageId)?.root.remove();
      this._pages.delete(pageId);
    });
  }

  _selectPage(pageId) {
    if (pageId === this._activePageId) return;
    if (pageId !== SETTINGS_PAGE_ID && !this._config.pages.some((page) => page.id === pageId)) return;
    this._activePageId = pageId;
    this._syncActivePage();
    this._syncMetrics();
    this._updateStates();
  }

  _syncActivePage() {
    const activeId = this._activePageId;

    if (activeId === SETTINGS_PAGE_ID) this._ensureSettingsPage();
    else this._ensurePage(this._config.pages.find((page) => page.id === activeId));

    // Sichtbarkeit umschalten – die Knoten bleiben erhalten, damit Kinderkarten
    // ihren Zustand (geladene Registry, History-Cache) über Seitenwechsel behalten.
    this._pages.forEach((entry, pageId) => {
      entry.root.hidden = pageId !== activeId;
    });

    this._tabSeg?.update(activeId);
    this._sidebarPages?.forEach((button, pageId) => button.classList.toggle("active", pageId === activeId));
    this._settingsButton?.classList.toggle("active", activeId === SETTINGS_PAGE_ID);

    this._syncBadges();
  }

  _ensurePage(page) {
    if (!page) return;

    let entry = this._pages.get(page.id);
    if (!entry) {
      const root = el("div", "page");
      root.dataset.pageId = page.id;
      entry = { root, columns: [], entries: [], kind: null };
      this._pages.set(page.id, entry);
      this._content.append(root);
    }

    if (page.kind === "iframe") {
      this._buildFramePage(entry, page);
      return;
    }

    // Von iFrame zurück auf Raster gewechselt
    if (entry.kind !== "page") {
      entry.root.replaceChildren();
      entry.columns = [];
      entry.entries = [];
      entry.kind = "page";
    }

    // Die Anzahl der Spalten ist je Seite einstellbar. Vorhandene Spalten
    // bleiben stehen – nur die Differenz wird angelegt oder entfernt, damit
    // beim Ändern nicht alle Kinderkarten neu entstehen.
    const wantedColumns = page.grids.length;
    while (entry.columns.length < wantedColumns) {
      const column = el("section", "grid-column");
      entry.root.append(column);
      entry.columns.push(column);
    }
    while (entry.columns.length > wantedColumns) {
      entry.columns.pop()?.remove();
    }

    entry.root.style.setProperty(
      "--haos-grid-template",
      page.grid_widths.map((width) => `minmax(0, ${width}fr)`).join(" ")
    );

    this._syncPageCards(entry, page);
  }

  /**
   * Gleicht die Kinderkarten einer Seite ab.
   *
   * Karten mit unveränderter Konfiguration werden WIEDERVERWENDET. Nur wirklich
   * geänderte oder neue Karten werden erzeugt. Dadurch verliert eine Änderung an
   * Karte 3 nicht den Zustand von Karte 1 und 2.
   */
  _syncPageCards(entry, page) {
    const wanted = [];
    page.grids.forEach((grid, columnIndex) => {
      grid.cards.forEach((cardConfig, cardIndex) => {
        wanted.push({ columnIndex, cardIndex, config: cardConfig });
      });
    });

    const previous = entry.entries;
    const next = [];

    wanted.forEach((item) => {
      const key = `${item.columnIndex}:${item.cardIndex}`;
      const existing = previous.find((candidate) => candidate.key === key);
      const cleanConfig = stripHaOsKeys(item.config);

      if (existing && isEqualConfig(existing.cleanConfig, cleanConfig)) {
        existing.wrapper.style.setProperty("--slot-height", `${this._slotHeight(item.config)}px`);
        next.push(existing);
        return;
      }

      if (existing) {
        existing.wrapper.remove();
      }

      const wrapper = el("div", "slot");
      wrapper.style.setProperty("--slot-height", `${this._slotHeight(item.config)}px`);

      const record = { key, config: item.config, cleanConfig, wrapper, element: null };
      next.push(record);

      createCardElement(cleanConfig)
        .then((element) => {
          // Zwischenzeitlich erneut geändert? Dann verwerfen.
          if (!entry.entries.includes(record)) return;
          record.element = element;
          if (this._hass) element.hass = this._hass;
          wrapper.replaceChildren(element);
        })
        .catch((error) => {
          wrapper.replaceChildren(el("div", "grid-empty", `Karte konnte nicht geladen werden: ${error?.message || error}`));
        });
    });

    // Nicht mehr benötigte Karten entfernen
    previous.forEach((record) => {
      if (!next.includes(record)) record.wrapper.remove();
    });

    entry.entries = next;

    // Karten in ihre Spalten einsortieren
    entry.columns.forEach((column, columnIndex) => {
      const slots = wanted
        .map((item, position) => ({ item, record: next[position] }))
        .filter(({ item }) => item.columnIndex === columnIndex)
        .map(({ record }) => record.wrapper);

      if (!slots.length) {
        const placeholder = el("div", "grid-empty");
        placeholder.append(iconEl("mdi:plus"), el("span", null, "Noch keine Karte"));
        column.replaceChildren(placeholder);
        return;
      }
      column.replaceChildren(...slots);
    });
  }

  _slotHeight(cardConfig) {
    return Math.round((Number(cardConfig.haos_weight) || 1) * this._config.row_height);
  }

  // ---------------------------------------------------------------- iFrame

  _buildFramePage(entry, page) {
    entry.root.replaceChildren();
    entry.columns = [];
    entry.entries = [];
    entry.kind = "iframe";

    const container = el("section", "frame-page");

    if (!page.url) {
      const empty = el("div", "frame-empty");
      empty.append(
        iconEl("mdi:web-off"),
        el("strong", null, "Noch keine Adresse eingetragen"),
        el("span", null, "Die URL wird im Editor unter „Seiten“ konfiguriert.")
      );
      container.append(empty);
      entry.root.append(container);
      return;
    }

    const frame = document.createElement("iframe");
    frame.src = /^https?:\/\//i.test(page.url) || page.url.startsWith("/") ? page.url : `https://${page.url}`;
    frame.title = page.name;
    frame.setAttribute("loading", "eager");
    frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");

    if (page.frame_height) {
      container.classList.add("fixed");
      frame.style.height = `${page.frame_height}px`;
    }

    container.append(frame);
    entry.root.append(container);

    if (page.hide_ha_chrome && this._isInternalUrl(frame.src)) {
      frame.addEventListener("load", () => this._applyKiosk(frame));
    }
  }

  _isInternalUrl(url) {
    try {
      return new URL(url, window.location.href).origin === window.location.origin;
    } catch (_error) {
      return false;
    }
  }

  _disconnectFrameObservers() {
    this._frameObservers.forEach((observer) => observer.disconnect());
    this._frameObservers.clear();
  }

  /** Blendet Kopfzeile und Seitenleiste in einem HA-internen iFrame aus. */
  _applyKiosk(frame) {
    let doc;
    try {
      doc = frame.contentDocument;
    } catch (_error) {
      return;
    }
    if (!doc?.documentElement || typeof MutationObserver === "undefined") return;

    // `.header` ist der entscheidende Eintrag: Home Assistant nennt die
    // Kopfzeile einer Lovelace-Ansicht heute so, nicht mehr `app-header`.
    // Ohne ihn blieb oben ein Streifen mit den Bearbeiten-Symbolen stehen.
    // Dasselbe Ziel verfolgt kiosk-mode mit derselben Klasse.
    const css = `
      :host { --app-drawer-width: 0px !important; --ha-sidebar-width: 0px !important; --header-height: 0px !important; }
      ha-sidebar, app-header, ha-menu-button, [slot="app-header"],
      .header, .toolbar, app-toolbar, ha-top-app-bar-fixed .mdc-top-app-bar { display: none !important; }
      #main, #content, main, .mdc-drawer-app-content { margin-left: 0 !important; padding-top: 0 !important; }
      hui-view, #view { padding-top: 0 !important; }
    `;

    const seen = new WeakSet();
    const refresh = (root) => {
      if (!root?.querySelectorAll) return;
      if (!root.querySelector?.("style[data-haos-kiosk]")) {
        const style = doc.createElement("style");
        style.dataset.haosKiosk = "true";
        style.textContent = css;
        (root === doc ? doc.head || doc.documentElement : root).append?.(style);
      }
      root.querySelectorAll("ha-sidebar, app-header, ha-menu-button, .header, .toolbar, app-toolbar").forEach((node) =>
        node.style.setProperty("display", "none", "important")
      );
      root.querySelectorAll("*").forEach((node) => node.shadowRoot && observe(node.shadowRoot));
    };
    const observe = (root) => {
      if (seen.has(root)) return;
      seen.add(root);
      refresh(root);
      const observer = new MutationObserver(() => refresh(root));
      observer.observe(root, { childList: true, subtree: true });
      this._frameObservers.add(observer);
    };

    doc.documentElement.dataset.haosKiosk = "true";
    observe(doc);
  }

  // ---------------------------------------------------------------- Zustände

  /** Aktualisiert NUR Text, Klassen und Attribute. Erzeugt keine Karten neu. */
  _updateStates() {
    if (!this._built || !this._config) return;
    this._updateBadgeStates();
    this._updateUsers();
    this._updateFullscreenButton();
    this._updateThemeButton();
    this._updateQuickActions();
  }

  _activePage() {
    return this._config.pages.find((page) => page.id === this._activePageId);
  }

  _syncBadges() {
    const page = this._activePage();
    const badges = page?.badges || [];

    this._badgeList.replaceChildren();
    this._badges.clear();

    badges.forEach((badge) => {
      const root = el("button", "badge");
      const icon = iconEl(badge.icon || "mdi:circle-outline");
      root.append(icon);

      let name = null;
      let state = null;
      if (badge.show_state || badge.name) {
        const text = el("div", "badge-text");
        name = el("b");
        text.append(name);
        if (badge.show_state) {
          state = el("small");
          text.append(state);
        }
        root.append(text);
      } else {
        root.classList.add("icon-only");
      }

      root.addEventListener("click", () => handleAction(this, this._hass, badge.tap_action, badge.entity));
      this._badges.set(badge.id, { root, icon, name, state, badge });
      this._badgeList.append(root);
    });

    this._updateBadgeStates();
  }

  _updateBadgeStates() {
    this._badges.forEach(({ root, icon, name, state, badge }) => {
      if (badge.kind === "link") {
        root.classList.remove("is-on", "is-off", "is-unavailable");
        if (name) name.textContent = badge.name || "Link";
        if (state) state.textContent = "Öffnen";
        root.title = badge.name || badge.url || "Link";
        return;
      }

      const entityState = this._hass?.states?.[badge.entity];
      const label = badge.name || friendlyName(badge.entity, entityState);

      root.classList.remove("is-on", "is-off", "is-unavailable");
      root.classList.add(statusClass(entityState));
      icon.setAttribute("icon", badge.icon || domainIcon(badge.entity, entityState));
      if (name) name.textContent = label;
      if (state) state.textContent = formatState(this._hass, badge.entity);
      root.title = label;
    });
  }

  _updateQuickActions() {
    this._quickActions?.forEach(({ root, action }) => {
      if (!action.entity) return;
      const state = this._hass?.states?.[action.entity];
      root.classList.toggle("active", statusClass(state) === "is-on");
    });
  }

  _updateUsers() {
    const ids = this._config.users.length
      ? this._config.users
      : Object.keys(this._hass?.states || {}).filter((id) => id.startsWith("person."));

    // Knoten nur anlegen/entfernen, wenn sich die Liste ändert.
    const currentIds = [...this._users.keys()];
    if (currentIds.join("|") !== ids.join("|")) {
      this._userList.replaceChildren();
      this._users.clear();
      ids.forEach((id) => {
        const root = el("button", "user");
        root.addEventListener("click", () => showMoreInfo(this, id));
        this._users.set(id, { root, picture: null });
        this._userList.append(root);
      });
    }

    this._users.forEach((record, id) => {
      const state = this._hass?.states?.[id];
      const name = friendlyName(id, state);
      const picture = state?.attributes?.entity_picture || "";

      // Benutzericons bleiben IMMER sichtbar – nur Farbe und Deckkraft ändern sich.
      const status = isUnavailable(state) ? "unavailable" : state.state === "home" ? "home" : "away";
      record.root.classList.remove("is-home", "is-away", "is-unavailable");
      record.root.classList.add(`is-${status}`);
      record.root.title = `${name} · ${
        { home: "Zuhause", away: "Abwesend", unavailable: "Nicht erreichbar" }[status]
      }`;

      if (picture !== record.picture) {
        record.picture = picture;
        if (picture) {
          const img = document.createElement("img");
          img.src = picture;
          img.alt = "";
          record.root.replaceChildren(img);
        } else {
          const initials = String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("");
          record.root.replaceChildren(el("span", "initials", initials.toUpperCase() || "?"));
        }
      } else if (!picture) {
        const initials = String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("");
        const span = record.root.querySelector(".initials");
        if (span) span.textContent = initials.toUpperCase() || "?";
      }
    });
  }

  _updateFullscreenButton() {
    if (!this._fullscreenButton) return;
    const state = this._hass?.states?.[this._config.fullscreen_entity];
    if (this._fullscreenOptimistic !== undefined && state?.state === (this._fullscreenOptimistic ? "on" : "off")) {
      this._fullscreenOptimistic = undefined;
    }
    const active = this._fullscreenOptimistic ?? state?.state === "on";
    this._fullscreenButton.disabled = !state;
    this._fullscreenButton.classList.toggle("active", Boolean(active));
    this._fullscreenButton.title = active ? "Vollbild beenden" : "Vollbild aktivieren";
    this._fullscreenButton.querySelector("ha-icon")?.setAttribute("icon", active ? "mdi:fullscreen-exit" : "mdi:fullscreen");
  }

  _updateThemeButton() {
    if (!this._themeButton) return;
    const dark = HaOsTheme.get().mode === "dark";
    this._themeButton.title = dark ? "Helles Design aktivieren" : "Dunkles Design aktivieren";
    this._themeButton.querySelector("ha-icon")?.setAttribute("icon", dark ? "mdi:white-balance-sunny" : "mdi:weather-night");
  }

  _toggleFullscreen() {
    const entityId = this._config.fullscreen_entity;
    const state = this._hass?.states?.[entityId];
    if (!state) return;
    this._fullscreenOptimistic = !(this._fullscreenOptimistic ?? state.state === "on");
    this._updateFullscreenButton();
    Promise.resolve(this._hass.callService("input_boolean", "toggle", { entity_id: entityId })).catch(() => {
      this._fullscreenOptimistic = undefined;
      this._updateFullscreenButton();
    });
  }

  // ---------------------------------------------------------------- Maße

  _measureHeight() {
    if (!this._config) return 480;

    if (this._activePageId === SETTINGS_PAGE_ID) return Math.max(720, Math.round((window.innerHeight || 900) - 150));

    const page = this._activePage();
    if (!page) return 480;
    if (page.kind === "iframe") return Math.max(720, Math.round((window.innerHeight || 900) - 150));

    const gap = this._config.gap;
    const columnHeights = page.grids.map((grid) => {
      if (!grid.cards.length) return 0;
      const cards = grid.cards.reduce((sum, card) => sum + this._slotHeight(card), 0);
      return cards + (grid.cards.length - 1) * gap;
    });

    const content = Math.max(360, ...columnHeights);
    return TOPBAR_HEIGHT + gap * 3 + content;
  }

  _syncMetrics() {
    if (!this._built || !this._config) return;
    const height = this._measureHeight();
    this._shell.style.setProperty("--haos-shell-height", `${height}px`);
    this._shell.style.setProperty("--haos-shell-gap", `${this._config.gap}px`);
    this.dispatchEvent(new CustomEvent("card-size-changed", { bubbles: true, composed: true }));
  }

  // ---------------------------------------------------------------- Einstellungen

  _toggleSettings() {
    if (this._activePageId === SETTINGS_PAGE_ID) this._closeSettings();
    else this._openSettings();
  }

  _openSettings() {
    this._returnPageId = this._activePageId;
    this._selectPage(SETTINGS_PAGE_ID);
  }

  _closeSettings() {
    const target = this._config.pages.some((page) => page.id === this._returnPageId) ? this._returnPageId : "home";
    this._selectPage(target);
  }

  _ensureSettingsPage() {
    if (this._pages.has(SETTINGS_PAGE_ID)) {
      this._syncSettingsValues();
      return;
    }

    const root = el("div", "page");
    root.dataset.pageId = SETTINGS_PAGE_ID;

    const section = el("section", "settings");

    const header = document.createElement("header");
    const titleBox = el("div");
    titleBox.append(el("span", "eyebrow", "HA-OS"), el("h2", null, "Systemeinstellungen"));
    const backButton = el("button", "icon-button");
    backButton.append(iconEl("mdi:arrow-left"));
    backButton.title = "Zurück";
    backButton.addEventListener("click", () => this._closeSettings());
    header.append(titleBox, backButton);

    const body = el("div", "settings-body");
    this._settingsInputs = new Map();
    this._settingsPaths = new Map();
    this._settingsImages = new Map();
    this._settingsSwitches = new Map();

    // Aus GROUP_TITLES ableiten statt fest verdrahtet – eine neue Gruppe in
    // THEME_CONTROLS erschien sonst nirgends, ohne dass es auffiel.
    Object.keys(GROUP_TITLES).forEach((groupId) => {
      const group = el("section", "group");
      const toggle = document.createElement("button");
      toggle.append(el("h3", null, GROUP_TITLES[groupId]), iconEl("mdi:chevron-down"));
      const groupBody = el("div", "group-body");
      groupBody.hidden = !this._openGroups.has(groupId);

      toggle.addEventListener("click", () => {
        const open = this._openGroups.has(groupId);
        if (open) this._openGroups.delete(groupId);
        else this._openGroups.add(groupId);
        groupBody.hidden = open;
        toggle.querySelector("ha-icon")?.setAttribute("icon", open ? "mdi:chevron-down" : "mdi:chevron-up");
      });
      toggle.querySelector("ha-icon")?.setAttribute("icon", groupBody.hidden ? "mdi:chevron-down" : "mdi:chevron-up");

      THEME_CONTROLS.filter((control) => control.group === groupId).forEach((control) => {
        groupBody.append(this._buildThemeControl(control));
      });

      group.append(toggle, groupBody);
      body.append(group);
    });

    const footer = document.createElement("footer");
    const resetButton = document.createElement("button");
    resetButton.append(iconEl("mdi:restore"), el("span", null, "Standard"));
    resetButton.addEventListener("click", () => {
      HaOsTheme.reset();
      this._syncSettingsValues();
    });
    const doneButton = el("button", "primary", "Fertig");
    doneButton.addEventListener("click", () => this._closeSettings());
    footer.append(resetButton, doneButton);

    section.append(header, body, footer);
    root.append(section);

    this._pages.set(SETTINGS_PAGE_ID, { root, columns: [], entries: [], kind: "settings" });
    this._content.append(root);
    this._syncSettingsValues();
  }

  _buildThemeControl(control) {
    if (control.type === "image") return this._buildImageControl(control);
    if (control.type === "switch") return this._buildSwitchControl(control);

    const label = document.createElement("label");
    label.className = control.type === "color" ? "control color" : "control";

    const text = el("span");
    text.append(el("b", null, control.label), el("small", null, control.hint));
    label.append(text);

    const input = document.createElement("input");
    input.type = control.type === "color" ? "color" : "range";

    let swatch = null;
    if (control.type !== "color") {
      const output = document.createElement("output");
      label.append(output);
      input.min = control.min;
      input.max = control.max;
      input.step = control.step;
      this._settingsInputs.set(control.key, { input, output, control });
    } else {
      swatch = el("span", "swatch");
      swatch.append(input);
      this._settingsInputs.set(control.key, { input, output: null, control, swatch });
    }

    input.addEventListener("input", () => {
      const value = control.type === "color" ? input.value : Number(input.value);
      HaOsTheme.save({ [control.key]: value });
      const record = this._settingsInputs.get(control.key);
      if (record?.output) record.output.textContent = `${value}${control.unit || ""}`;
      if (record?.swatch) record.swatch.style.setProperty("--swatch-color", value);
    });

    label.append(swatch || input);
    return label;
  }

  /**
   * Schalter in der Einstellungsseite.
   *
   * Bewusst ein eigenes Element und kein `ha-switch`: die Seite laeuft im
   * Shadow-DOM der Karte, und ob HAs Elemente dort schon geladen sind, ist
   * Zufall - dieselbe Falle wie bei der Bildauswahl.
   */
  _buildSwitchControl(control) {
    const label = document.createElement("label");
    label.className = "control";

    const text = el("span");
    text.append(el("b", null, control.label), el("small", null, control.hint));

    const track = el("span", "switch");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(HaOsTheme.get()[control.key]);
    track.append(input);

    input.addEventListener("change", () => {
      HaOsTheme.save({ [control.key]: input.checked });
      // Die Farbwaehler zeigen weiter ihre eigenen Werte – sie gelten wieder,
      // sobald die Uebernahme ausgeschaltet wird. Deshalb nur ausgrauen.
      this._syncSettingsValues();
    });

    label.append(text, track);
    this._settingsSwitches.set(control.key, input);
    return label;
  }

  /**
   * Bildauswahl mit Upload.
   *
   * Eine Lovelace-Karte darf nicht in `config/www/` schreiben – dafür gibt es
   * keine Schnittstelle. Home Assistant bringt aber eine eigene Bildablage
   * mit, und `createImageField` spricht deren Schnittstelle direkt an.
   *
   * Früher hing das an `ha-selector`. Ob das Element beim Bauen der
   * Einstellungsseite schon geladen ist, ist jedoch Zufall – war es das
   * nicht, fehlte die Bildauswahl **ganz**, ohne jede Meldung. Genau so ist
   * sie zeitweise verschwunden.
   *
   * Das Textfeld darunter bleibt für alle, die ihre Bilder lieber selbst nach
   * `config/www/wallpaper/` legen und `/local/wallpaper/…` eintragen.
   */
  _buildImageControl(control) {
    const wrap = el("div", "control stacked");
    const text = el("span");
    text.append(el("b", null, control.label), el("small", null, control.hint));
    wrap.append(text);

    const field = createImageField({
      getHass: () => this._hass,
      getValue: () => HaOsTheme.get()[control.key] || "",
      placeholder: "/local/wallpaper/bild.jpg",
      onChange: (value) => {
        HaOsTheme.save({ [control.key]: value });
      },
    });

    wrap.append(field.element);
    // Ungültige Adressen verwirft das Theme – deshalb nach dem Speichern
    // einmal aus dem echten Stand nachzeichnen, nicht aus der Eingabe.
    this._settingsImages.set(control.key, { field, control });
    return wrap;
  }

  _syncSettingsValues() {
    if (!this._settingsInputs) return;
    const theme = HaOsTheme.get();
    this._settingsInputs.forEach(({ input, output, control, swatch }, key) => {
      const value = theme[key];
      if (value === undefined) return;
      input.value = value;
      if (output) output.textContent = `${value}${control.unit || ""}`;
      if (swatch) swatch.style.setProperty("--swatch-color", value);
    });
    this._settingsPaths?.forEach((input, key) => {
      input.value = theme[key] || "";
    });
    // Zeichnet Vorschau und Pfadfeld aus dem echten Theme-Stand nach – wichtig
    // nach „Zurücksetzen" und wenn das Theme eine Adresse verworfen hat.
    this._settingsImages?.forEach(({ field }) => field.refresh());
    this._settingsSwitches?.forEach((input, key) => {
      input.checked = Boolean(theme[key]);
    });

    // Was Home Assistant steuert, laesst sich hier nicht mehr sinnvoll
    // einstellen – ausgrauen statt verstecken, damit erkennbar bleibt, dass
    // es die Regler weiterhin gibt.
    const uebernommen = Boolean(theme.follow_ha);
    this._settingsInputs.forEach(({ input, control }) => {
      if (control.type !== "color") return;
      const haGesteuert = ["accent", "textLight", "textDark", "statusGoodLight", "statusGoodDark",
        "statusOffLight", "statusOffDark", "statusBadLight", "statusBadDark"].includes(control.key);
      const feld = input.closest(".control");
      if (feld) feld.classList.toggle("dimmed", uebernommen && haGesteuert);
    });
  }
}

if (!customElements.get(TAG)) customElements.define(TAG, HaOsShell);

registerCard({
  type: TAG,
  name: "HA-OS Shell",
  description: "Grundgerüst mit Glasfläche, Seitenleiste, Kopfzeile und drei Rastern.",
  preview: false,
  documentationURL: "https://github.com/",
});

export { HaOsShell, TAG as SHELL_TAG, EDITOR_TAG as SHELL_EDITOR_TAG };
