/**
 * HA-OS – Editor der Shell-Karte
 *
 * Drei Reiter: Allgemein, Seiten, Karten.
 *
 * Gegen Fokusverlust gilt hier dieselbe Regel wie im Karten-Editor:
 * <ha-form>-Elemente werden gecacht und nur über .data aktualisiert. Der
 * Editor baut sein DOM nur dann neu auf, wenn sich die STRUKTUR ändert
 * (Seite/Karte hinzugefügt, entfernt, verschoben) – nicht beim Tippen.
 */

import { normalizeShellConfig, createEmptyGrids, DEFAULT_GRID_WIDTHS } from "../shared/config.js";
import { isEqualConfig, deepClone } from "../shared/utils.js";
import { cardCatalog, stubConfigFor, createHaCardEditor } from "../shared/card-catalog.js";

const EDITOR_TAG = "ha-os-shell-editor";

const LABELS = {
  gap: "Abstand zwischen Karten",
  row_height: "Kartenhöhe in px",
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
  entity: "Entität",
  show_state: "Zustand anzeigen",
  tap_action: "Tippen",
};

const HELPERS = {
  sidebar_pages: "Jede Seite bekommt ein Symbol in der linken Leiste.",
  topbar_tabs:
    "Ausschalten, wenn die Seitenleiste reichen soll – bei vielen Seiten läuft die Kopfzeile sonst über.",
  gap: "Gilt gleichmäßig waagerecht und senkrecht.",
  row_height: "Grundhöhe einer Karte mit Höhenfaktor 1.",
  fullscreen_entity: "Ein input_boolean, das den Vollbildmodus schaltet. Leer lassen, um den Knopf auszublenden.",
  users: "Leer lassen, um automatisch alle person-Entitäten anzuzeigen.",
};

const GENERAL_SCHEMA = [
  { name: "gap", selector: { number: { min: 0, max: 48, step: 1, mode: "slider" } } },
  { name: "row_height", selector: { number: { min: 60, max: 320, step: 5, mode: "slider" } } },
  { name: "users", selector: { entity: { domain: ["person", "device_tracker"], multiple: true } } },
  { name: "fullscreen_entity", selector: { entity: { domain: ["input_boolean"] } } },
  { name: "sidebar_pages", selector: { boolean: {} } },
  { name: "topbar_tabs", selector: { boolean: {} } },
  { name: "show_settings_button", selector: { boolean: {} } },
  { name: "show_theme_button", selector: { boolean: {} } },
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
];

const BADGE_SCHEMA = [
  { name: "entity", selector: { entity: {} } },
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

  .grid-head { display: flex; align-items: center; gap: 8px; margin: 4px 0 2px; font-size: 13px; font-weight: 600; }
  .grid-head .weight { flex: 1; font-weight: 400; color: var(--secondary-text-color); font-size: 11px; }

  /* Nummerierte Reiter für die Karten eines Rasters – Vorbild ist HAs eigene
     Raster-Karte. Alle Editoren untereinander wurden schnell unübersichtlich. */
  .card-tabs {
    display: flex; flex-wrap: wrap; align-items: center; gap: 2px;
    border-bottom: 1px solid var(--divider-color, rgba(127,127,127,.3));
  }
  .card-tab {
    min-width: 36px; height: 36px; padding: 0 8px; border: 0; background: none; cursor: pointer;
    font: inherit; font-size: 13px; color: var(--secondary-text-color);
    border-bottom: 2px solid transparent; margin-bottom: -1px;
  }
  .card-tab:hover { color: var(--primary-text-color); }
  .card-tab.active { color: var(--primary-color); border-bottom-color: var(--primary-color); font-weight: 600; }

  .hint { margin: 0; font-size: 12px; line-height: 1.45; color: var(--secondary-text-color); }
  .empty { padding: 14px; text-align: center; font-size: 12px; color: var(--secondary-text-color); }

  select.plain, input.plain {
    width: 100%; padding: 9px 10px; font: inherit; color: var(--primary-text-color);
    background: var(--secondary-background-color, rgba(127,127,127,.08));
    border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 8px;
  }
  .field { display: grid; gap: 5px; margin-bottom: 10px; }
  .field > label { font-size: 12px; color: var(--secondary-text-color); }
  .widths { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }

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
    this._tab = "general";
    this._editingPageIndex = 0;
    this._open = new Set();
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
    ) + `|${config.quick_actions.length}|${this._tab}|${this._editingPageIndex}`;
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
    [
      ["general", "Allgemein"],
      ["pages", "Seiten"],
      ["cards", "Karten"],
    ].forEach(([id, label]) => {
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
      tab.classList.toggle("active", ["general", "pages", "cards"][index] === this._tab);
    });

    this._forms.clear();
    this._panel.replaceChildren();

    if (this._tab === "general") this._renderGeneral();
    else if (this._tab === "pages") this._renderPages();
    else this._renderCards();
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
    if (kind === "general") return this._config;
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

  /**
   * @param alwaysOpen Für Blöcke, die ohnehin einzeln über Reiter gewählt
   *   werden – dort wäre ein zusätzliches Aufklappen ein Klick zu viel.
   */
  _block(labelText, subText, bodyBuilder, openKey, headerExtras = [], alwaysOpen = false) {
    const block = el("div", "block");
    const header = document.createElement("header");

    const label = el("div", "label", labelText);
    if (subText) {
      const sub = el("div", "sub", subText);
      const wrap = el("div");
      wrap.style.cssText = "flex:1;min-width:0";
      wrap.append(label, sub);
      header.append(wrap);
    } else {
      header.append(label);
    }

    const body = el("div", "body");
    body.hidden = alwaysOpen ? false : !this._open.has(openKey);

    if (alwaysOpen) {
      header.append(...headerExtras);
    } else {
      const toggle = miniButton(body.hidden ? "mdi:chevron-down" : "mdi:chevron-up", "Aufklappen", () => {
        const open = this._open.has(openKey);
        if (open) this._open.delete(openKey);
        else this._open.add(openKey);
        body.hidden = open;
        toggle.querySelector("ha-icon")?.setAttribute("icon", open ? "mdi:chevron-down" : "mdi:chevron-up");
      });
      header.append(...headerExtras, toggle);
    }
    block.append(header, body);
    if (!body.hidden || true) body.append(bodyBuilder());
    return block;
  }

  // ---------------------------------------------------------------- Allgemein

  _renderGeneral() {
    this._panel.append(
      this._form("general", GENERAL_SCHEMA, this._config, (value) => {
        this._config = normalizeShellConfig({ ...this._config, ...value });
        this._emit();
      })
    );

    const actions = el("div", "panel");
    actions.append(el("p", "hint", "Schnellaktionen erscheinen als Symbole oben in der Seitenleiste."));

    this._config.quick_actions.forEach((action, index) => {
      const extras = [
        miniButton("mdi:arrow-up", "Nach oben", () => this._moveQuickAction(index, -1)),
        miniButton("mdi:arrow-down", "Nach unten", () => this._moveQuickAction(index, 1)),
        miniButton("mdi:delete-outline", "Entfernen", () => this._mutate((draft) => draft.quick_actions.splice(index, 1), true), "mini danger"),
      ];
      actions.append(
        this._block(
          action.name || action.entity || `Aktion ${index + 1}`,
          action.icon,
          () =>
            this._form(`action:${index}`, QUICK_ACTION_SCHEMA, action, (value) =>
              this._mutate((draft) => Object.assign(draft.quick_actions[index], value))
            ),
          `action-${index}`,
          extras
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
        "Die erste Seite ist immer Home. Jede weitere Seite erhält automatisch drei leere Raster, " +
          "ein Symbol in der Seitenleiste und einen Reiter in der Kopfzeile – beides unter Allgemein abschaltbar."
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
          extras
        )
      );
    });

    const add = el("button", "add");
    add.append(icon("mdi:plus"), el("span", null, "Seite hinzufügen"));
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

    const addRow = el("div", "add-row");
    addRow.append(add);
    this._panel.append(addRow);
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

    wrap.append(
      this._form(`page:${index}`, PAGE_SCHEMA, page, (value) =>
        this._mutate((draft) => Object.assign(draft.pages[index], value), value.kind !== page.kind)
      )
    );

    if (page.kind === "iframe") {
      wrap.append(
        this._form(`iframe:${index}`, IFRAME_SCHEMA, page, (value) =>
          this._mutate((draft) => Object.assign(draft.pages[index], value))
        )
      );
    } else {
      const widths = el("div", "field");
      widths.append(el("label", null, "Spaltenbreiten (Verhältnis der drei Raster)"));
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
      wrap.append(widths);
    }

    // Badges
    wrap.append(el("p", "hint", "Badges stehen oben in der Kopfzeile dieser Seite."));
    page.badges.forEach((badge, badgeIndex) => {
      const extras = [
        miniButton("mdi:delete-outline", "Badge entfernen", () => this._mutate((draft) => draft.pages[index].badges.splice(badgeIndex, 1), true), "mini danger"),
      ];
      wrap.append(
        this._block(
          badge.name || badge.entity || `Badge ${badgeIndex + 1}`,
          "",
          () =>
            this._form(`badge:${index}:${badgeIndex}`, BADGE_SCHEMA, badge, (value) =>
              this._mutate((draft) => Object.assign(draft.pages[index].badges[badgeIndex], value))
            ),
          `badge-${index}-${badgeIndex}`,
          extras
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

  // ---------------------------------------------------------------- Karten

  _renderCards() {
    const pageIndex = Math.min(this._editingPageIndex, this._config.pages.length - 1);
    const page = this._config.pages[pageIndex];

    const picker = el("div", "field");
    picker.append(el("label", null, "Seite"));
    const select = el("select", "plain");
    this._config.pages.forEach((entry, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = entry.name;
      if (index === pageIndex) option.selected = true;
      select.append(option);
    });
    select.addEventListener("change", () => {
      this._editingPageIndex = Number(select.value);
      this._renderPanels();
    });
    picker.append(select);
    this._panel.append(picker);

    if (page.kind === "iframe") {
      this._panel.append(el("div", "empty", "Externe Seiten haben keine Raster."));
      return;
    }

    page.grids.forEach((grid, columnIndex) => {
      const head = el("div", "grid-head");
      head.append(
        el("span", null, `Raster ${columnIndex + 1}`),
        el("span", "weight", `Breite ${page.grid_widths[columnIndex]}`)
      );
      this._panel.append(head);

      if (!grid.cards.length) {
        this._panel.append(el("div", "empty", "Noch keine Karte in diesem Raster."));
      }

      // Nummerierte Reiter statt aller Karteneditoren untereinander. Bei
      // mehr als zwei Karten wurde die Liste sonst unübersichtlich lang.
      const tabKey = `${pageIndex}-${columnIndex}`;
      this._gridTab = this._gridTab || {};
      const openTab = Math.min(this._gridTab[tabKey] ?? 0, Math.max(grid.cards.length - 1, 0));

      if (grid.cards.length) {
        const tabs = el("div", "card-tabs");
        grid.cards.forEach((card, cardIndex) => {
          const tab = el("button", `card-tab${cardIndex === openTab ? " active" : ""}`, String(cardIndex + 1));
          tab.title = this._cardLabel(card);
          tab.addEventListener("click", () => {
            this._gridTab[tabKey] = cardIndex;
            this._render();
          });
          tabs.append(tab);
        });
        this._panel.append(tabs);

        const card = grid.cards[openTab];
        const extras = [
          miniButton("mdi:arrow-up", "Nach oben", () => this._moveCard(pageIndex, columnIndex, openTab, -1)),
          miniButton("mdi:arrow-down", "Nach unten", () => this._moveCard(pageIndex, columnIndex, openTab, 1)),
          miniButton(
            "mdi:delete-outline",
            "Karte entfernen",
            () => {
              this._gridTab[tabKey] = Math.max(openTab - 1, 0);
              this._mutate((draft) => draft.pages[pageIndex].grids[columnIndex].cards.splice(openTab, 1), true);
            },
            "mini danger"
          ),
        ];

        this._panel.append(
          this._block(
            this._cardLabel(card),
            `Karte ${openTab + 1} von ${grid.cards.length} · ${card.type}`,
            () => this._cardBody(pageIndex, columnIndex, openTab, card),
            `card-${pageIndex}-${columnIndex}-${openTab}`,
            extras,
            true
          )
        );
      }

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

      const addOther = el("button", "add");
      addOther.append(icon("mdi:view-dashboard-outline"), el("span", null, "Andere Karte wählen"));
      addOther.addEventListener("click", () => {
        const key = `picker-${pageIndex}-${columnIndex}`;
        this._openPicker = this._openPicker === key ? null : key;
        this._render();
      });

      addRow.append(addOwn, addOther);
      this._panel.append(addRow);

      if (this._openPicker === `picker-${pageIndex}-${columnIndex}`) {
        this._panel.append(
          this._cardPicker(async (type) => {
            const card = await stubConfigFor(type);
            this._openPicker = null;
            this._mutate((draft) => {
              draft.pages[pageIndex].grids[columnIndex].cards.push({ ...card, haos_weight: 1 });
            }, true);
          })
        );
      }
    });
  }

  /**
   * Auswahlliste aller installierten Karten.
   *
   * Eigenbau, weil `hui-card-picker` sich von außen nicht zuverlässig laden
   * lässt – er kommt erst, wenn der Anwender in Home Assistant selbst auf
   * "Karte hinzufügen" tippt. `window.customCards` dagegen ist immer da:
   * dort trägt sich jede installierte Fremdkarte beim Laden selbst ein.
   */
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

  _cardLabel(card) {
    if (card.type === "custom:ha-os-card") return `HA-OS · ${card.card_type || "unbestimmt"}`;
    return card.type || "Karte";
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

    // Home Assistants eigener Karteneditor. Er liefert für jede installierte
    // Karte deren echte Eingabemaske – Entitätswähler, Farbwahl, alles.
    const haEditor = createHaCardEditor({
      hass: this._hass,
      value: card,
      onChange: (next) => write({ ...next, haos_weight: card.haos_weight }),
    });

    if (haEditor) {
      wrap.append(haEditor);
      wrap.append(this._weightField(card, write));
      return wrap;
    }

    wrap.append(
      el(
        "p",
        "hint",
        "Der Karteneditor von Home Assistant steht hier nicht zur Verfügung – " +
          "Konfiguration deshalb als YAML."
      )
    );

    const yamlEditor = document.createElement("ha-yaml-editor");
    if (typeof yamlEditor.setConfig === "function" || "defaultValue" in yamlEditor || customElements.get("ha-yaml-editor")) {
      yamlEditor.defaultValue = card;
      yamlEditor.addEventListener("value-changed", (event) => {
        event.stopPropagation();
        if (event.detail.isValid === false) return;
        write({ ...event.detail.value, haos_weight: card.haos_weight });
      });
      wrap.append(yamlEditor);
    } else {
      // Rückfallebene, falls ha-yaml-editor in dieser HA-Version fehlt.
      const area = document.createElement("textarea");
      area.className = "plain";
      area.rows = 10;
      area.value = JSON.stringify(card, null, 2);
      area.addEventListener("change", () => {
        try {
          write({ ...JSON.parse(area.value), haos_weight: card.haos_weight });
        } catch (_error) {
          /* Ungültiges JSON – Eingabe bleibt stehen, nichts wird gespeichert. */
        }
      });
      wrap.append(area);
    }

    wrap.append(this._weightField(card, write));
    return wrap;
  }

  _weightField(card, write) {
    const weight = el("div", "field");
    weight.append(el("label", null, "Höhenfaktor (1 = Standardhöhe)"));
    const input = el("input", "plain");
    input.type = "number";
    input.min = "0.5";
    input.max = "6";
    input.step = "0.25";
    input.value = card.haos_weight ?? 1;
    input.addEventListener("change", () => write({ ...card, haos_weight: Number(input.value) }));
    weight.append(input);
    return weight;
  }
}

if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, HaOsShellEditor);

export { HaOsShellEditor };
