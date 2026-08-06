# HA-OS

Dashboard-Grundgerüst für Home Assistant im Glassmorphism-Stil. Eine grosse
Glasfläche mit Seitenleiste, Kopfzeile und drei frei gewichteten Rastern – in
die jede installierte Lovelace-Karte passt.

Version 0.8.0

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

**Prüfen, ob es geladen hat:** In der Browserkonsole muss `HA-OS 0.8.0` stehen.

---

## Die drei Karten

Alle erscheinen im normalen Kartenauswahldialog.

**`custom:ha-os-shell` – das Grundgerüst.**
Glasfläche, Seitenleiste, Kopfzeile mit Reitern, Badges und Benutzern, drei
Raster, interne Seiten, iFrame-Seiten und eine interne Einstellungsseite. Die
Shell kennt selbst **keine** Kartentypen. In ihre Raster passt jede installierte
Karte – Bubble Card, button-card, Mushroom, HA-Standardkarten.

**`custom:ha-os-card` – die generische Karte.**
Oben im Editor ein Typ-Auswahlfeld, darunter nur die Felder des gewählten Typs:

`button` · `slider` · `thermostat` · `weather` · `energy` · `media` ·
`members` · `calendar` · `select` · `clock`

Die Form des Bedienelements richtet sich beim Typ `button` nach der Entität:
Umschalter bei schaltbaren Dingen, **Taster** bei `button`, `input_button`,
`scene` und `script`, **Auf / Stopp / Zu** bei `cover`. Tasten haben keinen
eigenen Zustand – dafür gibt es das Feld *Zustand von anderer Entität*, in das
etwa ein Türkontakt eingetragen wird.

**`custom:ha-os-grid` – das 2×2-Raster.**
Vier Plätze in zwei Spalten und zwei Reihen, jeder frei mit einer beliebigen
installierten Karte belegbar. Spaltenverhältnis und Abstand einstellbar, auf
dem Telefon wahlweise untereinander.

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

## Hintergrundbild

In der internen Einstellungsseite unter *Hintergrundbild*, getrennt für Hell
und Dunkel, dazu ein Regler zum Abdunkeln.

Zwei Wege, ein Bild zu hinterlegen:

- **Hochladen** über Home Assistants eigene Bildablage. Das Bild liegt danach
  unter `/api/image/serve/…`.
- **Eigener Pfad**, etwa `/local/wallpaper/bild.jpg` für Dateien, die man
  selbst nach `config/www/wallpaper/` gelegt hat.

Eine Lovelace-Karte kann **nicht** selbst nach `config/www/` schreiben – dafür
gibt es keine Schnittstelle. Deshalb der Umweg über HAs Bildablage.

Zugelassen sind nur Adressen innerhalb dieser Installation (`/local/`,
`/api/`, `/media/`, `/hacsfiles/`). Ein Bild von einer fremden Adresse würde
bei jedem Laden des Dashboards eine Verbindung dorthin aufbauen.

## Glasoptik

Der Eindruck von Glas entsteht nicht durch Weichzeichnung, sondern durch drei
Schichten, die in `shared/utils.js` zusammenkommen:

1. **Schimmer** – ein diagonaler Verlauf über der Fläche (`--haos-*-gloss`)
2. **Grundfarbe** – die eingefärbte, transparente Fläche darunter
3. **Glanzkante** – helle Linie oben, dunkle unten, als inset-Schatten
   (`--haos-*-sheen`)

Eine gleichmäßig getrübte Fläche mit rundum gleich hellem Rahmen wirkt flach,
egal wie stark die Weichzeichnung steht. Deshalb regelt der Schieber **Glanz**
in den Einstellungen alle drei Anteile gemeinsam, getrennt für Hintergrund-
und Entitätskarten.

**Nach dem Update auf 0.4.0:** wer schon eigene Theme-Werte gespeichert hat,
behält Unschärfe, Rundung und Sättigung wie bisher – nur der neue Glanz kommt
dazu. Für die überarbeiteten Vorgaben (weniger Unschärfe, mehr Sättigung,
größere Rundung) in den Einstellungen einmal **Zurücksetzen** drücken.

## Seiten und Navigation

Jede Seite erscheint als Symbol in der linken Leiste **und** als Reiter in der
Kopfzeile. Beides lässt sich im Editor unter *Allgemein* einzeln abschalten –
bei vielen Seiten läuft die Kopfzeile sonst über, dann reicht die Leiste.

Neue Seiten legt man im Editor unter *Seiten* an. Jede bekommt automatisch
drei leere Raster.

## Aufbau des Editors

Drei Reiter:

**Aussehen** – die Maße der Shell, Abstand und Kartenhöhe.

**Leisten** – alles am Rand: Benutzer in der Kopfzeile, ob Seiten als Reiter
oben und/oder als Symbole in der Seitenleiste erscheinen, die Systemknöpfe und
die Schnellaktionen.

**Seiten** – die ganze Struktur, vier Ebenen tief:

```
Seite  ▸  Allgemein · Badges · Raster 1 · Raster 2 · Raster 3
          Raster  ▸  Karte 1 · Karte 2 · …
                     Karte  ▸  Felder
```

Überall dieselbe Geste: anklicken klappt auf. **Pro Ebene ist immer nur ein
Block offen** – öffnet man Raster 2, schließt Raster 1 samt der Karte darin.
Sonst wächst die Liste bei vier Ebenen so weit, dass man beim Scrollen die
Orientierung verliert.

Jeder offene Block trägt eine Pfadzeile wie `Wohnzimmer › Raster 1 › Karte 1`.

Vorher lagen Seiten und Karten in getrennten Reitern und man musste dieselbe
Seite zweimal auswählen. Ein Zwischenstand mit nummerierten Reitern `1 2 3`
wurde wieder verworfen: die Nummer allein sagt nicht, in welchem Raster
welcher Seite man steckt.

## Noch offen

- Türschloss-Kacheln aus dem Zielbild fehlen
- Mobilansicht ist funktionsfähig, aber noch nicht feingeschliffen

## Karten ohne YAML einsetzen

Fremdkarten werden über eine Auswahlliste eingefügt und danach mit ihrem
echten Home-Assistant-Editor konfiguriert.

Zur Umsetzung, weil sie nicht offensichtlich ist: `hui-card-element-editor`
ist verfügbar, sobald unser Editor läuft – er steckt im selben nachgeladenen
Paket wie HAs Kartendialog, und darin läuft unser Editor immer.
`hui-card-picker` dagegen lädt erst, wenn der Anwender in Home Assistant
selbst auf *Karte hinzufügen* tippt, und lässt sich von außen nicht
zuverlässig nachladen. Die Auswahlliste ist deshalb Eigenbau: sie liest
`window.customCards`, wo sich jede installierte Fremdkarte beim Laden selbst
einträgt, und ergänzt die gebräuchlichen Standardkarten. Fehlt HAs Editor in
einer Version, fällt die Karte auf YAML zurück.

---

## Lizenz

MIT
