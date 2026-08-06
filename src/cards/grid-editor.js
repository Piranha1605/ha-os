/**
 * HA-OS – Editor der 2×2-Rasterkarte
 *
 * Vier Plätze, jeder mit Auswahlliste und dem echten Karteneditor von Home
 * Assistant. Kein YAML, solange `hui-card-element-editor` verfügbar ist.
 *
 * Wie im Shell-Editor gilt: neu aufgebaut wird nur bei Änderungen an der
 * Struktur (Karte gewählt, entfernt, Platz aufgeklappt) – nicht beim Tippen.
 * Sonst verlöre das gerade beschriebene Feld nach jedem Zeichen den Fokus.
 */

import { deepClone, isEqualConfig } from "../shared/utils.js";
import { cardCatalog, stubConfigFor, createCardEditorWithCode } from "../shared/card-catalog.js";
import { GRID_EDITOR_TAG, SLOTS } from "./grid-card.js";

const STYLES = `
  :host { display: block; }
  * { box-sizing: border-box; }
  button { font: inherit; cursor: pointer; }

  .wrap { display: grid; gap: 12px; }
  .hint { margin: 0; font-size: 12px; line-height: 1.45; color: var(--secondary-text-color); }

  .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .field { display: grid; gap: 5px; }
  .field > label { font-size: 12px; color: var(--secondary-text-color); }
  input.plain {
    width: 100%; padding: 9px 10px; font: inherit; color: var(--primary-text-color);
    background: var(--secondary-background-color, rgba(127,127,127,.08));
    border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 8px;
  }
  .toggle { display: flex; align-items: center; gap: 8px; font-size: 13px; }

  /* Nummerierte Reiter für die Plätze – wie in HAs eigener Raster-Karte.
     Alle vier Editoren untereinander waren unübersichtlich. */
  .slot-tabs {
    display: flex; align-items: center; gap: 2px;
    border-bottom: 1px solid var(--divider-color, rgba(127,127,127,.3));
    margin-bottom: 10px;
  }
  .slot-tab {
    min-width: 40px; height: 40px; padding: 0 10px; border: 0; background: none;
    color: var(--secondary-text-color); font-size: 14px;
    border-bottom: 2px solid transparent; margin-bottom: -1px;
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  }
  .slot-tab:hover { color: var(--primary-text-color); }
  .slot-tab.active { color: var(--primary-color); border-bottom-color: var(--primary-color); font-weight: 600; }
  .slot-tab .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary-color); opacity: .55; }
  .slot-tab.empty .dot { background: var(--secondary-text-color); opacity: .3; }

  .slot { border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 10px; overflow: hidden; }
  .slot > header {
    display: flex; align-items: center; gap: 8px; padding: 8px 10px;
    background: var(--secondary-background-color, rgba(127,127,127,.08));
  }
  .slot > header .label { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .slot > header .pos { font-size: 11px; font-weight: 400; color: var(--secondary-text-color); }
  .slot > .body { padding: 10px; }
  .slot > .body[hidden] { display: none; }

  .mini { width: 32px; height: 32px; flex: 0 0 32px; border: 0; border-radius: 8px; background: none; color: var(--secondary-text-color); display: grid; place-items: center; }
  .mini:hover { background: rgba(127,127,127,.16); color: var(--primary-text-color); }
  .mini.danger:hover { color: var(--error-color, #db4437); }
  .mini ha-icon { --mdc-icon-size: 18px; }

  .choose {
    width: 100%; padding: 12px; border: 1px dashed var(--divider-color, rgba(127,127,127,.4));
    border-radius: 10px; background: none; color: var(--primary-color);
    display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .choose:hover { background: rgba(127,127,127,.08); }

  /* Umschalter auf den Code-Editor – wie in HAs eigenem Kartendialog unten. */
  .linkish {
    margin-top: 10px; padding: 6px 0; border: 0; background: none; cursor: pointer;
    font: inherit; font-size: 13px; color: var(--primary-color);
  }

  .picker { display: grid; gap: 8px; }
  .picker-list {
    max-height: 300px; overflow-y: auto; display: grid; gap: 4px;
    border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 10px; padding: 6px;
  }
  .picker-item {
    display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px;
    border: 0; border-radius: 8px; background: none; color: var(--primary-text-color); text-align: left;
  }
  .picker-item:hover { background: rgba(127,127,127,.14); }
  .picker-item ha-icon { --mdc-icon-size: 20px; color: var(--secondary-text-color); flex: 0 0 20px; }
  .picker-item .pi-name { font-size: 13px; font-weight: 600; }
  .picker-item .pi-desc { font-size: 11px; color: var(--secondary-text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .picker-item .pi-tag { margin-left: auto; font-size: 10px; padding: 2px 6px; border-radius: 6px; background: rgba(127,127,127,.18); color: var(--secondary-text-color); }

  .empty { padding: 12px; text-align: center; font-size: 12px; color: var(--secondary-text-color); }
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

const miniButton = (symbol, title, onClick, className = "mini") => {
  const node = el("button", className);
  node.title = title;
  node.setAttribute("aria-label", title);
  node.append(icon(symbol));
  node.addEventListener("click", onClick);
  return node;
};

const labelFor = (card) => {
  if (!card?.type) return "Leer";
  const entry = cardCatalog().find((item) => item.type === card.type);
  return entry ? entry.name : card.type;
};

class HaOsGridEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._tab = 0;
    this._picking = null;
  }

  setConfig(config) {
    const next = {
      column_widths: [1, 1],
      gap: 12,
      framed: false,
      responsive: true,
      cards: [],
      ...config,
    };
    if (isEqualConfig(next, this._config) && this._root) return;
    this._config = next;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    // Home Assistant setzt hass teils vor setConfig. Ohne Konfiguration gäbe
    // es hier nichts zu zeichnen – und der Zugriff darauf liefe ins Leere.
    if (!this._root && this._config) this._render();
  }

  get hass() {
    return this._hass;
  }

  _emit() {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  /** @param structural true, wenn sich der Aufbau ändert und neu gezeichnet werden muss. */
  _mutate(change, structural = false) {
    const draft = deepClone(this._config);
    change(draft);
    this._config = draft;
    this._emit();
    if (structural) this._render();
  }

  _render() {
    if (!this._root) {
      const style = document.createElement("style");
      style.textContent = STYLES;
      this._root = el("div", "wrap");
      this.shadowRoot.replaceChildren(style, this._root);
    }
    this._root.replaceChildren();

    this._root.append(
      el(
        "p",
        "hint",
        "Vier Plätze in zwei Spalten und zwei Reihen. In jeden Platz passt jede installierte Karte."
      )
    );

    const row = el("div", "row2");
    row.append(
      this._numberField("Breite linke Spalte", this._config.column_widths?.[0] ?? 1, (value) =>
        this._mutate((draft) => {
          draft.column_widths = [value, draft.column_widths?.[1] ?? 1];
        })
      ),
      this._numberField("Breite rechte Spalte", this._config.column_widths?.[1] ?? 1, (value) =>
        this._mutate((draft) => {
          draft.column_widths = [draft.column_widths?.[0] ?? 1, value];
        })
      )
    );
    this._root.append(row);

    this._root.append(
      this._numberField("Abstand in px", this._config.gap ?? 12, (value) =>
        this._mutate((draft) => {
          draft.gap = value;
        })
      , 0, 60, 1)
    );

    this._root.append(
      this._switchField("Eigene Glasfläche um das Raster", this._config.framed === true, (checked) =>
        this._mutate((draft) => {
          draft.framed = checked;
        })
      ),
      this._switchField("Auf dem Telefon untereinander", this._config.responsive !== false, (checked) =>
        this._mutate((draft) => {
          draft.responsive = checked;
        })
      )
    );

    // Ein Platz nach dem anderen, ausgewählt über nummerierte Reiter.
    if (this._tab == null || this._tab >= SLOTS) this._tab = 0;

    const tabs = el("div", "slot-tabs");
    for (let index = 0; index < SLOTS; index += 1) {
      const belegt = Boolean(this._config.cards?.[index]?.type);
      const tab = el("button", `slot-tab${index === this._tab ? " active" : ""}${belegt ? "" : " empty"}`);
      tab.append(el("span", null, String(index + 1)), el("span", "dot"));
      tab.title = belegt ? labelFor(this._config.cards[index]) : "Leer";
      tab.addEventListener("click", () => {
        this._tab = index;
        this._picking = null;
        this._open = null;
        this._render();
      });
      tabs.append(tab);
    }
    this._root.append(tabs);
    this._root.append(this._slotBlock(this._tab));
  }

  _numberField(label, value, onChange, min = 0.25, max = 6, step = 0.25) {
    const field = el("div", "field");
    field.append(el("label", null, label));
    const input = el("input", "plain");
    input.type = "number";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = value;
    // change statt input: sonst löst jeder Tastendruck ein Neuzeichnen aus.
    input.addEventListener("change", () => onChange(Number(input.value)));
    field.append(input);
    return field;
  }

  _switchField(label, checked, onChange) {
    const wrap = el("label", "toggle");
    const box = document.createElement("ha-switch");
    box.checked = checked;
    box.addEventListener("change", () => onChange(box.checked));
    wrap.append(box, el("span", null, label));
    return wrap;
  }

  _slotBlock(index) {
    const card = this._config.cards?.[index];
    const block = el("div", "slot");
    const header = document.createElement("header");

    header.append(
      el("span", "label", labelFor(card)),
      el("span", "pos", `Platz ${index + 1}`)
    );

    if (card?.type) {
      header.append(
        miniButton("mdi:swap-horizontal", "Andere Karte wählen", () => {
          this._picking = this._picking === index ? null : index;
          this._render();
        }),
        miniButton(
          "mdi:delete-outline",
          "Karte entfernen",
          () =>
            this._mutate((draft) => {
              draft.cards = draft.cards || [];
              draft.cards[index] = null;
              while (draft.cards.length && draft.cards[draft.cards.length - 1] == null) draft.cards.pop();
            }, true),
          "mini danger"
        )
      );
    }

    block.append(header);

    // Der gewählte Platz ist immer aufgeklappt – es wird ohnehin nur einer
    // gezeigt, ein zusätzliches Auf- und Zuklappen wäre ein Klick zu viel.
    const body = el("div", "body");
    if (this._picking === index) {
      body.append(this._picker(index));
    } else if (!card?.type) {
      const choose = el("button", "choose");
      choose.append(icon("mdi:plus"), el("span", null, "Karte wählen"));
      choose.addEventListener("click", () => {
        this._picking = index;
        this._render();
      });
      body.append(choose);
    } else {
      body.append(this._cardEditor(index, card));
    }

    block.append(body);
    return block;
  }

  _picker(index) {
    const wrap = el("div", "picker");
    const search = el("input", "plain");
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
        const text = el("div");
        text.append(el("div", "pi-name", entry.name), el("div", "pi-desc", entry.description || entry.type));
        item.append(icon(entry.icon), text);
        if (entry.custom) item.append(el("span", "pi-tag", "installiert"));
        item.addEventListener("click", async () => {
          const stub = await stubConfigFor(entry.type);
          this._picking = null;
          this._mutate((draft) => {
            draft.cards = draft.cards || [];
            while (draft.cards.length < index) draft.cards.push(null);
            draft.cards[index] = stub;
          }, true);
        });
        list.append(item);
      });
    };

    // Kein _render() beim Tippen – das Suchfeld soll den Fokus behalten.
    search.addEventListener("input", () => fill(search.value));
    fill("");

    wrap.append(search, list);
    return wrap;
  }

  _cardEditor(index, card) {
    const write = (next) =>
      this._mutate((draft) => {
        draft.cards[index] = next;
      });

    // Mit Umschalter auf YAML: manche Karten bieten in ihrer Eingabemaske
    // nicht alle Felder an – die alte glass-devices-card etwa keine Entitaet.
    this._codeMode = this._codeMode || new Set();

    return createCardEditorWithCode({
      hass: this._hass,
      value: card,
      onChange: write,
      codeMode: this._codeMode.has(index),
      onToggleCode: () => {
        if (this._codeMode.has(index)) this._codeMode.delete(index);
        else this._codeMode.add(index);
        this._render();
      },
      el,
    });
  }
}

if (!customElements.get(GRID_EDITOR_TAG)) customElements.define(GRID_EDITOR_TAG, HaOsGridEditor);

export { HaOsGridEditor };
