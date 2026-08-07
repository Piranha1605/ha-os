# Architektur

[← Zurück zur Übersicht](../README.md)

## Aufbau des Quelltextes

```
src/
├── ha-os.js                  Einstiegspunkt, VERSION, Registrierung
├── shared/
│   ├── theme.js              Glass Light/Dark, CSS-Variablen, Statusfarben
│   ├── config.js             Normalisierung der Shell-Konfiguration
│   ├── utils.js              gemeinsame Helfer, Kartenerzeugung, Aktionen
│   └── card-catalog.js       Kartenliste und eingebetteter HA-Karteneditor
└── cards/
    ├── shell-card.js         custom:ha-os-shell
    ├── shell-editor.js       Editor der Shell
    ├── haos-card.js          custom:ha-os-card + alle Renderer
    ├── haos-card-editor.js   Editor der generischen Karte
    ├── grid-card.js          custom:ha-os-grid
    └── grid-editor.js        Editor des 2×2-Rasters

dist/ha-os.js                 gebaut – nicht von Hand bearbeiten, wird committet
scripts/build.mjs             esbuild-Bündelung mit Vollständigkeitsprüfung
tests/                        Rauchtest plus eine Prüfung je heikler Karte
```

Ein Kartentyp ist ein Eintrag in `renderers` mit `build`, `update` und
wahlweise `connect`, `disconnect`, `reconnect`. `build` erzeugt das DOM genau
einmal und gibt es zurück; `update` darf danach nur noch vorhandene Knoten
ändern.

## Warum gebündelt wird

HACS lädt Dashboard-Plugins **flach**: alle `.js` aus `dist/` oder dem
Wurzelverzeichnis, ohne Unterordner. Die Aufteilung in `shared/` und `cards/`
überlebt das nicht.

Der zweite Grund wiegt schwerer. Browser speichern importierte Module getrennt
von der Einstiegsdatei. Solange ausgeliefert wurde, was in `src/` liegt, musste
hinter **jedem** `import` eine Versionsangabe `?v=…` stehen — wurde eine davon
beim Veröffentlichen vergessen, lud der Browser eine Mischung aus alten und
neuen Modulen und verhielt sich unerklärlich. Bei einer einzigen Datei kann das
nicht mehr passieren.

**Nicht durch eine einfache Verkettung ersetzen.** Die Module verwenden mehrfach
dieselben Namen auf oberster Ebene: `el`, `icon`, `STYLES`, `TAG`,
`EDITOR_TAG`, `LABELS`, `HELPERS`. Beim Aneinanderhängen überschreiben sie sich
gegenseitig, und zwar lautlos — die Datei liefe, zeigte aber die falsche Karte.
esbuild benennt sie um.

## Was hier anders läuft als im Vorgänger

Die alte Shell rief bei jeder Zustandsänderung `shadowRoot.innerHTML = …` auf
und erzeugte damit das gesamte DOM inklusive aller Kinderkarten neu. Da die
Kopfzeilen-Signatur alle `person.*`-Entitäten enthielt, geschah das bei jedem
GPS-Update. Die Ladeschutz-Flags der Gerätekarte waren Instanzvariablen und
flogen jedes Mal mit hinaus — die Entity-Registry wurde also im Minutentakt neu
über WebSocket geladen.

Diese Version:

- baut ihr DOM **einmal** auf und ändert danach nur Text, Klassen und Styles;
- verwendet Kinderkarten wieder, solange sich deren Konfiguration nicht ändert;
- behält Karten über Seitenwechsel hinweg am Leben;
- filtert `hass`-Updates auf die Entitäten, die tatsächlich angezeigt werden;
- regelt das gesamte Design über CSS-Variablen — eine Theme-Änderung erzeugt
  **kein** JavaScript-Rendering;
- erzeugt `ha-form` genau einmal und aktualisiert nur `.data`/`.schema`, damit
  Textfelder beim Tippen den Fokus behalten.

Der Rauchtest prüft genau das: er simuliert 50 Zustandsänderungen und stellt
sicher, dass dabei **kein** DOM-Knoten neu erzeugt wird.

Eine Nebenwirkung, die man kennen muss: **Karten auf unsichtbaren Seiten leben
weiter.** Die Shell blendet Seiten nur mit `display: none` aus. Was von selbst
läuft — ein Timer, ein Videostream — muss sich deshalb selbst anhalten. Die
Kamerakarte tut das über einen `IntersectionObserver`.

## Datenquellen, die leicht falsch gewählt werden

- **Energie:** `recorder/statistics_during_period` mit Tagesraster, nicht
  `history/period`. Ein Zähler läuft monoton hoch; aus dem Verlauf ließe sich
  nur der Höchststand ablesen, nicht der Verbrauch. `change` ist genau der
  Tagesverbrauch. Ohne Statistik fällt die Karte auf den Verlauf zurück.
- **Wertebereiche:** `min`, `max`, `step` kommen aus der Entität. Fest
  verdrahtete 0–100 schreiben bei `number`/`input_number` falsche Werte.
- **Dienstparameter:** `media_player.shuffle_set` braucht `shuffle: true|false`,
  `repeat_set` braucht `repeat: off|all|one`. Ohne Parameter weist HA sie ab.
- **`supported_features`** meldet je Entität, was sie kann. Wer es ignoriert,
  zeigt Knöpfe, die ins Leere laufen.
- **Kamera:** `entity_picture` für das Einzelbild, derselbe Pfad mit
  `/api/camera_proxy_stream/` für MJPEG. `ha-camera-stream` lädt Home Assistant
  erst bei Bedarf nach und ist von außen nicht zuverlässig zu bekommen.

## Neue Version veröffentlichen

1. `VERSION` in `src/ha-os.js` und `version` in `package.json` erhöhen
2. `npm run check`
3. Commit inklusive `dist/ha-os.js`
4. GitHub-Release mit demselben Versionsschild anlegen — **ohne Release zeigt
   HACS keine Versionsnummer**, sondern den Commit-Hash
5. In HA: HACS → HA-OS → ⋮ → Erneut herunterladen
