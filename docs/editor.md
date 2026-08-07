# Editor, Seiten und Fremdkarten

[← Zurück zur Übersicht](../README.md)

## Seiten und Navigation

Jede Seite erscheint als Symbol in der linken Leiste **und** als Reiter in der
Kopfzeile. Beides lässt sich unter *Allgemein* einzeln abschalten — bei vielen
Seiten läuft die Kopfzeile sonst über, dann reicht die Leiste.

Neue Seiten legt man unter *Seiten* an. Jede bekommt automatisch drei leere
Raster.

## Aufbau des Editors

Drei Reiter:

**Aussehen** — die Maße der Shell, Abstand und Kartenhöhe.

**Leisten** — alles am Rand: Benutzer in der Kopfzeile, ob Seiten als Reiter
oben und/oder als Symbole in der Seitenleiste erscheinen, die Systemknöpfe und
die Schnellaktionen.

**Seiten** — die ganze Struktur, vier Ebenen tief:

```
Seite  ▸  Allgemein · Badges · Raster 1 · Raster 2 · Raster 3
          Raster  ▸  Karte 1 · Karte 2 · …
                     Karte  ▸  Felder
```

Überall dieselbe Geste: anklicken klappt auf. **Pro Ebene ist immer nur ein
Block offen** — öffnet man Raster 2, schließt Raster 1 samt der Karte darin.
Sonst wächst die Liste bei vier Ebenen so weit, dass man beim Scrollen die
Orientierung verliert. Jeder offene Block trägt eine Pfadzeile wie
`Wohnzimmer › Raster 1 › Karte 1`.

Vorher lagen Seiten und Karten in getrennten Reitern und man musste dieselbe
Seite zweimal auswählen. Ein Zwischenstand mit nummerierten Reitern `1 2 3`
wurde wieder verworfen: die Nummer allein sagt nicht, in welchem Raster welcher
Seite man steckt.

## Höhe einer Karte

`haos_weight` ist ein Faktor auf `row_height`: 1 ist die Standardhöhe, 2 das
Doppelte. Einstellbar von 0,1 bis 6 in Schritten von 0,05 — die feine Stufung
gibt es, weil flache Fremdkarten wie Mushroom bei 125 px Grundhöhe etwa 0,4
brauchen und ein Viertelschritt dafür zu grob ist.

## Karten ohne YAML einsetzen

Fremdkarten werden über eine Auswahlliste eingefügt und danach mit ihrem echten
Home-Assistant-Editor konfiguriert.

Zur Umsetzung, weil sie nicht offensichtlich ist: `hui-card-element-editor` ist
verfügbar, sobald unser Editor läuft — er steckt im selben nachgeladenen Paket
wie HAs Kartendialog, und darin läuft unser Editor immer.
`hui-card-picker` dagegen lädt erst, wenn der Anwender in Home Assistant selbst
auf *Karte hinzufügen* tippt, und lässt sich von außen nicht zuverlässig
nachladen.

Die Auswahlliste ist deshalb Eigenbau: sie liest `window.customCards`, wo sich
jede installierte Fremdkarte beim Laden selbst einträgt, und ergänzt die
gebräuchlichen Standardkarten. Fehlt HAs Editor in einer Version, fällt die
Karte auf YAML zurück.
