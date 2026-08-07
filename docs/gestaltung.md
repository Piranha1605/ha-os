# Glasoptik und Hintergrundbild

[← Zurück zur Übersicht](../README.md)

## Woraus das Glas besteht

Der Eindruck von Glas entsteht **nicht** durch Weichzeichnung, sondern durch
drei Schichten, die in `shared/utils.js` zusammenkommen:

1. **Schimmer** — ein diagonaler Verlauf über der Fläche (`--haos-*-gloss`)
2. **Grundfarbe** — die eingefärbte, transparente Fläche darunter
3. **Glanzkante** — helle Linie oben, dunkle unten, als inset-Schatten
   (`--haos-*-sheen`)

Eine gleichmäßig getrübte Fläche mit rundum gleich hellem Rahmen wirkt flach,
egal wie stark die Weichzeichnung steht — viel Blur bei wenig Kontrast lässt
Glas wattig aussehen. Deshalb regelt der Schieber **Glanz** in den
Einstellungen alle drei Anteile gemeinsam, getrennt für Hintergrundfläche und
Entitätskarten.

**Nach dem Update auf 0.4.0:** wer schon eigene Theme-Werte gespeichert hat,
behält Unschärfe, Rundung und Sättigung wie bisher — die liegen im
localStorage. Nur der neue Glanz kommt automatisch dazu. Für die überarbeiteten
Vorgaben (weniger Unschärfe, mehr Sättigung, größere Rundung) in den
Einstellungen einmal **Zurücksetzen** drücken.

## Hintergrundbild

In der internen Einstellungsseite unter *Hintergrundbild*, getrennt für Hell und
Dunkel, dazu ein Regler zum Abdunkeln.

Zwei Wege, ein Bild zu hinterlegen:

- **Hochladen** über Home Assistants eigene Bildablage. Das Bild liegt danach
  unter `/api/image/serve/…`.
- **Eigener Pfad**, etwa `/local/wallpaper/bild.jpg` für Dateien, die man selbst
  nach `config/www/wallpaper/` gelegt hat.

Eine Lovelace-Karte kann **nicht** selbst nach `config/www/` schreiben — dafür
gibt es keine Schnittstelle. Daher der Umweg über HAs Bildablage.

Zugelassen sind nur Adressen innerhalb dieser Installation (`/local/`, `/api/`,
`/media/`, `/hacsfiles/`). Ein Bild von einer fremden Adresse würde bei jedem
Laden des Dashboards eine Verbindung dorthin aufbauen.
