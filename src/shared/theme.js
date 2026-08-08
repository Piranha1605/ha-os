/**
 * HA-OS – Theme-Modul
 *
 * Eigener Namespace (--haos-*, window.HaOsTheme, eigener localStorage-Key),
 * damit das alte Glass-Dashboard parallel geladen werden kann ohne Kollision.
 *
 * Alle Werte sind projektintern. Das Home-Assistant-Theme wird NICHT umgeschaltet.
 */

const STORAGE_KEY = "ha-os-theme-v1";

export const THEME_DEFAULTS = Object.freeze({
  mode: "dark",
  accent: "#0a84ff",

  // Farben von Home Assistant uebernehmen.
  //
  // HA legt sein Theme als CSS-Variablen auf <html> ab. Ist das hier an,
  // holt sich HA-OS Akzent, Text, Statusfarben und Hintergrund von dort -
  // und folgt damit automatisch jedem Themewechsel, auf jedem Geraet.
  // Glas (Unschaerfe, Deckkraft, Glanz, Rundung) bleibt in jedem Fall hier:
  // dafuer kennt Home Assistant keine Entsprechung.
  follow_ha: false,
  margin: 25,

  // Hintergrundbilder, getrennt fuer Hell und Dunkel. Leer = kein Bild.
  backgroundLight: "",
  backgroundDark: "",
  backgroundDim: 0,

  // Textfarbe, getrennt fuer Hell und Dunkel. Sie gilt fuer ALLE Karten:
  // Beschriftungen, Werte und Symbole leiten ihre Abstufungen davon ab, damit
  // nicht jede Karte ihre eigene Graustufe mitbringt.
  textLight: "#18212a",
  textDark: "#ffffff",

  // Statusfarben, getrennt fuer Hell und Dunkel.
  //
  // Getrennt, weil ein Gruen, das auf dunklem Glas gut aussieht, auf hellem
  // Glas nicht mehr lesbar ist - genau daran ist der Rueckfallwert #7ee0b0
  // gescheitert. Im Hellen deshalb deutlich dunklere Toene.
  statusGoodLight: "#1e8e5a",
  statusGoodDark: "#7ee0b0",
  statusOffLight: "#66717c",
  statusOffDark: "#a8b0b8",
  statusBadLight: "#c2413b",
  statusBadDark: "#ff6961",

  // Hintergrundkarte = die grosse Glasflaeche der Shell
  cardSurface: "#ffffff",
  cardOpacity: 10,
  cardBlur: 14,
  cardSaturation: 180,
  cardRadius: 24,
  cardBorder: "#ffffff",
  cardBorderOpacity: 22,
  cardSheen: 55,

  // Entitaetskarte = die einzelnen Karten darin
  entitySurface: "#ffffff",
  entityOpacity: 10,
  entityBlur: 12,
  entitySaturation: 180,
  entityRadius: 20,
  entityBorder: "#ffffff",
  entityBorderOpacity: 20,
  entitySheen: 65,
});

const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

const color = (value, fallback) =>
  /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value).toLowerCase() : fallback;

/**
 * Prueft eine Bildadresse.
 *
 * Zugelassen sind nur Pfade innerhalb dieser Home-Assistant-Installation:
 * `/local/...` fuer Dateien unter `config/www/`, `/api/image/serve/...` fuer
 * Bilder, die ueber HAs eigenen Upload abgelegt wurden. Fremde Adressen
 * bleiben draussen - ein Hintergrundbild von irgendwoher wuerde bei jedem
 * Laden des Dashboards eine Verbindung dorthin aufbauen.
 */
export const imageUrl = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  return /^\/(local|api|media|hacsfiles)\//.test(text) ? text : "";
};

/**
 * Liest eine Farbe von Home Assistant und gibt sie als "r, g, b" zurueck.
 *
 * Der Umweg ueber ein Hilfselement ist noetig, weil ein Theme jede
 * Schreibweise verwenden darf – #fff, rgb(), hsl(), color-mix(). Der Browser
 * rechnet sie beim Setzen in eine einheitliche Form um, und die laesst sich
 * zerlegen.
 */
const readHaColor = (name) => {
  // `document.defaultView` statt des globalen `getComputedStyle`: den gibt es
  // nicht in jeder Umgebung, und die Karte soll auch dort bauen.
  const view = typeof document !== "undefined" ? document.defaultView : null;
  if (!view || !document.body) return "";
  const raw = view.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return "";

  const probe = document.createElement("span");
  probe.style.color = raw;
  probe.style.display = "none";
  document.body.append(probe);
  const computed = view.getComputedStyle(probe).color;
  probe.remove();

  const parts = computed.match(/\d+(\.\d+)?/g);
  return parts && parts.length >= 3 ? parts.slice(0, 3).map((n) => Math.round(Number(n))).join(", ") : "";
};

const hexToRgb = (hex) => {
  const value = String(hex).replace("#", "");
  return [0, 2, 4].map((start) => Number.parseInt(value.slice(start, start + 2), 16)).join(", ");
};

/**
 * Glanz als inset-Schatten.
 *
 * Echtes Glas ist am oberen Rand hell, weil dort das Licht ankommt, und am
 * unteren dunkel. Ein rundum gleich heller Rahmen nimmt der Fläche genau
 * diese Tiefe – das war der Grund, warum HA-OS flach und schwammig wirkte.
 *
 * Die dritte Zeile ist ein sehr weiter, schwacher innerer Schein. Er ersetzt
 * das, was sonst mehr Weichzeichnung leisten müsste, ohne die Konturen zu
 * verwaschen.
 */
const sheenShadow = (strength, light) => {
  const s = clamp(strength, 0, 100, 0) / 100;
  if (s === 0) return "0 0 0 0 rgba(0,0,0,0)";

  const top = (light ? 0.85 : 0.5) * s;
  const bottom = (light ? 0.1 : 0.3) * s;
  const inner = (light ? 0.3 : 0.14) * s;

  return [
    `inset 0 1px 0 rgba(255, 255, 255, ${top.toFixed(3)})`,
    `inset 0 -1px 0 rgba(0, 0, 0, ${bottom.toFixed(3)})`,
    `inset 0 22px 34px -26px rgba(255, 255, 255, ${inner.toFixed(3)})`,
  ].join(", ");
};

/**
 * Diagonaler Schimmer als Verlaufsschicht über der Grundfarbe.
 *
 * Liegt im `background` vor der eingefärbten Fläche, deshalb braucht es kein
 * Pseudo-Element – die Karten müssten dafür ihr DOM erweitern.
 */
const glossLayer = (strength, light) => {
  const s = clamp(strength, 0, 100, 0) / 100;
  if (s === 0) return "linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0))";

  const bright = (light ? 0.55 : 0.2) * s;
  const faint = (light ? 0.14 : 0.05) * s;

  return (
    `linear-gradient(148deg, ` +
    `rgba(255, 255, 255, ${bright.toFixed(3)}) 0%, ` +
    `rgba(255, 255, 255, ${faint.toFixed(3)}) 38%, ` +
    `rgba(255, 255, 255, 0) 62%)`
  );
};

export const normalizeTheme = (settings = {}) => ({
  mode: settings.mode === "light" ? "light" : "dark",
  accent: color(settings.accent, THEME_DEFAULTS.accent),
  follow_ha: Boolean(settings.follow_ha),
  margin: clamp(settings.margin, 0, 60, THEME_DEFAULTS.margin),
  backgroundLight: imageUrl(settings.backgroundLight),
  backgroundDark: imageUrl(settings.backgroundDark),
  backgroundDim: clamp(settings.backgroundDim, 0, 80, THEME_DEFAULTS.backgroundDim),
  textLight: color(settings.textLight, THEME_DEFAULTS.textLight),
  textDark: color(settings.textDark, THEME_DEFAULTS.textDark),
  statusGoodLight: color(settings.statusGoodLight, THEME_DEFAULTS.statusGoodLight),
  statusGoodDark: color(settings.statusGoodDark, THEME_DEFAULTS.statusGoodDark),
  statusOffLight: color(settings.statusOffLight, THEME_DEFAULTS.statusOffLight),
  statusOffDark: color(settings.statusOffDark, THEME_DEFAULTS.statusOffDark),
  statusBadLight: color(settings.statusBadLight, THEME_DEFAULTS.statusBadLight),
  statusBadDark: color(settings.statusBadDark, THEME_DEFAULTS.statusBadDark),

  cardSurface: color(settings.cardSurface, THEME_DEFAULTS.cardSurface),
  cardOpacity: clamp(settings.cardOpacity, 0, 95, THEME_DEFAULTS.cardOpacity),
  cardBlur: clamp(settings.cardBlur, 0, 50, THEME_DEFAULTS.cardBlur),
  cardSaturation: clamp(settings.cardSaturation, 50, 240, THEME_DEFAULTS.cardSaturation),
  cardRadius: clamp(settings.cardRadius, 0, 48, THEME_DEFAULTS.cardRadius),
  cardBorder: color(settings.cardBorder, THEME_DEFAULTS.cardBorder),
  cardBorderOpacity: clamp(settings.cardBorderOpacity, 0, 80, THEME_DEFAULTS.cardBorderOpacity),
  cardSheen: clamp(settings.cardSheen, 0, 100, THEME_DEFAULTS.cardSheen),

  entitySurface: color(settings.entitySurface, THEME_DEFAULTS.entitySurface),
  entityOpacity: clamp(settings.entityOpacity, 0, 95, THEME_DEFAULTS.entityOpacity),
  entityBlur: clamp(settings.entityBlur, 0, 50, THEME_DEFAULTS.entityBlur),
  entitySaturation: clamp(settings.entitySaturation, 50, 240, THEME_DEFAULTS.entitySaturation),
  entityRadius: clamp(settings.entityRadius, 0, 48, THEME_DEFAULTS.entityRadius),
  entityBorder: color(settings.entityBorder, THEME_DEFAULTS.entityBorder),
  entityBorderOpacity: clamp(settings.entityBorderOpacity, 0, 80, THEME_DEFAULTS.entityBorderOpacity),
  entitySheen: clamp(settings.entitySheen, 0, 100, THEME_DEFAULTS.entitySheen),
});

const read = () => {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    return normalizeTheme(stored ? JSON.parse(stored) : THEME_DEFAULTS);
  } catch (_error) {
    return normalizeTheme(THEME_DEFAULTS);
  }
};

/**
 * Setzt die CSS-Variablen auf <html>.
 *
 * Die Karten lesen ausschliesslich diese Variablen. Dadurch erfordert eine
 * Theme-Aenderung KEIN Neu-Rendern der Karten – der Browser rechnet neu,
 * nicht JavaScript. Das war einer der Ausloeser der alten Render-Schleife.
 */
/** Eigener Wert des Geräts, sonst die Vorgabe aus der Karte. */
const backgroundOf = (t, mode) => t[`background${mode}`] || fallbacks[`background${mode}`] || "";

const apply = (settings) => {
  const t = normalizeTheme(settings);
  if (typeof document === "undefined") return t;

  const light = t.mode === "light";

  // Light braucht hoehere Mindestwerte, sonst verschwindet der Glaseffekt.
  const cardOpacity = light ? Math.max(t.cardOpacity, 26) : t.cardOpacity;
  const entityOpacity = light ? Math.max(t.entityOpacity, 20) : t.entityOpacity;
  const cardBorderOpacity = light ? Math.max(t.cardBorderOpacity, 46) : t.cardBorderOpacity;
  const entityBorderOpacity = light ? Math.max(t.entityBorderOpacity, 38) : t.entityBorderOpacity;

  const values = {
    "--haos-color-scheme": t.mode,
    // Die Zahlen einzeln – fuer rgba(...)-Abstufungen, etwa den Farbschleier
    // des Medienspielers, wenn sich aus dem Titelbild nichts lesen laesst.
    "--haos-accent-rgb": hexToRgb(t.accent),
    "--haos-text": light ? t.textLight : t.textDark,
    "--haos-text-rgb": hexToRgb(light ? t.textLight : t.textDark),
    "--haos-text-inverse": light ? t.textDark : t.textLight,
    "--haos-font-family":
      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif",
    "--haos-font-weight-normal": "450",
    "--haos-font-weight-semibold": "650",

    // Schlagschatten und Glanz sind bewusst getrennt: der Glanz sitzt als
    // inset-Schatten IN der Fläche, der Schlagschatten darunter. Zusammen in
    // einer Variablen liessen sie sich nicht einzeln regeln.
    "--haos-card-shadow": light
      ? "0 18px 48px rgba(38, 48, 58, .18)"
      : "0 24px 70px rgba(0, 0, 0, .30)",
    // Der Schlagschatten der Karten muss in den Abstand zwischen ihnen
    // passen. Die Shell hat runde Ecken und deshalb `overflow: hidden` –
    // was darueber hinausragt, wird abgeschnitten, und an den Ecken sah man
    // eine gerade Kante. Bei 16 px Abstand ist knapp die Haelfte davon als
    // Weichzeichnung sinnvoll; der Rest kommt aus dem Versatz nach unten.
    "--haos-entity-shadow": light
      ? "0 4px 12px rgba(38, 48, 58, .13)"
      : "0 5px 14px rgba(0, 0, 0, .22)",

    "--haos-card-sheen": sheenShadow(t.cardSheen, light),
    "--haos-entity-sheen": sheenShadow(t.entitySheen, light),
    "--haos-card-gloss": glossLayer(t.cardSheen, light),
    "--haos-entity-gloss": glossLayer(t.entitySheen, light),
    "--haos-user-shadow": light
      ? "0 6px 18px rgba(25, 34, 44, .24), inset 0 1px 0 rgba(255, 255, 255, .76)"
      : "0 6px 18px rgba(0, 0, 0, .38), inset 0 1px 0 rgba(255, 255, 255, .28)",

    "--haos-accent": t.accent,
    // Das Leuchten aktiver Kacheln folgt weiterhin der Akzentfarbe - die ist
    // schon einstellbar. Die drei Statusfarben hier faerben Texte und Zeichen
    // in den Karten: "ok", "verriegelt", "Warnung", "nicht erreichbar".
    "--haos-status-on": t.accent,
    "--haos-status-off": light ? t.statusOffLight : t.statusOffDark,
    "--haos-status-unavailable": light ? t.statusBadLight : t.statusBadDark,

    // Diese beiden gab es bisher NICHT. Die Karten benutzten
    // var(--haos-good, #7ee0b0) - und dieser Rueckfallwert war auf hellem
    // Glas nicht zu lesen.
    "--haos-good": light ? t.statusGoodLight : t.statusGoodDark,
    "--haos-bad": light ? t.statusBadLight : t.statusBadDark,
    "--haos-status-home": light ? "#168a4a" : "#32d583",
    "--haos-status-away": light ? "#a06a10" : "#f7b955",

    "--haos-margin": `${t.margin}px`,

    "--haos-background-image": (light ? backgroundOf(t, "Light") : backgroundOf(t, "Dark"))
      ? `url("${light ? backgroundOf(t, "Light") : backgroundOf(t, "Dark")}")`
      : "none",
    "--haos-background-dim": String((t.backgroundDim || fallbacks.backgroundDim || 0) / 100),

    "--haos-card-surface-rgb": hexToRgb(t.cardSurface),
    "--haos-card-opacity": String(cardOpacity / 100),
    "--haos-card-blur": `${t.cardBlur}px`,
    "--haos-card-saturation": `${t.cardSaturation}%`,
    "--haos-card-radius": `${t.cardRadius}px`,
    "--haos-card-border-rgb": hexToRgb(t.cardBorder),
    "--haos-card-border-opacity": String(cardBorderOpacity / 100),

    "--haos-entity-surface-rgb": hexToRgb(t.entitySurface),
    "--haos-entity-opacity": String(entityOpacity / 100),
    "--haos-entity-blur": `${t.entityBlur}px`,
    "--haos-entity-saturation": `${t.entitySaturation}%`,
    "--haos-entity-radius": `${t.entityRadius}px`,
    "--haos-entity-border-rgb": hexToRgb(t.entityBorder),
    "--haos-entity-border-opacity": String(entityBorderOpacity / 100),
  };

  const root = document.documentElement;
  root.dataset.haosTheme = t.mode;
  /*
   * Farben von Home Assistant.
   *
   * Wird ganz zum Schluss angewandt, damit es die eigenen Werte ueberschreibt
   * und nicht umgekehrt. Was HA nicht liefert, bleibt beim eigenen Wert -
   * ein Theme ohne `success-color` soll nicht dazu fuehren, dass die
   * Ok-Meldungen farblos werden.
   */
  if (t.follow_ha) {
    const uebernehmen = (ziel, quelle) => {
      const rgb = readHaColor(quelle);
      if (rgb) values[ziel] = `rgb(${rgb})`;
      return rgb;
    };

    uebernehmen("--haos-accent", "--primary-color");
    uebernehmen("--haos-status-on", "--primary-color");
    uebernehmen("--haos-good", "--success-color");
    uebernehmen("--haos-bad", "--error-color");
    uebernehmen("--haos-status-unavailable", "--error-color");
    uebernehmen("--haos-status-off", "--disabled-text-color");

    const textRgb = readHaColor("--primary-text-color");
    if (textRgb) {
      values["--haos-text"] = `rgb(${textRgb})`;
      // Die Abstufungen der Beschriftungen laufen ueber rgba(...) und
      // brauchen die Zahlen einzeln, nicht die fertige Farbe.
      values["--haos-text-rgb"] = textRgb;
    }

    // `lovelace-background` ist bei vielen Themes ein Farbverlauf, kein Bild.
    // Als `background-image` funktioniert beides; eine reine Farbe fiele
    // durch, deshalb bleibt der eigene Wert dann bestehen.
    const view = typeof document !== "undefined" ? document.defaultView : null;
    const haBackground = view
      ? view.getComputedStyle(document.documentElement).getPropertyValue("--lovelace-background").trim()
      : "";
    if (haBackground && !(light ? t.backgroundLight : t.backgroundDark) && /url\(|gradient\(/i.test(haBackground)) {
      values["--haos-background-image"] = haBackground;
    }
  }

  Object.entries(values).forEach(([key, value]) => root.style.setProperty(key, value));
  return t;
};

/**
 * Vorgaben aus der Kartenkonfiguration.
 *
 * Das Theme liegt im localStorage und gilt damit **pro Gerät** – auf dem
 * Tablet steht ein anderes als am Rechner. Für Hell/Dunkel ist das richtig,
 * für das Hintergrundbild nicht: das soll überall gleich sein. Deshalb kann
 * die Shell Vorgaben hinterlegen, die immer dann greifen, wenn auf diesem
 * Gerät nichts Eigenes gesetzt ist.
 */
let fallbacks = {};

let active = apply(read());

/**
 * Home Assistant schreibt sein Theme als Stil-Attribut auf <html>. Wechselt
 * der Anwender das Theme, aendert sich genau dieses Attribut – ein eigenes
 * Ereignis gibt es dafuer nicht. Deshalb wird es beobachtet, solange die
 * Uebernahme eingeschaltet ist.
 */
if (typeof MutationObserver === "function" && typeof document !== "undefined") {
  let pending = false;
  new MutationObserver(() => {
    if (!active.follow_ha || pending) return;
    pending = true;
    setTimeout(() => {
      pending = false;
      active = apply(active);
      window.dispatchEvent(new CustomEvent("haos-theme-changed", { detail: { ...active } }));
    }, 60);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
}

export const HaOsTheme = {
  defaults: THEME_DEFAULTS,

  /**
   * Vorgaben aus der Kartenkonfiguration setzen.
   *
   * Sie überschreiben nichts: was auf diesem Gerät eingestellt wurde, bleibt.
   * Sie füllen nur die Lücke – und genau dadurch wirkt ein im Editor
   * gesetztes Hintergrundbild auf allen Geräten, ohne dass jemand die
   * Einstellungen jedes Tablets anfassen muss.
   */
  setFallbacks(values = {}) {
    const next = {
      backgroundLight: imageUrl(values.background_light),
      backgroundDark: imageUrl(values.background_dark),
      backgroundDim: clamp(values.background_dim, 0, 80, 0),
    };
    if (JSON.stringify(next) === JSON.stringify(fallbacks)) return;
    fallbacks = next;
    active = apply(active);
    window.dispatchEvent(new CustomEvent("haos-theme-changed", { detail: { ...active } }));
  },

  get: () => ({ ...active }),

  save(changes = {}) {
    active = apply({ ...active, ...changes });
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(active));
    } catch (_error) {
      /* Private Mode o.ae. – Theme gilt dann nur fuer diese Sitzung. */
    }
    window.dispatchEvent(new CustomEvent("haos-theme-changed", { detail: { ...active } }));
    return { ...active };
  },

  toggleMode() {
    return HaOsTheme.save({ mode: active.mode === "light" ? "dark" : "light" });
  },

  reset() {
    active = apply(THEME_DEFAULTS);
    try {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
    } catch (_error) {
      /* ignoriert */
    }
    window.dispatchEvent(new CustomEvent("haos-theme-changed", { detail: { ...active } }));
    return { ...active };
  },
};

window.HaOsTheme = HaOsTheme;
