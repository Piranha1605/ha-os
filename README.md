# HA-OS

**Ein Dashboard für Home Assistant, das aussieht wie ein Betriebssystem.**

Eine durchgehende Glasfläche mit Seitenleiste, Kopfzeile und frei gewichteten
Rastern — in die jede installierte Lovelace-Karte passt.

![HA-OS Dashboard mit Seitenleiste, Medienkarte, Uhr, Wetter, Kalender und Thermostat](https://raw.githubusercontent.com/Piranha1605/ha-os/main/docs/bilder/dashboard.png)

[![Release](https://img.shields.io/github/v/release/Piranha1605/ha-os?style=flat-square&color=0a84ff)](https://github.com/Piranha1605/ha-os/releases)
[![HACS](https://img.shields.io/badge/HACS-Dashboard-41BDF5?style=flat-square)](https://hacs.xyz)
[![Lizenz](https://img.shields.io/badge/Lizenz-MIT-black?style=flat-square)](https://github.com/Piranha1605/ha-os/blob/main/LICENSE)

---

## Worum es geht

Home Assistant zeigt Karten in einem Raster — jede für sich eine Insel. HA-OS
legt darüber eine **Hülle**: eine einzige Glasfläche mit fester Navigation, in
der die Karten sitzen wie Fenster auf einem Schreibtisch. Gedacht für das
Wandtablet, das den ganzen Tag an derselben Stelle hängt.

Drei Dinge sind dabei wichtiger als die Optik:

**Es bleibt dein Home Assistant.** Die Shell kennt selbst keine Kartentypen.
In ihre Raster passt alles, was installiert ist — Mushroom, Bubble Card,
button-card, die Standardkarten. Ausgewählt über eine Liste, eingestellt mit
dem echten HA-Editor der jeweiligen Karte. Kein YAML nötig.

**Es ruckelt nicht.** Das DOM wird **einmal** aufgebaut; danach ändern sich nur
Texte, Klassen und Stilwerte. Zustandsmeldungen werden auf die Entitäten
gefiltert, die gerade sichtbar sind. Karten überleben den Seitenwechsel.

**Alles ist im Editor einstellbar.** Maße, Farben, Glasstärke, Seiten,
Hintergrundbild — ohne einmal in eine Datei zu sehen.

## Installation über HACS

1. HACS → ⋮ → **Benutzerdefinierte Repositories**
2. `https://github.com/Piranha1605/ha-os` eintragen, Kategorie **Dashboard**
3. HA-OS suchen und herunterladen
4. Browser hart neu laden — Cmd+Shift+R bzw. Strg+F5

Die Ressource trägt HACS selbst ein. Falls nicht, unter Einstellungen →
Dashboards → ⋮ → Ressourcen von Hand: URL `/hacsfiles/ha-os/ha-os.js`,
Typ **JavaScript-Modul**.

> **Geladen?** In der Browserkonsole steht die Versionsnummer. Steht dort eine
> alte, ist es fast immer der Service-Worker-Cache des Frontends — Browserdaten
> löschen hilft, ein Neustart von Home Assistant nicht.

## Die vier Karten

| Karte | Wofür |
|---|---|
| `custom:ha-os-shell` | Das Grundgerüst: Glasfläche, Seitenleiste, Kopfzeile mit Reitern und Badges, drei gewichtete Raster, iFrame-Seiten und eine eingebaute Einstellungsseite. |
| `custom:ha-os-card` | Eine Karte für elf Typen. Oben ein Auswahlfeld, darunter nur die Felder des gewählten Typs. |
| `custom:ha-os-grid` | Ein 2×2-Raster: vier Plätze, jeder frei mit einer beliebigen installierten Karte belegbar. |
| `custom:ha-os-vehicle` | Fahrzeugübersicht für Mercedes-Benz über die Integration `mbapi2020`. |

Alle vier erscheinen im normalen Kartenauswahldialog.

### Die elf Typen der generischen Karte

| | | |
|---|---|---|
| **button** — Kachel, Taster oder Auf/Stopp/Zu | **slider** — Licht, Rollo, Lüfter, Lautstärke, Zahlenwerte | **thermostat** — Drehregler mit Betriebsarten |
| **weather** — Vorhersage mit Temperaturkurve | **energy** — Tagesverbrauch als Balken | **media** — Titel, Bild, Fortschritt, Bedienung |
| **members** — Personen mit Statusfarbe | **calendar** — Termine mehrerer Kalender | **select** — Aufklappmenü oder Optionsknöpfe |
| **clock** — Uhrzeit mit Datum | **camera** — Standbild oder Livebild | |

Zwei Feinheiten, die den Alltag ausmachen:

**Der Button richtet sich nach der Entität.** Umschalter bei schaltbaren
Dingen, ein **Taster** bei `button`, `input_button`, `scene` und `script`,
**Auf / Stopp / Zu** bei `cover`. Tasten haben keinen eigenen Zustand — dafür
gibt es das Feld *Zustand von anderer Entität*, in das etwa ein Türkontakt
kommt. So drückt die Kachel das Garagentor und zeigt zugleich, ob es offen ist.

**Die Kamera kann sparsam sein.** Standbild holt in einstellbarem Takt ein
Einzelbild, Livebild überträgt dauerhaft — je Karte wählbar. Ein Livebild auf
einer Seite, die gerade niemand sieht, wird angehalten. Tippen öffnet in
beiden Fällen den großen Kameradialog.

### Die Fahrzeugkarte

Für Mercedes-Benz über [`mbapi2020`](https://github.com/ReneNulschDE/mbapi2020).
Links eine Symbolleiste im Zuschnitt von CarPlay, daneben fünf Bereiche:

**Übersicht** mit Reichweite, Tankbalken, Kilometerstand, Verriegelung und
Fenstern · **Fahrt** mit Strecke, Tempo und Verbrauch, je seit Start und seit
Zurücksetzen · **Status** mit jedem Fenster und jeder Warnleuchte einzeln ·
**Reifen** mit den vier Drücken im Grundriss des Wagens · **Eco** mit den
Fahrstil-Werten.

Eingerichtet wird sie mit **einer** Entität: aus deren Kennung findet die
Karte die übrigen dreißig selbst — auch die, die den Gerätenamen vor der
Kennung tragen. Jedes Feld bleibt einzeln überschreibbar.

Zuschnitt und Feldbelegung sind von
[`vehicle-info-card`](https://github.com/ngocjohn/vehicle-info-card) (MIT)
übernommen, der Code ist neu geschrieben.

<details>
<summary><b>Beispielkonfiguration zum Ausprobieren</b></summary>

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
            card_type: camera
            entity: camera.deine_kamera
            camera_mode: still
            refresh_interval: 10
```

`haos_weight` ist der Höhenfaktor: 1 entspricht `row_height`, 2 dem Doppelten.
Für flache Fremdkarten wie Mushroom sind Werte um 0,4 richtig.

</details>

## Weiterlesen

| Dokument | Inhalt |
|---|---|
| [docs/editor.md](https://github.com/Piranha1605/ha-os/blob/main/docs/editor.md) | Wie der Editor aufgebaut ist, Seiten und Navigation, Fremdkarten ohne YAML |
| [docs/gestaltung.md](https://github.com/Piranha1605/ha-os/blob/main/docs/gestaltung.md) | Woraus die Glasoptik besteht, Hintergrundbild |
| [docs/architektur.md](https://github.com/Piranha1605/ha-os/blob/main/docs/architektur.md) | Warum gebündelt wird, was gegenüber dem Vorgänger anders läuft, Aufbau des Quelltextes |

## Blueprint: Ton beim Ablaufen eines Timers

Die Uhrkarte kann einen Kurzzeitwecker stellen und beim Ablaufen selbst einen
Ton abspielen — aber nur auf dem Gerät, das gerade hinsieht. Für eine Ansage
über einen Lautsprecher gibt es einen Blueprint dazu:

[![Blueprint importieren](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2FPiranha1605%2Fha-os%2Fblob%2Fmain%2Fblueprints%2Ftimer-ton.yaml)

Timer, Lautsprecher, Tondatei, Lautstärke und Wiederholungen sind darin
auswählbar. Quelle: [`blueprints/timer-ton.yaml`](https://github.com/Piranha1605/ha-os/blob/main/blueprints/timer-ton.yaml)

## Entwickeln

```sh
npm install
npm run check      # baut das Bündel und lässt alle Tests laufen
```

Einzeln: `npm run build` (src → `dist/ha-os.js`), `npm test` (gegen das
Bündel), `npm run test:src` (dieselben Tests gegen die Quelle).

**Ein bestandener Test ist keine Abnahme.** Die Tests laufen in jsdom und
kennen weder `ha-form` noch `ha-icon` in ihrer echten Implementierung. Ob es im
Frontend wirklich funktioniert, zeigt nur ein Blick dorthin.

## Noch offen

- Türschloss-Kacheln
- Mobilansicht ist funktionsfähig, aber nicht feingeschliffen
- `tap_action` und getrennte Zustandsentität bisher nur bei Button und Kamera

## Lizenz

MIT
