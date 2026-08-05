# HA-OS

Dashboard-Grundgerüst für Home Assistant im Glassmorphism-Stil. Eine grosse
Glasfläche mit Seitenleiste, Kopfzeile und drei frei gewichteten Rastern – in
die jede installierte Lovelace-Karte passt.

Version 0.2.0

---

## Installation über HACS

1. HACS → ⋮ → **Benutzerdefinierte Repositories**
2. URL des Repositories eintragen, Kategorie **Dashboard**
3. HA-OS suchen und herunterladen
4. Die Ressource trägt HACS selbst ein. Falls nicht, von Hand unter
   Einstellungen → Dashboards → ⋮ → Ressourcen:

   | Feld | Wert |
   |---|---|
   | URL | `/hacsfiles/ha-os/ha-os.js` |
   | Typ | **JavaScript-Modul** |

5. Browser hart neu laden (Cmd+Shift+R bzw. Strg+F5)

**Prüfen, ob es geladen hat:** In der Browserkonsole muss `HA-OS 0.2.0` stehen.

---

## Die zwei Karten

Beide erscheinen im normalen Kartenauswahldialog.

**`custom:ha-os-shell` – das Grundgerüst.**
Glasfläche, Seitenleiste, Kopfzeile mit Reitern, Badges und Benutzern, drei
Raster, interne Seiten, iFrame-Seiten und eine interne Einstellungsseite. Die
Shell kennt selbst **keine** Kartentypen. In ihre Raster passt jede installierte
Karte – Bubble Card, button-card, Mushroom, HA-Standardkarten.

**`custom:ha-os-card` – die generische Karte.**
Oben im Editor ein Typ-Auswahlfeld, darunter nur die Felder des gewählten Typs:

`button` · `slider` · `thermostat` · `weather` · `energy` · `media` ·
`members` · `calendar` · `select` · `clock`

---

## Testseite anlegen

Ansicht vom Typ **Abschnitte (Sections)**, darin ein Abschnitt mit
`column_span: 4`, und dort die Karte **HA-OS Shell**.

```yaml
type: custom:ha-os-shell
gap: 16
row_height: 125
users:
  - person.enrico
pages:
  - id: home
    name: Wohnzimmer
    icon: mdi:sofa
    grid_widths: [1, 1.55, 1.05]
    grids:
      - cards:
          - type: custom:ha-os-card
            card_type: thermostat
            entity: climate.dein_thermostat
            haos_weight: 3
      - cards:
          - type: custom:ha-os-card
            card_type: weather
            entity: weather.dein_wetter
            haos_weight: 1.5
      - cards:
          - type: custom:ha-os-card
            card_type: media
            entity: media_player.dein_player
```

---

## Entwickeln

```sh
npm install
npm run check      # baut und testet
```

Einzeln:

```sh
npm run build      # src/ -> dist/ha-os.js
npm test           # Tests gegen das gebaute Bündel
npm run test:src   # dieselben Tests gegen die Quelldateien
```

### Aufbau

```
src/
├── ha-os.js                  Einstiegspunkt
├── shared/
│   ├── theme.js              Glass Light/Dark, CSS-Variablen, Statusfarben
│   ├── config.js             Normalisierung der Shell-Konfiguration
│   └── utils.js              gemeinsame Helfer, Kartenerzeugung, Aktionen
└── cards/
    ├── shell-card.js         custom:ha-os-shell
    ├── shell-editor.js       Editor der Shell
    ├── haos-card.js          custom:ha-os-card + alle Renderer
    └── haos-card-editor.js   Editor der generischen Karte

dist/ha-os.js                 gebaut – nicht von Hand bearbeiten, wird committet
scripts/build.mjs             esbuild-Bündelung mit Vollständigkeitsprüfung
tests/                        Rauchtest und Kurventest
```

### Warum gebündelt wird

HACS lädt bei Dashboard-Plugins **flach**: alle `.js` aus `dist/` oder dem
Wurzelverzeichnis, ohne Unterordner. Die Aufteilung in `shared/` und `cards/`
überlebt das nicht.

Der zweite Grund wiegt schwerer. Browser speichern importierte Module getrennt
von der Einstiegsdatei. Solange ausgeliefert wurde, was hier in `src/` liegt,
musste hinter **jedem** `import` eine Versionsangabe `?v=…` stehen – wurde eine
davon beim Veröffentlichen vergessen, lud der Browser eine Mischung aus alten
und neuen Modulen und verhielt sich unerklärlich. Bei einer einzigen Datei kann
das nicht mehr passieren.

Nicht durch eine einfache Verkettung ersetzen: die Module verwenden mehrfach
dieselben Namen auf oberster Ebene (`el`, `icon`, `STYLES`, `TAG`,
`EDITOR_TAG`, `LABELS`, `HELPERS`). Beim Aneinanderhängen überschrieben sie
sich gegenseitig, und zwar lautlos.

### Neue Version veröffentlichen

1. `VERSION` in `src/ha-os.js` und `version` in `package.json` erhöhen
2. `npm run check`
3. Commit inklusive `dist/ha-os.js`
4. GitHub-Release mit demselben Versionsschild anlegen
5. In HA: HACS → HA-OS → Aktualisieren

---

## Was hier anders gemacht wird als im Vorgänger

Die alte Shell rief bei jeder Zustandsänderung `shadowRoot.innerHTML = …` auf
und erzeugte damit das gesamte DOM inklusive aller Kinderkarten neu. Da die
Kopfzeilen-Signatur alle `person.*`-Entitäten enthielt, geschah das bei jedem
GPS-Update. Die Ladeschutz-Flags der Gerätekarte waren Instanzvariablen und
wurden dabei jedes Mal mit verworfen – die Entity-Registry wurde also im
Minutentakt neu über WebSocket geladen.

Diese Version:

- baut ihr DOM **einmal** auf und ändert danach nur Text, Klassen und Styles;
- verwendet Kinderkarten wieder, solange sich deren Konfiguration nicht ändert;
- behält Karten über Seitenwechsel hinweg am Leben;
- filtert `hass`-Updates auf die Entitäten, die tatsächlich angezeigt werden;
- regelt das gesamte Design über CSS-Variablen – eine Theme-Änderung erzeugt
  **kein** JavaScript-Rendering;
- erzeugt `ha-form` genau einmal und aktualisiert nur `.data`/`.schema`,
  damit Textfelder beim Tippen den Fokus behalten.

Der Rauchtest prüft genau das: er simuliert 50 Zustandsänderungen und stellt
sicher, dass dabei **kein** DOM-Knoten neu erzeugt wird.

**Ein bestandener Test ist trotzdem keine Abnahme.** Die Tests laufen in jsdom
mit vereinfachten Daten und kennen weder `ha-form` noch `ha-icon` in ihrer
echten Implementierung. Ob der visuelle Editor in der installierten
Home-Assistant-Version sauber funktioniert, zeigt nur ein Blick ins Frontend.

---

## Noch offen

- Türschloss-Kacheln aus dem Zielbild fehlen
- Fremdkarten werden im Shell-Editor über YAML konfiguriert; ein eingebetteter
  HA-Karteneditor kommt, sobald die Grundfunktion abgenommen ist
- Mobilansicht ist funktionsfähig, aber noch nicht feingeschliffen

---

## Lizenz

MIT
