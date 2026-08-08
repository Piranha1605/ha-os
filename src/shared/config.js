/**
 * HA-OS – Normalisierung der Shell-Konfiguration.
 *
 * Bewusst in eine eigene Datei ausgelagert: die Shell-Karte und der Shell-Editor
 * müssen exakt dieselbe Normalisierung verwenden, sonst entstehen
 * Endlosschleifen aus "Editor schreibt, Karte normalisiert anders zurück".
 */

import { clampNumber } from "./utils.js";

export const SETTINGS_PAGE_ID = "__haos_settings";

export const DEFAULT_GRID_WIDTHS = [1, 1.55, 1.05];

export const SHELL_DEFAULTS = Object.freeze({
  gap: 16,
  row_height: 125,
  users: [],
  fullscreen_entity: "",
  show_settings_button: true,
  show_theme_button: true,
  quick_actions: [],
  pages: [],
});

// Kombinierende Akzente (U+0300–U+036F) – als String gebaut, damit die Datei
// reines ASCII bleibt und beim Kopieren über SMB nicht beschädigt werden kann.
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");
const UMLAUTS = { "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss" };

const slugify = (value, fallback = "seite") =>
  String(value || "")
    .toLowerCase()
    .replace(/[äöüß]/g, (char) => UMLAUTS[char])
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || fallback;

const uniqueId = (candidate, used, fallback) => {
  const base = slugify(candidate, fallback);
  let id = base;
  let suffix = 2;
  while (used.has(id)) id = `${base}-${suffix++}`;
  used.add(id);
  return id;
};

const normalizeAction = (action, fallbackAction = "more-info") => {
  if (!action || typeof action !== "object") return { action: fallbackAction };
  return { ...action, action: action.action || fallbackAction };
};

const normalizeBadge = (source, index, used) => {
  const raw = typeof source === "string" ? { entity: source } : source || {};
  const kind = raw.kind === "link" ? "link" : "entity";
  return {
    id: uniqueId(raw.id || `badge-${index + 1}`, used, `badge-${index + 1}`),
    kind,
    entity: kind === "entity" ? raw.entity || "" : "",
    name: raw.name || "",
    icon: raw.icon || "",
    url: kind === "link" ? raw.url || "" : "",
    show_state: raw.show_state !== false,
    tap_action: normalizeAction(raw.tap_action, kind === "link" ? "url" : "toggle"),
  };
};

const normalizeQuickAction = (source, index, used) => {
  const raw = source || {};
  return {
    id: uniqueId(raw.id || `action-${index + 1}`, used, `action-${index + 1}`),
    icon: raw.icon || "mdi:star-outline",
    name: raw.name || "",
    entity: raw.entity || "",
    tap_action: normalizeAction(raw.tap_action, raw.entity ? "toggle" : "none"),
  };
};

/** Karten-Slot: normale HA-Kartenkonfiguration plus haos_weight für die Höhe. */
const normalizeCard = (card) => {
  const config = card && typeof card === "object" ? { ...card } : { type: "" };
  // Untergrenze 0.1, damit flache Fremdkarten (Mushroom u. a.) nicht zu hoch
  // gerendert werden. Bei row_height 125 sind das 13 px.
  config.haos_weight = clampNumber(config.haos_weight, 0.1, 6, 1);
  return config;
};

const normalizeGrid = (grid) => ({
  name: grid?.name || "",
  cards: Array.isArray(grid?.cards) ? grid.cards.map(normalizeCard) : [],
});

export const createEmptyGrids = () => [0, 1, 2].map((index) => ({ name: `Grid ${index + 1}`, cards: [] }));

const normalizeGrids = (grids) =>
  Array.from({ length: 3 }, (_, index) => normalizeGrid(grids?.[index] ?? { name: `Grid ${index + 1}` }));

const normalizePage = (page, index, used) => {
  const raw = page || {};
  const isFirst = index === 0;
  const kind = raw.kind === "iframe" ? "iframe" : "page";
  const badgeIds = new Set();

  return {
    id: isFirst ? "home" : uniqueId(raw.id || raw.name || `seite-${index + 1}`, used, `seite-${index + 1}`),
    name: raw.name || (isFirst ? "Home" : `Seite ${index + 1}`),
    icon: raw.icon || (isFirst ? "mdi:home" : "mdi:circle-outline"),
    kind,
    url: kind === "iframe" ? raw.url || "" : "",
    hide_ha_chrome: kind === "iframe" && Boolean(raw.hide_ha_chrome),
    // Höhe des Rahmens in Pixeln. 0 heisst: volle Höhe der Seite. Ohne diese
    // Angabe füllte der Rahmen immer die ganze Seite, und eine eingebettete
    // Ansicht mit einer einzigen Karte wurde dadurch übermässig hoch.
    frame_height: kind === "iframe" ? clampNumber(raw.frame_height, 0, 2000, 0) : 0,
    badges: (Array.isArray(raw.badges) ? raw.badges : []).map((badge, badgeIndex) =>
      normalizeBadge(badge, badgeIndex, badgeIds)
    ),
    grid_widths: Array.from({ length: 3 }, (_, widthIndex) =>
      clampNumber(raw.grid_widths?.[widthIndex], 0.3, 4, DEFAULT_GRID_WIDTHS[widthIndex])
    ),
    grids: normalizeGrids(raw.grids),
  };
};

export const normalizeShellConfig = (config = {}) => {
  // "home" und die Einstellungsseite sind reserviert: Seite 0 bekommt immer
  // "home", alle weiteren Seiten dürfen diese IDs nicht erneut belegen.
  const usedPageIds = new Set(["home", SETTINGS_PAGE_ID]);
  const usedActionIds = new Set();

  const sourcePages = Array.isArray(config.pages) && config.pages.length ? config.pages : [{ id: "home", name: "Home" }];

  return {
    type: config.type,
    gap: clampNumber(config.gap, 0, 48, SHELL_DEFAULTS.gap),
    row_height: clampNumber(config.row_height, 60, 320, SHELL_DEFAULTS.row_height),
    users: (Array.isArray(config.users) ? config.users : [])
      .map((entry) => (typeof entry === "string" ? entry : entry?.entity))
      .filter(Boolean),
    fullscreen_entity: config.fullscreen_entity || "",
    show_settings_button: config.show_settings_button !== false,
    show_theme_button: config.show_theme_button !== false,

    // Seiten sind ab 0.5.0 zusätzlich über die Seitenleiste erreichbar.
    // Beide Wege bleiben standardmäßig an: wer die Reiter oben gewohnt ist,
    // soll sie nach dem Update nicht plötzlich vermissen.
    sidebar_pages: config.sidebar_pages !== false,
    topbar_tabs: config.topbar_tabs !== false,

    quick_actions: (Array.isArray(config.quick_actions) ? config.quick_actions : []).map((action, index) =>
      normalizeQuickAction(action, index, usedActionIds)
    ),
    pages: sourcePages.map((page, index) => normalizePage(page, index, usedPageIds)),
  };
};

/** Entfernt HA-OS-eigene Schlüssel, bevor die Karte an Home Assistant übergeben wird. */
export const stripHaOsKeys = (cardConfig) => {
  const clean = { ...cardConfig };
  delete clean.haos_weight;
  return clean;
};
