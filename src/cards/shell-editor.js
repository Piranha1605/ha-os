/**
 * HA-OS – Editor der Shell-Karte
 *
 * Drei Reiter: Aussehen, Leisten, Seiten.
 *
 * Der Reiter "Seiten" traegt die ganze Struktur: Seite -> Raster -> Karte ->
 * Felder, alles aufklappbar, pro Ebene immer nur eines offen. Vorher lagen
 * Seiten und Karten in getrennten Reitern, sodass man dieselbe Seite zweimal
 * auswaehlen musste und nicht mehr wusste, wo man ist.
 *
 * Gegen Fokusverlust gilt hier dieselbe Regel wie im Karten-Editor:
 * <ha-form>-Elemente werden gecacht und nur über .data aktualisiert. Der
 * Editor baut sein DOM nur dann neu auf, wenn sich die STRUKTUR ändert
 * (Seite/Karte hinzugefügt, entfernt, verschoben) – nicht beim Tippen.
 */

import {
  normalizeShellConfig,
  createEmptyGrids,
  DEFAULT_GRID_WIDTHS,
  MIN_GRIDS,
  MAX_GRIDS,
} from "../shared/config.js";
import { IMAGE_FIELD_CSS, createImageField, isEqualConfig, deepClone } from "../shared/utils.js";
import { HaOsTheme } from "../shared/theme.js";
import { cardCatalog, stubConfigFor, createCardEditorWithCode } from "../shared/card-catalog.js";

const EDITOR_TAG = "ha-os-shell-editor";

const LABELS = {
  gap: "Abstand zwischen Karten",
  row_height: "Kartenhöhe in px",
  background_dark: "Hintergrundbild Dunkel",
  background_light: "Hintergrundbild Hell",
  background_dim: "Hintergrund abdunkeln",
  users: "Benutzer in der Kopfzeile",
  fullscreen_entity: "Vollbild-Schalter",
  sidebar_pages: "Seiten in der Seitenleiste",
  topbar_tabs: "Seiten als Reiter oben",
  show_settings_button: "Einstellungsknopf anzeigen",
  show_theme_button: "Hell/Dunkel-Knopf anzeigen",
  name: "Name",
  icon: "Symbol",
  kind: "Seitentyp",
  url: "Adresse",
  hide_ha_chrome: "HA-Kopfzeile im Rahmen ausblenden",
  frame_height: "Höhe des Rahmens in px",
  entity: "Entität",
  show_state: "Zustand anzeigen",
  tap_action: "Tippen",
  entities: "Zähler",
  suffix: "Endung der Entitäts-ID",
  unit: "Einheit",
};

const HELPERS = {
  sidebar_pages: "Jede Seite bekommt ein Symbol in der linken Leiste.",
  topbar_tabs:
    "Ausschalten, wenn die Seitenleiste reichen soll – bei vielen Seiten läuft die Kopfzeile sonst über.",
  gap: "Gilt gleichmäßig waagerecht und senkrecht.",
  row_height: "Grundhöhe einer Karte mit Höhenfaktor 1.",
  background_dim: "Schwarze Schicht über dem Bild. Gilt für alle Geräte.",
  fullscreen_entity: "Ein input_boolean, das den Vollbildmodus schaltet. Leer lassen, um den Knopf auszublenden.",
  users: "Leer lassen, um automatisch alle person-Entitäten anzuzeigen.",
  frame_height:
    "0 füllt die ganze Seite. Für eine eingebettete Ansicht mit einer einzigen Karte ist ein fester Wert meist besser – sonst wird die Karte über die volle Höhe gezogen.",
  hide_ha_chrome: "Blendet Kopfzeile und Seitenleiste von Home Assistant im Rahmen aus.",
  entities: "Leer lassen, um alle Sensoren mit Geräteklasse „Energie“ zu nehmen.",
  suffix:
    "Grenzt die automatische Auswahl ein. Mehrere durch Komma, etwa _energy_today, _energieverbrauch. Ohne Angabe werden Tages- und Gesamtwerte desselben Geräts doppelt gezählt.",
};

/** Nur die Maße der Shell. */
const APPEARANCE_SCHEMA = [
  { name: "gap", selector: { number: { min: 0, max: 48, step: 1, mode: "slider" } } },
  { name: "row_height", selector: { number: { min: 60, max: 320, step: 5, mode: "slider" } } },
  { name: "background_dim", selector: { number: { min: 0, max: 80, step: 1, mode: "slider" } } },
];

/** Kopfzeile und Seitenleiste – alles, was am Rand sitzt. */
const BARS_SCHEMA = [
  { name: "users", selector: { entity: { domain: ["person", "device_tracker"], multiple: true } } },
  { name: "topbar_tabs", selector: { boolean: {} } },
  { name: "sidebar_pages", selector: { boolean: {} } },
  { name: "show_settings_button", selector: { boolean: {} } },
  { name: "show_theme_button", selector: { boolean: {} } },
  { name: "fullscreen_entity", selector: { entity: { domain: ["input_boolean"] } } },
];

const PAGE_SCHEMA = [
  { name: "name", required: true, selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
  {
    name: "kind",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: "page", label: "Interne Seite mit Rastern" },
          { value: "iframe", label: "Externe Seite / iFrame" },
        ],
      },
    },
  },
];

const IFRAME_SCHEMA = [
  { name: "url", selector: { text: {} } },
  { name: "hide_ha_chrome", selector: { boolean: {} } },
  { name: "frame_height", selector: { number: { min: 0, max: 2000, step: 10, mode: "box" } } },
];

const BADGE_SCHEMA = [
  {
    name: "kind",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: "entity", label: "Entität" },
          { value: "sum", label: "Summe mehrerer Zähler" },
          { value: "link", label: "Link" },
        ],
      },
    },
  },
  { name: "entity", selector: { entity: {} } },
  { name: "entities", selector: { entity: { multiple: true } } },
  { name: "suffix", selector: { text: {} } },
  { name: "unit", selector: { text: {} } },
  { name: "name", selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
  { name: "show_state", selector: { boolean: {} } },
  { name: "tap_action", selector: { ui_action: {} } },
];

const QUICK_ACTION_SCHEMA = [
  { name: "icon", selector: { icon: {} } },
  { name: "name", selector: { text: {} } },
  { name: "entity", selector: { entity: {} } },
  { name: "tap_action", selector: { ui_action: {} } },
];

const TABS = [
  ["appearance", "Aussehen"],
  ["bars", "Leisten"],
  ["pages", "Seiten"],
];

/**
 * Verschachtelungstiefe der Aufklapp-Blöcke.
 *
 * Pro Ebene ist immer nur ein Block offen. Wird einer geöffnet, schließen
 * alle tieferen mit – sonst wächst die Liste bei vier Ebenen so weit, dass
 * man beim Scrollen die Orientierung verliert. Genau das war der Grund,
 * warum die nummerierten Reiter wieder rausgeflogen sind.
 */
const LEVELS = ["page", "section", "card", "detail"];

const STYLES = `
  :host { display: block; }
  * { box-sizing: border-box; }

  .tabs { display: flex; gap: 4px; margin-bottom: 14px; border-bottom: 1px solid var(--divider-color, rgba(127,127,127,.3)); }
  .tab {
    padding: 10px 14px; border: 0; background: none; cursor: pointer; font: inherit;
    color: var(--secondary-text-color); border-bottom: 2px solid transparent;
  }
  .tab.active { color: var(--primary-color); border-bottom-color: var(--primary-color); font-weight: 600; }

  .panel { display: grid; gap: 12px; }
  .panel[hidden] { display: none; }

  .block { border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 10px; overflow: hidden; }
  .block > header {
    display: flex; align-items: center; gap: 8px; padding: 8px 10px;
    background: var(--secondary-background-color, rgba(127,127,127,.08));
  }
  .block > header .label { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .block > header .sub { font-size: 11px; font-weight: 400; color: var(--secondary-text-color); }
  .block > .body { padding: 10px; }
  .block > .body[hidden] { display: none; }

  .mini { width: 32px; height: 32px; flex: 0 0 32px; border: 0; border-radius: 8px; background: none; cursor: pointer; color: var(--secondary-text-color); display: grid; place-items: center; }
  .mini:hover { background: rgba(127,127,127,.16); color: var(--primary-text-color); }
  .mini:disabled { opacity: .3; cursor: default; }
  .mini ha-icon { --mdc-icon-size: 18px; }
  .mini.danger:hover { color: var(--error-color, #db4437); }

  .add-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .add {
    padding: 9px 14px; border: 1px dashed var(--divider-color, rgba(127,127,127,.4)); border-radius: 10px;
    background: none; cursor: pointer; font: inherit; color: var(--primary-color); display: flex; align-items: center; gap: 6px;
  }
  .add:hover { background: rgba(127,127,127,.08); }
  .add ha-icon { --mdc-icon-size: 18px; }

  /* Umschalter auf den Code-Editor – wie in HAs eigenem Kartendialog unten. */
  .linkish {
    margin-top: 10px; padding: 6px 0; border: 0; background: none; cursor: pointer;
    font: inherit; font-size: 13px; color: var(--primary-color);
  }

  /* Der offene Block hebt sich ab – bei vier Ebenen ist das die zweite
     Orientierungshilfe neben der Pfadzeile. */
  .block.is-open { border-color: var(--primary-color); }
  .block.is-open > header { background: color-mix(in srgb, var(--primary-color) 10%, transparent); }

  .hint { margin: 0; font-size: 12px; line-height: 1.45; color: var(--secondary-text-color); }
  ${IMAGE_FIELD_CSS}
  .empty { padding: 14px; text-align: center; font-size: 12px; color: var(--secondary-text-color); }

  select.plain, input.plain {
    width: 100%; padding: 9px 10px; font: inherit; color: var(--primary-text-color);
    background: var(--secondary-background-color, rgba(127,127,127,.08));
    border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 8px;
  }
  .field { display: grid; gap: 5px; margin-bottom: 10px; }
  .field > label { font-size: 12px; color: var(--secondary-text-color); }
  /* Die Anzahl der Raster ist je Seite einstellbar – die Breitenfelder
     verteilen sich deshalb automatisch, statt auf drei festgenagelt zu sein. */
  .widths { display: grid; grid-template-columns: repeat(auto-fit, minmax(72px, 1fr)); gap: 8px; }

  /* --- Kartenauswahl --- */
  .picker { display: grid; gap: 8px; }
  .picker-list {
    max-height: 320px; overflow-y: auto; display: grid; gap: 4px;
    border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 10px; padding: 6px;
  }
  .picker-item {
    display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px;
    border: 0; border-radius: 8px; background: none; cursor: pointer; font: inherit;
    color: var(--primary-text-color); text-align: left;
  }
  .picker-item:hover { background: rgba(127,127,127,.14); }
  .picker-item ha-icon { --mdc-icon-size: 20px; color: var(--secondary-text-color); flex: 0 0 20px; }
  .picker-item .pi-text { min-width: 0; }
  .picker-item .pi-name { font-size: 13px; font-weight: 600; }
  .picker-item .pi-desc {
    font-size: 11px; color: var(--secondary-text-color);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .picker-item .pi-tag {
    margin-left: auto; flex: 0 0 auto; font-size: 10px; padding: 2px 6px; border-radius: 6px;
    background: rgba(127,127,127,.18); color: var(--secondary-text-color);
  }
`;

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

const miniButton = (iconName, title, handler, className = "mini") => {
  const button = el("button", className);
  button.title = title;
  button.append(icon(iconName));
  button.addEventListener("click", handler);
  return button;
};

class HaOsShellEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._built = false;
    this._tab = "appearance";
    // Pro Ebene ein offener Block, siehe LEVELS.
    this._openAt = new Map();
    this._openPicker = null;
    this._forms = new Map();
  }

  setConfig(config) {
    const next = normalizeShellConfig(config);
    const structureChanged = this._structureSignature(next) !== this._structureSignature(this._config);
    this._config = next;

    if (!this._built) {
      this._build();
      return;
    }
    if (structureChanged) this._renderPanels();
    else this._refreshForms();
  }

  set hass(hass) {
    this._hass = hass;
    this._forms.forEach((form) => {
      form.hass = hass;
    });
  }

  get hass() {
    return this._hass;
  }

  /** Ändert sich diese Signatur, muss das DOM neu aufgebaut werden. */
  _structureSignature(config) {
    if (!config) return "";
    return JSON.stringify(
      config.pages.map((page) => ({
        id: page.id,
        kind: page.kind,
        badges: page.badges.length,
        cards: page.grids.map((grid) => grid.cards.map((card) => card.type)),
      }))
    ) + `|${config.quick_actions.length}|${this._tab}`;
  }

  _emit() {
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true })
    );
  }

  /** Nimmt eine Änderung vor und meldet sie. `structural` erzwingt Neuaufbau. */
  _mutate(mutator, structural = false) {
    const draft = deepClone(this._config);
    mutator(draft);
    this._config = normalizeShellConfig(draft);
    this._emit();
    if (structural) this._renderPanels();
  }

  // ---------------------------------------------------------------- Aufbau

  _build() {
    const style = document.createElement("style");
    style.textContent = STYLES;

    this._tabBar = el("div", "tabs");
    TABS.forEach(([id, label]) => {
      const tab = el("button", "tab", label);
      tab.addEventListener("click", () => {
        this._tab = id;
        this._renderPanels();
      });
      this._tabBar.append(tab);
    });

    this._panel = el("div", "panel");
    this.shadowRoot.replaceChildren(style, this._tabBar, this._panel);
    this._built = true;
    this._renderPanels();
  }

  _renderPanels() {
    [...this._tabBar.children].forEach((tab, index) => {
      tab.classList.toggle("active", TABS[index][0] === this._tab);
    });

    this._forms.clear();
    this._panel.replaceChildren();

    if (this._tab === "appearance") this._renderAppearance();
    else if (this._tab === "bars") this._renderBars();
    else this._renderPages();
  }

  _refreshForms() {
    this._forms.forEach((form, key) => {
      const data = this._formData(key);
      if (data && !isEqualConfig(form.data, data)) form.data = data;
    });
  }

  /** Liefert die aktuellen Daten für ein gecachtes Formular. */
  _formData(key) {
    const [kind, a, b] = key.split(":");
    if (kind === "general" || kind === "bars") return this._config;
    if (kind === "page") return this._config.pages[Number(a)];
    if (kind === "iframe") return this._config.pages[Number(a)];
    if (kind === "badge") return this._config.pages[Number(a)].badges[Number(b)];
    if (kind === "action") return this._config.quick_actions[Number(a)];
    return null;
  }

  _form(key, schema, data, onChange) {
    const form = document.createElement("ha-form");
    form.hass = this._hass;
    form.data = data;
    form.schema = schema;
    form.computeLabel = (field) => LABELS[field.name] || field.name;
    form.computeHelper = (field) => HELPERS[field.name] || "";
    form.addEventListener("value-changed", (event) => {
      event.stopPropagation();
      onChange(event.detail.value);
    });
    this._forms.set(key, form);
    return form;
  }

  /** Ist auf dieser Ebene genau dieser Block offen? */
  _isOpen(level, openKey) {
    return this._openAt?.get(level) === openKey;
  }

  /**
   * Oeffnet einen Block und schliesst alles Tiefere.
   *
   * Ohne das Schliessen der tieferen Ebenen bliebe beim Wechsel von Raster 1
   * nach Raster 2 die Karte aus Raster 1 aufgeklappt stehen - man saehe
   * Felder, die zu etwas anderem gehoeren.
   */
  _toggleOpen(level, openKey) {
    this._openAt = this._openAt || new Map();
    const wasOpen = this._openAt.get(level) === openKey;

    const from = LEVELS.indexOf(level);
    LEVELS.slice(from).forEach((deeper) => this._openAt.delete(deeper));
    if (!wasOpen) this._openAt.set(level, openKey);

    this._renderPanels();
  }

  /**
   * Aufklappbarer Block.
   *
   * @param level Ebene aus LEVELS - bestimmt, was beim Oeffnen zuklappt.
   * @param path  Pfadzeile wie "Home > Raster 1 > Karte 1". Bei vier Ebenen
   *              ist sie das Einzige, woran man noch erkennt, wo man ist.
   */
  _block(labelText, path, bodyBuilder, openKey, headerExtras = [], level = "section") {
    const open = this._isOpen(level, openKey);
    const block = el("div", `block${open ? " is-open" : ""}`);
    const header = document.createElement("header");

    const text = el("div");
    text.style.cssText = "flex:1;min-width:0";
    text.append(el("div", "label", labelText));
    if (path) text.append(el("div", "sub", path));
    header.append(text);

    const toggle = miniButton(open ? "mdi:chevron-up" : "mdi:chevron-down", "Aufklappen", () =>
      this._toggleOpen(level, openKey)
    );
    header.append(...headerExtras, toggle);

    // Die Kopfzeile klappt ebenfalls auf - die kleine Pfeilflaeche zu treffen
    // ist auf dem Tablet unnoetig fummelig.
    header.style.cursor = "pointer";
    header.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      this._toggleOpen(level, openKey);
    });

    block.append(header);

    // Inhalt entsteht nur, wenn der Block offen ist. Sonst haengen fuer jede
    // Karte jeder Seite Formulare im Speicher, die niemand sieht.
    if (open) {
      const body = el("div", "body");
      body.append(bodyBuilder());
      block.append(body);
    }

    return block;
  }

  // ---------------------------------------------------------------- Allgemein

  _renderAppearance() {
    this._panel.append(
      el(
        "p",
        "hint",
        "Masse der Shell und das Hintergrundbild. Farben und Glas stehen in der " +
          "internen Einstellungsseite – die gilt pro Geraet, das Bild hier fuer alle."
      )
    );
    this._panel.append(
      this._form("general", APPEARANCE_SCHEMA, this._config, (value) => {
        this._config = normalizeShellConfig({ ...this._config, ...value });
        this._emit();
      })
    );

    // Die Bildauswahl steht ausserhalb des Formulars: ha-form laesst ein Feld
    // mit selector image stillschweigend weg – derselbe Grund wie in der
    // Fahrzeugkarte.
    [
      ["background_dark", "Hintergrundbild Dunkel"],
      ["background_light", "Hintergrundbild Hell"],
    ].forEach(([key, label]) => {
      const wrap = el("div", "field");
      wrap.append(el("label", null, label));
      const field = createImageField({
        getHass: () => this._hass,
        getValue: () => this._config[key] || "",
        placeholder: "/local/wallpaper/bild.jpg",
        onChange: (value) => {
          this._config = normalizeShellConfig({ ...this._config, [key]: value });
          this._emit();
        },
      });
      wrap.append(field.element);
      this._panel.append(wrap);
    });

    /*
     * Uebernehmen aus den Einstellungen.
     *
     * Der haeufige Fall: jemand hat sein Wallpaper laengst ueber die interne
     * Einstellungsseite gesetzt. Das liegt im localStorage dieses Browsers und
     * erscheint deshalb auf keinem anderen Geraet. Ohne diesen Knopf muesste
     * man das Bild erneut hochladen, um es in die Karte zu bekommen - und
     * genau daran ist es gescheitert.
     */
    const theme = HaOsTheme.get();
    const uebertragbar = ["backgroundDark", "backgroundLight"].some(
      (key) => theme[key] && theme[key] !== this._config[key === "backgroundDark" ? "background_dark" : "background_light"]
    );

    if (uebertragbar) {
      const knopf = el("button", "add");
      knopf.append(icon("mdi:content-copy"), el("span", null, "Bild dieses Geräts übernehmen"));
      knopf.addEventListener("click", () => {
        const current = HaOsTheme.get();
        this._config = normalizeShellConfig({
          ...this._config,
          background_dark: current.backgroundDark || this._config.background_dark,
          background_light: current.backgroundLight || this._config.background_light,
          background_dim: current.backgroundDim || this._config.background_dim,
        });
        this._emit();
        this._renderPanels();
      });
      this._panel.append(knopf);
    }

    this._panel.append(
      el(
        "p",
        "hint",
        "Ein hier gesetztes Bild erscheint auf jedem Geraet. Wer auf einem Tablet " +
          "in den Einstellungen ein eigenes Bild waehlt, behaelt seines."
      )
    );
  }

  _renderBars() {
    this._panel.append(
      el("p", "hint", "Kopfzeile oben und Seitenleiste links – alles, was am Rand der Shell sitzt.")
    );
    this._panel.append(
      this._form("bars", BARS_SCHEMA, this._config, (value) => {
        this._config = normalizeShellConfig({ ...this._config, ...value });
        this._emit();
      })
    );

    const actions = el("div", "panel");
    actions.append(el("p", "hint", "Schnellaktionen erscheinen als Symbole in der Seitenleiste."));

    this._config.quick_actions.forEach((action, index) => {
      const extras = [
        miniButton("mdi:arrow-up", "Nach oben", () => this._moveQuickAction(index, -1)),
        miniButton("mdi:arrow-down", "Nach unten", () => this._moveQuickAction(index, 1)),
        miniButton(
          "mdi:delete-outline",
          "Entfernen",
          () => this._mutate((draft) => draft.quick_actions.splice(index, 1), true),
          "mini danger"
        ),
      ];
      actions.append(
        this._block(
          action.name || action.entity || `Aktion ${index + 1}`,
          `Seitenleiste › Aktion ${index + 1}`,
          () =>
            this._form(`action:${index}`, QUICK_ACTION_SCHEMA, action, (value) =>
              this._mutate((draft) => Object.assign(draft.quick_actions[index], value))
            ),
          `action-${index}`,
          extras,
          "page"
        )
      );
    });

    const add = el("button", "add");
    add.append(icon("mdi:plus"), el("span", null, "Schnellaktion hinzufügen"));
    add.addEventListener("click", () =>
      this._mutate((draft) => draft.quick_actions.push({ icon: "mdi:star-outline" }), true)
    );

    const addRow = el("div", "add-row");
    addRow.append(add);
    actions.append(addRow);
    this._panel.append(actions);
  }

  _moveQuickAction(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= this._config.quick_actions.length) return;
    this._mutate((draft) => {
      const [item] = draft.quick_actions.splice(index, 1);
      draft.quick_actions.splice(target, 0, item);
    }, true);
  }

  // ---------------------------------------------------------------- Seiten

  _renderPages() {
    this._panel.append(
      el(
        "p",
        "hint",
        "Alles zu einer Seite steckt in ihr drin: Name, Badges und die Raster mit ihren Karten. " +
          "Ob Seiten in der Seitenleiste oder als Reiter oben erscheinen, steht unter Leisten."
      )
    );

    this._config.pages.forEach((page, index) => {
      const extras = [];
      if (index > 0) {
        extras.push(
          miniButton("mdi:arrow-up", "Nach oben", () => this._movePage(index, -1)),
          miniButton("mdi:arrow-down", "Nach unten", () => this._movePage(index, 1)),
          miniButton("mdi:delete-outline", "Seite entfernen", () => this._mutate((draft) => draft.pages.splice(index, 1), true), "mini danger")
        );
      }

      this._panel.append(
        this._block(
          page.name,
          index === 0 ? "Startseite" : page.kind === "iframe" ? "Externe Seite" : "Interne Seite",
          () => this._pageBody(page, index),
          `page-${index}`,
          extras,
          "page"
        )
      );
    });

    const add = el("button", "add");
    add.append(icon("mdi:plus"), el("span", null, "Neue Seite"));
    add.addEventListener("click", () =>
      this._mutate((draft) => {
        draft.pages.push({
          name: `Seite ${draft.pages.length + 1}`,
          icon: "mdi:circle-outline",
          kind: "page",
          grid_widths: [...DEFAULT_GRID_WIDTHS],
          grids: createEmptyGrids(),
        });
      }, true)
    );

    const addProgram = el("button", "add");
    addProgram.append(icon("mdi:application-outline"), el("span", null, "Programm einbinden"));
    addProgram.addEventListener("click", () => {
      this._pickingProgram = !this._pickingProgram;
      this._renderPanels();
    });

    const addRow = el("div", "add-row");
    addRow.append(add, addProgram);
    this._panel.append(addRow);

    if (this._pickingProgram) this._panel.append(this._programPicker());
  }

  /**
   * Auswahl eines vorhandenen Home-Assistant-Programms.
   *
   * "Programm" meint hier alles, was Home Assistant selbst in seiner
   * Seitenleiste führt – Add-ons wie ESPHome, Studio Code Server oder der
   * Terminal, aber auch eigene Dashboards. Diese Liste steht in `hass.panels`.
   * Ausgewählt wird daraus eine iFrame-Seite; das erspart das Abtippen von
   * Adressen und trifft genau die Fälle wie 3D-Drucker oder CNC.
   */
  _programPicker() {
    const wrap = el("div", "picker");
    wrap.append(
      el(
        "p",
        "hint",
        "Programme sind die Einträge aus Home Assistants eigener Seitenleiste – Add-ons, " +
          "Dashboards, Einstellungen. Sie werden als Seite im Rahmen geöffnet."
      )
    );

    const search = el("input", "plain");
    search.type = "search";
    search.placeholder = "Programm suchen …";

    const list = el("div", "picker-list");

    const panels = Object.values(this._hass?.panels || {})
      .filter((panel) => panel?.url_path)
      .map((panel) => ({
        name: panel.title || panel.url_path,
        url: `/${panel.url_path}`,
        icon: panel.icon || "mdi:application-outline",
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "de"));

    const addPage = (entry) =>
      this._mutate((draft) => {
        draft.pages.push({
          name: entry.name,
          icon: entry.icon,
          kind: "iframe",
          url: entry.url,
          hide_ha_chrome: true,
        });
      }, true);

    const fill = (term) => {
      const needle = term.trim().toLowerCase();
      const hits = panels.filter(
        (entry) => !needle || entry.name.toLowerCase().includes(needle) || entry.url.toLowerCase().includes(needle)
      );

      list.replaceChildren();

      // Eigene Adresse: für alles, was nicht in HAs Seitenleiste steht –
      // etwa die Weboberfläche eines Druckers im selben Netz.
      const own = el("button", "picker-item");
      const ownText = el("div");
      ownText.append(
        el("div", "pi-name", "Eigene Adresse"),
        el("div", "pi-desc", "Beliebige Webseite oder HA-Pfad, danach im Feld Adresse eintragen")
      );
      own.append(icon("mdi:link-variant"), ownText);
      own.addEventListener("click", () => {
        this._pickingProgram = false;
        addPage({ name: "Programm", icon: "mdi:application-outline", url: "" });
      });
      list.append(own);

      if (!hits.length) {
        list.append(el("div", "empty", "Kein Programm gefunden."));
        return;
      }

      hits.forEach((entry) => {
        const item = el("button", "picker-item");
        const text = el("div");
        text.append(el("div", "pi-name", entry.name), el("div", "pi-desc", entry.url));
        item.append(icon(entry.icon), text);
        item.addEventListener("click", () => {
          this._pickingProgram = false;
          addPage(entry);
        });
        list.append(item);
      });
    };

    // Kein Neuzeichnen beim Tippen – das Suchfeld soll den Fokus behalten.
    search.addEventListener("input", () => fill(search.value));
    fill("");

    wrap.append(search, list);
    return wrap;
  }

  _movePage(index, delta) {
    const target = index + delta;
    if (target < 1 || target >= this._config.pages.length) return;
    this._mutate((draft) => {
      const [item] = draft.pages.splice(index, 1);
      draft.pages.splice(target, 0, item);
    }, true);
  }

  _pageBody(page, index) {
    const wrap = el("div");

    // Ebene 2: Allgemein
    wrap.append(
      this._block(
        "Allgemein",
        `${page.name} › Allgemein`,
        () => {
          const box = el("div");
          box.append(
            this._form(`page:${index}`, PAGE_SCHEMA, page, (value) =>
              this._mutate((draft) => Object.assign(draft.pages[index], value), value.kind !== page.kind)
            )
          );

          if (page.kind === "iframe") {
            box.append(
              this._form(`iframe:${index}`, IFRAME_SCHEMA, page, (value) =>
                this._mutate((draft) => Object.assign(draft.pages[index], value))
              )
            );
          } else {
            // Anzahl der Raster. Beim Verkleinern verschwinden die hinteren
            // samt ihrer Karten – deshalb steht das ausdrücklich dabei.
            const count = el("div", "field");
            const countLabel = el("label", null, `Anzahl der Raster: ${page.grids.length}`);
            count.append(countLabel);
            const countInput = el("input", "plain");
            countInput.type = "range";
            countInput.min = String(MIN_GRIDS);
            countInput.max = String(MAX_GRIDS);
            countInput.step = "1";
            countInput.value = String(page.grids.length);
            countInput.addEventListener("input", () => {
              countLabel.textContent = `Anzahl der Raster: ${countInput.value}`;
            });
            countInput.addEventListener("change", () =>
              this._mutate((draft) => {
                draft.pages[index].grid_count = Number(countInput.value);
              }, true)
            );
            count.append(countInput);
            count.append(
              el(
                "small",
                "hint",
                "Weniger Raster entfernen die hinteren samt der Karten darin."
              )
            );
            box.append(count);

            const widths = el("div", "field");
            widths.append(el("label", null, `Spaltenbreiten (Verhältnis der ${page.grids.length} Raster)`));
            const row = el("div", "widths");
            page.grid_widths.forEach((width, columnIndex) => {
              const input = el("input", "plain");
              input.type = "number";
              input.min = "0.3";
              input.max = "4";
              input.step = "0.05";
              input.value = width;
              input.addEventListener("change", () =>
                this._mutate((draft) => {
                  draft.pages[index].grid_widths[columnIndex] = Number(input.value);
                })
              );
              row.append(input);
            });
            widths.append(row);
            box.append(widths);
          }
          return box;
        },
        `page-${index}-general`,
        [],
        "section"
      )
    );

    // Ebene 2: Badges
    wrap.append(
      this._block(
        "Badges",
        `${page.name} › Badges · ${page.badges.length}`,
        () => this._badgeList(page, index),
        `page-${index}-badges`,
        [],
        "section"
      )
    );

    if (page.kind === "iframe") return wrap;

    // Ebene 2: die Raster – wie viele, steht in der Seite
    page.grids.forEach((grid, columnIndex) => {
      wrap.append(
        this._block(
          `Raster ${columnIndex + 1}`,
          `${page.name} › Raster ${columnIndex + 1} · ${grid.cards.length} ${
            grid.cards.length === 1 ? "Karte" : "Karten"
          } · Breite ${page.grid_widths[columnIndex]}`,
          () => this._gridBody(page, index, columnIndex, grid),
          `page-${index}-grid-${columnIndex}`,
          [],
          "section"
        )
      );
    });

    return wrap;
  }

  _badgeList(page, index) {
    const wrap = el("div");
    wrap.append(el("p", "hint", "Badges stehen oben in der Kopfzeile dieser Seite."));

    page.badges.forEach((badge, badgeIndex) => {
      const extras = [
        miniButton(
          "mdi:delete-outline",
          "Badge entfernen",
          () => this._mutate((draft) => draft.pages[index].badges.splice(badgeIndex, 1), true),
          "mini danger"
        ),
      ];
      wrap.append(
        this._block(
          badge.name || badge.entity || `Badge ${badgeIndex + 1}`,
          `${page.name} › Badges › ${badgeIndex + 1}`,
          () =>
            this._form(`badge:${index}:${badgeIndex}`, BADGE_SCHEMA, badge, (value) =>
              this._mutate((draft) => Object.assign(draft.pages[index].badges[badgeIndex], value))
            ),
          `page-${index}-badge-${badgeIndex}`,
          extras,
          "card"
        )
      );
    });

    const addBadge = el("button", "add");
    addBadge.append(icon("mdi:plus"), el("span", null, "Badge hinzufügen"));
    addBadge.addEventListener("click", () =>
      this._mutate((draft) => draft.pages[index].badges.push({ entity: "", tap_action: { action: "toggle" } }), true)
    );
    const addRow = el("div", "add-row");
    addRow.append(addBadge);
    wrap.append(addRow);

    return wrap;
  }

  /** Ebene 3: die Karten eines Rasters, jede wiederum aufklappbar. */
  _gridBody(page, pageIndex, columnIndex, grid) {
    const wrap = el("div");

    if (!grid.cards.length) {
      wrap.append(el("div", "empty", "Noch keine Karte in diesem Raster."));
    }

    grid.cards.forEach((card, cardIndex) => {
      const extras = [
        miniButton("mdi:arrow-up", "Nach oben", () => this._moveCard(pageIndex, columnIndex, cardIndex, -1)),
        miniButton("mdi:arrow-down", "Nach unten", () => this._moveCard(pageIndex, columnIndex, cardIndex, 1)),
        miniButton(
          "mdi:delete-outline",
          "Karte entfernen",
          () => this._mutate((draft) => draft.pages[pageIndex].grids[columnIndex].cards.splice(cardIndex, 1), true),
          "mini danger"
        ),
      ];

      wrap.append(
        this._block(
          `Karte ${cardIndex + 1} · ${this._cardLabel(card)}`,
          `${page.name} › Raster ${columnIndex + 1} › Karte ${cardIndex + 1}`,
          () => this._cardBody(pageIndex, columnIndex, cardIndex, card),
          `page-${pageIndex}-grid-${columnIndex}-card-${cardIndex}`,
          extras,
          "card"
        )
      );
    });

    const addRow = el("div", "add-row");

    const addOwn = el("button", "add");
    addOwn.append(icon("mdi:plus"), el("span", null, "HA-OS Karte"));
    addOwn.addEventListener("click", () =>
      this._mutate((draft) => {
        draft.pages[pageIndex].grids[columnIndex].cards.push({
          type: "custom:ha-os-card",
          card_type: "button",
          haos_weight: 1,
        });
      }, true)
    );

    const addGrid = el("button", "add");
    addGrid.append(icon("mdi:view-grid-outline"), el("span", null, "2×2-Raster"));
    addGrid.addEventListener("click", () =>
      this._mutate((draft) => {
        draft.pages[pageIndex].grids[columnIndex].cards.push({
          type: "custom:ha-os-grid",
          column_widths: [1, 1],
          gap: 12,
          cards: [],
          haos_weight: 2,
        });
      }, true)
    );

    // Die Fahrzeugkarte ist eine eigene Karte, kein Typ von `ha-os-card` –
    // sie taucht deshalb nicht in dessen Typenliste auf. Ohne einen eigenen
    // Knopf fände man sie nur über „Andere Karte wählen", wenn man weiss,
    // dass es sie gibt.
    const addVehicle = el("button", "add");
    addVehicle.append(icon("mdi:car"), el("span", null, "Fahrzeug"));
    addVehicle.addEventListener("click", () =>
      this._mutate((draft) => {
        draft.pages[pageIndex].grids[columnIndex].cards.push({
          type: "custom:ha-os-vehicle",
          entity: "",
          haos_weight: 3,
        });
      }, true)
    );

    const addPrinter = el("button", "add");
    addPrinter.append(icon("mdi:printer-3d"), el("span", null, "Drucker"));
    addPrinter.addEventListener("click", () =>
      this._mutate((draft) => {
        draft.pages[pageIndex].grids[columnIndex].cards.push({
          type: "custom:ha-os-printer",
          haos_weight: 3,
        });
      }, true)
    );

    const addOther = el("button", "add");
    addOther.append(icon("mdi:view-dashboard-outline"), el("span", null, "Andere Karte wählen"));
    addOther.addEventListener("click", () => {
      const key = `picker-${pageIndex}-${columnIndex}`;
      this._openPicker = this._openPicker === key ? null : key;
      this._renderPanels();
    });

    addRow.append(addOwn, addGrid, addVehicle, addPrinter, addOther);
    wrap.append(addRow);

    if (this._openPicker === `picker-${pageIndex}-${columnIndex}`) {
      wrap.append(
        this._cardPicker(async (type) => {
          const card = await stubConfigFor(type);
          this._openPicker = null;
          this._mutate((draft) => {
            draft.pages[pageIndex].grids[columnIndex].cards.push({ ...card, haos_weight: 1 });
          }, true);
        })
      );
    }

    return wrap;
  }

  _cardPicker(onPick) {
    const wrap = el("div", "picker");

    const search = document.createElement("input");
    search.className = "plain";
    search.type = "search";
    search.placeholder = "Karte suchen …";

    const list = el("div", "picker-list");
    const entries = cardCatalog();

    const fill = (term) => {
      const needle = term.trim().toLowerCase();
      const hits = entries.filter(
        (entry) =>
          !needle ||
          entry.name.toLowerCase().includes(needle) ||
          entry.type.toLowerCase().includes(needle) ||
          entry.description.toLowerCase().includes(needle)
      );

      list.replaceChildren();
      if (!hits.length) {
        list.append(el("div", "empty", "Keine Karte gefunden."));
        return;
      }

      hits.forEach((entry) => {
        const item = el("button", "picker-item");
        const text = el("div", "pi-text");
        text.append(el("div", "pi-name", entry.name), el("div", "pi-desc", entry.description || entry.type));
        item.append(icon(entry.icon), text);
        if (entry.custom) item.append(el("span", "pi-tag", "installiert"));
        item.addEventListener("click", () => onPick(entry.type));
        list.append(item);
      });
    };

    // Kein _render() beim Tippen: der Editor würde neu aufgebaut und das
    // Suchfeld verlöre nach jedem Zeichen den Fokus.
    search.addEventListener("input", () => fill(search.value));
    fill("");

    wrap.append(search, list);
    return wrap;
  }

  /**
   * Beschriftung einer Karte in der Liste.
   *
   * Ohne Namen sehen vier Taster nebeneinander alle gleich aus – „HA-OS ·
   * button", viermal. Deshalb kommt dahinter, was die Karte tatsächlich
   * bedient: der eingetragene Name, sonst der Name der Entität aus Home
   * Assistant, sonst die Entitäts-ID. Erst dann ist die Liste zu gebrauchen.
   */
  _cardLabel(card) {
    const base =
      card.type === "custom:ha-os-card" ? `HA-OS · ${card.card_type || "unbestimmt"}` : card.type || "Karte";

    const entity = card.entity || card.entities?.[0];
    const named =
      card.name ||
      (entity ? this._hass?.states?.[entity]?.attributes?.friendly_name || entity : "");

    return named ? `${base} · ${named}` : base;
  }

  _moveCard(pageIndex, columnIndex, cardIndex, delta) {
    const cards = this._config.pages[pageIndex].grids[columnIndex].cards;
    const target = cardIndex + delta;
    if (target < 0 || target >= cards.length) return;
    this._mutate((draft) => {
      const list = draft.pages[pageIndex].grids[columnIndex].cards;
      const [item] = list.splice(cardIndex, 1);
      list.splice(target, 0, item);
    }, true);
  }

  _cardBody(pageIndex, columnIndex, cardIndex, card) {
    const wrap = el("div");
    const write = (value) =>
      this._mutate((draft) => {
        draft.pages[pageIndex].grids[columnIndex].cards[cardIndex] = value;
      });

    if (card.type === "custom:ha-os-card") {
      // Eigener Editor – wir kontrollieren ihn, daher stabil einbettbar.
      const editor = document.createElement("ha-os-card-editor");
      editor.hass = this._hass;
      editor.setConfig(card);
      editor.addEventListener("config-changed", (event) => {
        event.stopPropagation();
        write({ ...event.detail.config, type: "custom:ha-os-card" });
      });
      wrap.append(editor);
      return wrap;
    }

    // Home Assistants eigener Karteneditor, mit Umschalter auf YAML. Der
    // Umschalter ist noetig, weil manche Karten in ihrer Eingabemaske nicht
    // alle Felder anbieten - die alte glass-devices-card etwa keine Entitaet.
    const codeKey = `${pageIndex}-${columnIndex}-${cardIndex}`;
    this._codeMode = this._codeMode || new Set();

    wrap.append(
      createCardEditorWithCode({
        hass: this._hass,
        value: card,
        onChange: (next) => write({ ...next, haos_weight: card.haos_weight }),
        codeMode: this._codeMode.has(codeKey),
        onToggleCode: () => {
          if (this._codeMode.has(codeKey)) this._codeMode.delete(codeKey);
          else this._codeMode.add(codeKey);
          this._renderPanels();
        },
        el,
      })
    );

    wrap.append(this._weightField(card, write));
    return wrap;
  }

  _weightField(card, write) {
    const weight = el("div", "field");
    weight.append(el("label", null, "Höhenfaktor (1 = Standardhöhe)"));
    const input = el("input", "plain");
    input.type = "number";
    input.min = "0.1";
    input.max = "6";
    input.step = "0.05";
    input.value = card.haos_weight ?? 1;
    input.addEventListener("change", () => write({ ...card, haos_weight: Number(input.value) }));
    weight.append(input);
    return weight;
  }
}

if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, HaOsShellEditor);

export { HaOsShellEditor };
