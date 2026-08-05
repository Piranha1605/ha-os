/**
 * HA-OS – Kartenauswahl und eingebetteter Home-Assistant-Karteneditor
 *
 * Ziel: Fremdkarten sollen sich wie in Home Assistant selbst konfigurieren
 * lassen – mit Auswahlliste und grafischem Editor statt YAML.
 *
 * Zwei Befunde aus der Prüfung im laufenden Frontend (HA im August 2026):
 *
 * 1. `hui-card-element-editor` ist verfügbar, sobald unser Editor läuft.
 *    Er steckt im selben nachgeladenen Paket wie HAs Kartendialog – und in
 *    dem läuft unser Editor immer. Eingesetzt liefert er den echten Editor
 *    der jeweiligen Karte, inklusive Entitätswähler und Farbwahl.
 *
 * 2. `hui-card-picker` ist NICHT verfügbar. Der lädt erst, wenn der Anwender
 *    in Home Assistant selbst auf "Karte hinzufügen" tippt, und lässt sich
 *    von außen nicht zuverlässig nachladen. Die Auswahlliste bauen wir
 *    deshalb selbst – aus `window.customCards`, wo sich jede installierte
 *    Fremdkarte registriert, plus den Standardkarten von Home Assistant.
 */

/**
 * Standardkarten von Home Assistant.
 *
 * Home Assistant führt diese Liste intern, macht sie aber nicht zugänglich.
 * Sie ist hier bewusst kurz gehalten: die gebräuchlichen Karten, nicht jede
 * Randerscheinung. Was fehlt, lässt sich weiterhin über YAML eintragen.
 */
export const STANDARD_CARDS = [
  { type: "tile", name: "Kachel", description: "Kompakte Kachel mit Symbol, Name und Zustand.", icon: "mdi:card-outline" },
  { type: "entities", name: "Entitäten", description: "Liste mehrerer Entitäten untereinander.", icon: "mdi:format-list-bulleted" },
  { type: "button", name: "Schaltfläche", description: "Großer Knopf mit Symbol.", icon: "mdi:gesture-tap-button" },
  { type: "light", name: "Licht", description: "Helligkeitsregler mit Farbwahl.", icon: "mdi:lightbulb" },
  { type: "thermostat", name: "Thermostat", description: "Temperaturregler mit Drehknopf.", icon: "mdi:thermostat" },
  { type: "weather-forecast", name: "Wetter", description: "Aktuelles Wetter mit Vorhersage.", icon: "mdi:weather-partly-cloudy" },
  { type: "media-control", name: "Medien", description: "Steuerung eines Media Players.", icon: "mdi:speaker" },
  { type: "history-graph", name: "Verlauf", description: "Verlaufskurve über die Zeit.", icon: "mdi:chart-line" },
  { type: "statistic", name: "Statistik", description: "Ein einzelner statistischer Wert.", icon: "mdi:chart-box-outline" },
  { type: "gauge", name: "Messuhr", description: "Rundanzeige für einen Messwert.", icon: "mdi:gauge" },
  { type: "picture-entity", name: "Bild mit Entität", description: "Bild, das auf einen Zustand reagiert.", icon: "mdi:image" },
  { type: "map", name: "Karte", description: "Standorte auf einer Landkarte.", icon: "mdi:map" },
  { type: "markdown", name: "Text", description: "Freier Text mit Vorlagen.", icon: "mdi:text" },
  { type: "iframe", name: "Webseite", description: "Eingebettete Webseite.", icon: "mdi:web" },
  { type: "calendar", name: "Kalender", description: "Termine aus Kalender-Entitäten.", icon: "mdi:calendar" },
  { type: "conditional", name: "Bedingt", description: "Zeigt eine Karte nur unter einer Bedingung.", icon: "mdi:eye-check-outline" },
  { type: "vertical-stack", name: "Stapel senkrecht", description: "Mehrere Karten untereinander.", icon: "mdi:view-sequential" },
  { type: "horizontal-stack", name: "Stapel waagerecht", description: "Mehrere Karten nebeneinander.", icon: "mdi:view-column" },
  { type: "grid", name: "Raster", description: "Karten in einem Raster.", icon: "mdi:view-grid" },
];

/**
 * Alle wählbaren Karten: Standardkarten plus jede installierte Fremdkarte.
 *
 * `window.customCards` füllt jede Karte selbst beim Laden – dort stehen also
 * genau die Karten, die auf diesem Home Assistant tatsächlich vorhanden sind.
 */
export const cardCatalog = () => {
  const custom = (window.customCards || [])
    .filter((entry) => entry?.type && !String(entry.type).startsWith("ha-os-"))
    .map((entry) => ({
      type: `custom:${String(entry.type).replace(/^custom:/, "")}`,
      name: entry.name || entry.type,
      description: entry.description || "",
      icon: "mdi:puzzle-outline",
      custom: true,
    }));

  const seen = new Set();
  return [...STANDARD_CARDS, ...custom].filter((entry) => {
    if (seen.has(entry.type)) return false;
    seen.add(entry.type);
    return true;
  });
};

/** Sinnvolle Startkonfiguration für eine neu eingefügte Karte. */
export const stubConfigFor = async (type) => {
  const bare = String(type).replace(/^custom:/, "");
  const element = customElements.get(bare);

  // Viele Karten bringen eine eigene Startkonfiguration mit.
  try {
    const stub = await element?.getStubConfig?.();
    if (stub) return { ...stub, type };
  } catch (_error) {
    /* Karte kann keine liefern – Standardfall unten. */
  }

  if (type === "entities") return { type, entities: [] };
  if (type === "markdown") return { type, content: "Text hier eintragen." };
  if (["vertical-stack", "horizontal-stack", "grid"].includes(type)) return { type, cards: [] };
  return { type };
};

/**
 * Erzeugt HAs eigenen Karteneditor für eine beliebige Karte.
 *
 * Gibt `null` zurück, wenn `hui-card-element-editor` in dieser
 * Home-Assistant-Version fehlt – der Aufrufer fällt dann auf YAML zurück.
 * Nicht auf Verfügbarkeit verlassen: das Element wird nachgeladen und ist
 * kein zugesicherter Teil der Home-Assistant-Schnittstelle.
 */
export const createHaCardEditor = ({ hass, value, onChange }) => {
  if (!customElements.get("hui-card-element-editor")) return null;

  const editor = document.createElement("hui-card-element-editor");
  editor.hass = hass;

  // Der Editor erwartet ein Lovelace-Objekt. Ein leeres genügt: er liest
  // daraus nur den Bearbeitungsmodus. Gespeichert wird über uns, nicht über
  // HAs Speicherfunktion – deshalb bleibt saveConfig absichtlich wirkungslos.
  editor.lovelace = { config: { views: [] }, editMode: true, saveConfig: async () => {} };
  editor.value = value;

  editor.addEventListener("config-changed", (event) => {
    event.stopPropagation();
    const next = event.detail?.config;
    if (next) onChange(next);
  });

  return editor;
};
