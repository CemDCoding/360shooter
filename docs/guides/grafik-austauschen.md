# Grafik austauschen

Diese Anleitung zeigt dir, wie du eine Grafik im Spiel ersetzt. Du brauchst dafür keine Programmierkenntnisse. Du tauschst nur eine Bilddatei aus.

## Was du brauchst

- Ein Zeichenprogramm für Pixelgrafik. Kostenlos sind zum Beispiel:
  - **LibreSprite** (Programm zum Installieren)
  - **Piskel** (läuft im Browser, nichts zu installieren)
- **Aseprite** ist eine kostenpflichtige Alternative. Es kann das Gleiche.
- Den Projektordner `360shooter` auf deinem Rechner.
- **Node.js 24**: ein kostenloses Hilfsprogramm von nodejs.org. Es führt die Prüf-Befehle aus. Einmal installieren genügt.
- Ein Terminal (Eingabeaufforderung), um Befehle einzutippen. Wie das geht, steht unten.
- Einmalig im Projektordner im Terminal diesen Befehl tippen und Enter drücken:

  ```
  npm install
  ```

  Er lädt alle Teile herunter, die das Projekt braucht. Das dauert ein paar Minuten und ist nur beim ersten Mal nötig.

## Die Regeln

1. Die Datei ist eine **PNG** mit **transparentem Hintergrund**.
2. Die Größe stimmt **exakt**. Sie steht in der Tabelle unten. Ein Pixel zu viel oder zu wenig ist ein Fehler.
3. Die **Frames** liegen **waagerecht nebeneinander**. Ein Frame ist ein Einzelbild der Animation. Das erste Frame ist ganz links.
4. Die Figur **schaut nach rechts**.
5. **Harte Pixel**, keine Kantenglättung. Schalte "Antialiasing" und "Weichzeichnen" aus.
6. Der **Dateiname bleibt unverändert**. Das Spiel findet die Datei nur über den Namen.

## Alle Sprites

Alle Dateien liegen in `public/assets/sprites/`. Die Zahlen stammen aus der Asset-Liste des Spiels (`src/config/assets.ts`).

Beispiel: `astronaut.png` hat 4 Frames mit je 32 x 32 Pixel. Die Datei ist also 4 x 32 = 128 Pixel breit und 32 Pixel hoch.

| Datei                     | Frame-Größe (Pixel) | Frames | Gesamtgröße der Datei (Pixel) | Was ist zu sehen                          | Welcher Frame wofür                                                           |
| ------------------------- | ------------------- | ------ | ----------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------- |
| astronaut.png             | 32 x 32             | 4      | 128 x 32                      | Die Astronautin (Spielfigur)              | Frame 1 und 2: Stehen (Idle). Frame 3 und 4: Schuss                           |
| boss-root-monster.png     | 64 x 64             | 4      | 256 x 64                      | Boss: verwurzeltes Baummonster (Wald)     | Frame 1 bis 4: Animation der Reihe nach                                       |
| boss-root-spike.png       | 16 x 32             | 3      | 48 x 32                       | Wurzelspitze, die aus dem Boden bricht    | Frame 1 bis 3: Hervorbrechen der Reihe nach                                   |
| boss-forest-ghost.png     | 48 x 48             | 4      | 192 x 48                      | Boss: Waldgeist (Wald bei Nacht)          | Frame 1 bis 4: Animation der Reihe nach                                       |
| boss-ghost-orb.png        | 8 x 8               | 2      | 16 x 8                        | Geisterkugel des Waldgeists               | Frame 1 und 2: zwei Bilder der Animation                                      |
| boss-giant-stone.png      | 64 x 64             | 4      | 256 x 64                      | Boss: Riesen-Stein (Elfenwald)            | Frame 1 bis 4: Animation der Reihe nach                                       |
| laser.png                 | 16 x 4              | 1      | 16 x 4                        | Der Laserschuss der Astronautin           | Nur ein Frame                                                                 |
| witch-bolt.png            | 8 x 8               | 2      | 16 x 8                        | Die Zauberkugel der Waldhexe              | Frame 1 und 2: zwei Bilder der Animation                                      |
| enemy-cursed-tree.png     | 32 x 32             | 4      | 128 x 32                      | Gegner: verfluchter Baum                  | Frame 1 bis 4: Animation der Reihe nach                                       |
| enemy-forest-witch.png    | 32 x 32             | 4      | 128 x 32                      | Gegner: Waldhexe                          | Frame 1 bis 4: Animation der Reihe nach                                       |
| enemy-zombie-squirrel.png | 24 x 24             | 4      | 96 x 24                       | Gegner: Zombie-Eichhörnchen               | Frame 1 bis 4: Animation der Reihe nach                                       |
| enemy-forest-spirit.png   | 32 x 32             | 4      | 128 x 32                      | Gegner: Waldgeist                         | Frame 1 bis 4: Animation der Reihe nach                                       |
| item-heal.png             | 16 x 16             | 2      | 32 x 16                       | Item: Heilung                             | Frame 1 und 2: zwei Bilder der Animation                                      |
| item-double-shot.png      | 16 x 16             | 2      | 32 x 16                       | Item: Doppelschuss                        | Frame 1 und 2: zwei Bilder der Animation                                      |
| item-shield.png           | 16 x 16             | 2      | 32 x 16                       | Item: Schutzschild                        | Frame 1 und 2: zwei Bilder der Animation                                      |
| item-rapid-fire.png       | 16 x 16             | 2      | 32 x 16                       | Item: Schnellfeuer                        | Frame 1 und 2: zwei Bilder der Animation                                      |
| item-fire-ring.png         | 16 x 16             | 2      | 32 x 16                       | Rüstung: Feuerring (Pickup)               | Frame 1 und 2: zwei Bilder der Animation                                      |
| coin-small.png            | 8 x 8               | 4      | 32 x 8                        | Kleine Münze                              | Frame 1 bis 4: Drehung der Münze der Reihe nach                               |
| coin-big.png              | 16 x 16             | 4      | 64 x 16                       | Große Münze                               | Frame 1 bis 4: Drehung der Münze der Reihe nach                               |
| tiles-forest.png          | 32 x 32             | 4      | 128 x 32                      | Kacheln der Map "Wald"                    | Vier Kachel-Varianten. Reihenfolge wie in der Platzhalter-Datei lassen        |
| tiles-forest-night.png    | 32 x 32             | 4      | 128 x 32                      | Kacheln der Map "Wald bei Nacht"          | Vier Kachel-Varianten. Reihenfolge wie in der Platzhalter-Datei lassen        |
| tiles-elf-forest.png      | 32 x 32             | 4      | 128 x 32                      | Kacheln der Map "Elfenwald"               | Vier Kachel-Varianten. Reihenfolge wie in der Platzhalter-Datei lassen        |
| weapon-raygun.png         | 24 x 16             | 6      | 144 x 16                      | Die Strahlenpistole, nach rechts zeigend  | Je Ausbaustufe 2 Frames (Ruhe, Schuss): Frame 1 und 2 Stufe 1, 3 und 4 Stufe 2, 5 und 6 Stufe 3 |
| ui-icons.png              | 16 x 16             | 4      | 64 x 16                       | Symbole der Oberfläche                    | Frame 1: Ton an. Frame 2: Ton aus. Frame 3: Pause. Frame 4: Schloss           |

Tipp: Öffne zuerst die vorhandene Platzhalter-Datei. So siehst du, wie die Frames angeordnet sind.

### Strahlenpistole (`weapon-raygun.png`)

- Die Waffe ist ein **eigenes Sprite**, nicht Teil der Astronautin. Sie zeigt nach rechts (0 Grad) und dreht sich im Spiel um den Griff.
- **Griff** (Drehpunkt) liegt im Frame bei x 7, y 12. Die **Mündung** (hier startet der Laser) liegt 15 Pixel rechts und 5 Pixel über dem Griff. Zeichne so, dass diese beiden Punkte stimmen.
- Frame 1 jeder Stufe ist die Ruhe, Frame 2 der Schuss (die Mündung leuchtet einen Frame lang).
- Stufe 1 ist schlicht, Stufe 2 hat Kühlrippen und eine größere Flosse, Stufe 3 einen leuchtenden Kern und eine große Mündung.
- Die Laserfarbe gehört zur Waffe (Korallenrosa `#ff8fae`), sie steckt nicht im Sprite.

### Symbole (`ui-icons.png`)

Zwei Farben: Linie und Füllung. Das Spiel färbt die Symbole per Tint ein, zeichne sie deshalb in der Linienfarbe `#14101c` und mit heller Füllung `#e8ecf2`. Das Herz gibt es nicht mehr.

### Schriften (`public/assets/fonts/`)

Die Schriften **Astro Kapsel** (dick, für Titel und Zahlen) und **Astro Funk** (schmal, für HUD und Beschriftungen) werden **nicht von Hand ersetzt**. Sie entstehen aus den Pixel-Glyphen in `docs/design/assets/fonts.js`. Wenn du Zeichen änderst, bearbeitest du diese Datei und tippst dann:

```
npm run fonts:build
```

Der Befehl schreibt je Schrift eine PNG (weiße Zeichen, transparent) und eine XML in `public/assets/fonts/`. Danach prüft `npm run assets:check` beide Dateien: Jede Zeichen-ID kommt nur einmal vor und jedes Zeichen liegt im Bild. Die Schriften haben nur Großbuchstaben (und Funk zusätzlich ein kleines `s`). Der Text muss im Spiel also groß geschrieben übergeben werden.

### Regeln für alle Sprites (aus dem Sprite-Styleguide)

- **Raster:** 1 Pixel der Grafik ist 1 Pixel der Spielfläche (640 x 360). Sprites werden nicht skaliert. Nur Boss-Sprites dürfen ganzzahlig doppelt gezeigt werden.
- **Palette:** Die Astronautin trägt in allen Biomen dieselben Farben: Anzug `#fff4e8` und `#e0c9d6`, Visier `#2a1640`, Augen `#5fe0c0`, Wangen `#ffa0ae`, Akzent `#ff6b8a`. Gegner sind mittelhell, zeichne sie hell und wenig gesättigt, denn die Biome färben sie ein. Gegner-Augen leuchten rot oder magenta.
- **Umriss:** Jede Figur hat einen geschlossenen Umriss von 1 Pixel. Astronautin, Waffe, Münzen und Items nutzen Tinte `#0b0610`, Gegner Nachtschwarz `#070a14`.
- **Licht:** von oben links. Glanzlicht oben links, Schatten unten rechts.
- **Ankerpunkte:** Bei der Waffe sind Griff und Mündung fest (siehe oben). Die Hand der Astronautin sitzt 10 Pixel rechts und 9 Pixel unter der Mitte ihres Frames, dort sitzt der Griff.
- **Keine Zahlen über Gegnern.** Ein Treffer ist ein weißer Blitz von 120 Millisekunden.

### App-Icons (`public/icons/`)

Die Icons `icon-180.png`, `icon-192.png` und `icon-512.png` entstehen aus `docs/design/assets/app-icon.svg` (Helm der Astronautin) und werden scharf (ohne Glättung) hochgerechnet. Nach einer Änderung an der SVG tippst du `npm run icons`. Es werden nur Rechtecke, Gruppen mit Verschiebung und Deckkraft unterstützt, alles andere meldet das Skript als Fehler.

## Schritt für Schritt

1. **Datei öffnen.** Öffne die Platzhalter-Datei aus dem Ordner `public/assets/sprites/` in deinem Zeichenprogramm. Zum Beispiel `astronaut.png`.
2. **Zeichnen.** Male die Frames nebeneinander. Halte dich an die Regeln oben. Die Leinwand muss genau die Gesamtgröße aus der Tabelle haben. Die Breite ist Frame-Breite mal Anzahl der Frames, die Höhe ist die Frame-Höhe. Beispiel `astronaut.png`: 32 mal 4 = 128 Pixel breit, 32 Pixel hoch.
   - **LibreSprite:** Öffnest du die Platzhalter-Datei, stimmt die Größe schon. Bei einer neuen Datei wählst du `Datei > Neu` und trägst Breite und Höhe ein. Später änderst du sie unter `Sprite > Leinwandgröße`.
   - **Piskel:** Beim Start oder unter dem Werkzeug "Größe ändern" Breite und Höhe eintragen. Entferne den Haken bei "Seitenverhältnis beibehalten", sonst ändert sich die Höhe mit. Beim Export (PNG) wähle Skalierung 1x.
3. **Speichern.** Speichere als **PNG** mit **demselben Namen** im **selben Ordner** `public/assets/sprites/`. Die alte Datei wird dabei ersetzt.
4. **Terminal öffnen.** Öffne den Projektordner im Datei-Explorer. Klicke oben in die Adresszeile, tippe `powershell` und drücke Enter. Es öffnet sich ein Fenster, in dem du Befehle eintippst.
5. **Dateien prüfen.** Tippe diesen Befehl und drücke Enter:

   ```
   npm run assets:check
   ```

   Der Befehl prüft alle Bilder und Sounds. Er meldet, wenn eine Datei fehlt oder eine falsche Größe hat. Steht am Ende "Alles in Ordnung", ist alles richtig. Bei "FEHLER" lies die Meldung und korrigiere die genannte Datei.

6. **Spiel ansehen.** Tippe diesen Befehl und drücke Enter:

   ```
   npm run dev
   ```

   Der Befehl startet das Spiel auf deinem Rechner. Im Fenster steht eine Adresse, meist `http://localhost:5173/`. Öffne sie im Browser und hänge `?assets=1` an, also `http://localhost:5173/?assets=1`. Du siehst dann alle Sprites mit Animation. Zum Beenden drückst du im Terminal `Strg + C`.

7. **Lizenz eintragen.** Siehe den nächsten Abschnitt. Ohne Eintrag darf die Grafik nicht ins Projekt.

## Pflicht: Lizenz eintragen

Das Repository ist **öffentlich**. Jeder kann deine Dateien sehen. Darum gilt:

- Nutze nur Grafiken, die du **selbst gemacht hast** oder die du **ausdrücklich verwenden darfst** (klare Lizenz, zum Beispiel CC0).
- Keine Bilder aus dem Netz ohne erlaubte Lizenz.
- Trage jede ersetzte Datei in `public/assets/LICENSES.md` ein. Ändere in der Tabelle die Spalten "Herkunft" und "Lizenz". Schreibe dort zum Beispiel "selbst gezeichnet von Anna" und "selbst erzeugt", oder bei fremden Grafiken Quelle, Autor und Lizenz.

## Häufige Fehler

| Meldung oder Problem                    | Ursache                                         | Lösung                                                                                  |
| --------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| "Falsche Groesse: ... Erwartet: ..."      | Die Leinwand hat nicht die Gesamtgröße          | Leinwandgröße in der Tabelle nachsehen und im Programm anpassen                         |
| "Datei fehlt"                           | Name falsch oder falscher Ordner                | Name genau wie in der Tabelle schreiben, Ordner `public/assets/sprites/`                |
| "keine gueltige PNG-Datei"               | Datei nur umbenannt, zum Beispiel aus einer JPG | Im Programm wirklich als PNG exportieren                                                |
| Hinweis "keinen transparenten Hintergrund" | Hintergrund ist weiß oder farbig                | Hintergrund löschen, sodass er durchsichtig ist                                         |
| Bild wirkt verschwommen                 | Kantenglättung war an                           | Antialiasing ausschalten, neu zeichnen oder ohne Skalierung speichern                   |
| Figur läuft rückwärts                   | Figur schaut nach links                         | Figur spiegeln, sodass sie nach rechts schaut                                           |
| Animation springt                       | Frames in falscher Reihenfolge                  | Frames von links nach rechts in der Reihenfolge der Tabelle anordnen                    |
| Änderung nicht sichtbar                 | Browser zeigt alte Datei                        | Seite mit `Strg + F5` neu laden                                                         |
