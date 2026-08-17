# HA-OS

Dashboard-Erweiterung für Home Assistant, die sich wie ein Betriebssystem bedienen lässt: durchgehende Glasfläche mit Seitenleiste, Kopfzeile und frei gewichteten Rastern. Entwickelt von Enrico Fischer (GitHub `Piranha1605`).

Repository: https://github.com/Piranha1605/ha-os · MIT-Lizenz · Verteilung über HACS

## Aufbau

```
src/
├── ha-os.js              Einstiegspunkt, registriert die Karten
├── cards/                die vier Kartentypen samt Editoren
│   ├── shell-card.js     ha-os-shell — das Grundgerüst
│   ├── haos-card.js      ha-os-card — generische Karte mit elf Varianten
│   ├── grid-card.js      ha-os-grid — 2x2-Raster
│   ├── vehicle-card.js   ha-os-vehicle — Mercedes-Benz-Integration
│   └── printer-card.js   Drucker-Karte
└── shared/               card-catalog, config, theme, utils
dist/ha-os.js             gebaute Datei, die HACS ausliefert
scripts/build.mjs         Build über esbuild
tests/*.mjs               Tests, laufen unter jsdom
blueprints/               Blueprint für Timer-Benachrichtigungen
docs/                     architektur.md, editor.md, gestaltung.md
```

## Befehle

```
npm run build     baut dist/ha-os.js
npm test          alle Tests
npm run check     Build und Tests zusammen
```

Nach jeder Änderung an `src/` muss `dist/ha-os.js` neu gebaut werden — HACS liefert die gebaute Datei aus, nicht die Quellen.

## Leitlinien des Projekts

- **Kompatibilität** — alle vorhandenen Lovelace-Karten funktionieren unverändert innerhalb von HA-OS. Nichts einbauen, was bestehende Karten bricht.
- **Performance** — das DOM wird einmalig aufgebaut, danach ändern sich nur Werte, Klassen und Stile. Kein Neuaufbau bei jedem Zustandswechsel.
- **Bedienbarkeit** — die Konfiguration läuft vollständig über den visuellen Editor. Kein YAML erforderlich. Jede neue Einstellung braucht auch eine Editor-Oberfläche.

## Zielgruppe

Einsteiger. Leute, die Home Assistant laufen haben und ein Dashboard wollen, das nach etwas aussieht, ohne sich in YAML einzuarbeiten. Das unterscheidet HA-OS von HATG, das sich an Fortgeschrittene richtet.

## Stand und offene Punkte

**Kein `.github/workflows`-Ordner.** Das ist die wichtigste offene Baustelle: Für die Aufnahme in den HACS-Store werden HACS Validation und Hassfest Validation erwartet. HATG hat vier Workflows und validiert täglich, HA-OS gar nicht. Solange die fehlen, gibt es keinen sinnvollen PR bei `hacs/default`.

Reichweite (Stand 15.08.2026): 144 Aufrufe von 35 Besuchern in 14 Tagen, 205 Clones. Bei HACS entspricht ein Clone ungefähr einer Installation — HA-OS wird also mehr installiert als HATG, hat aber null Sterne. Der Zulauf kommt fast vollständig über `community.simon42.com`.

Das Projekt wurde am 05.08.2026 angelegt. 45 Releases seitdem, aktuell v0.30.2.

## Schreibstil

Sachlich, per du, **keine Emojis, kein Marketing-Sprech**. Funktionen beschreiben, was sie tun, nicht wie großartig sie sind.

Alles, was nach außen geht — README, Release Notes, Issue-Antworten, Dokumentation — **immer in beiden Sprachen, deutsch und englisch**.

## Zusammenhang

Enricos Second Brain liegt unter `~/Projekte/Second Brain`. Die Projektnotiz dazu ist `02 Projekte/HA-OS.md`, laufende Nutzeranfragen gehören nach `03 Bereiche/Open-Source-Betreuung/`. Ein täglicher Lauf sichtet Issues und Pull Requests und trägt Befunde dort ein.

Nichts auf GitHub beantworten, kommentieren oder schließen, ohne dass Enrico es sagt. Antwortentwürfe vorschlagen ist erwünscht.
