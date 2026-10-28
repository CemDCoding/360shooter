# Design-Brief – 360shooter

**Status:** geändert am 2026-10-28 (Ergänzung H-25 „Münzen 12 px, kleine Chips, NIEDERLAGE“ nach den Handtest-Antworten des Nutzers; H-23 freigegeben am 2026-10-28; „Ingame-Sprites“ und H-14 freigegeben am 2026-10-26; erste Fassung freigegeben am 2026-10-25)
**Stand:** Ergänzung H-25 eingetragen (Feldmünzen `coin-field` 6×6 ×2 und `coin-big` 12×12, Chip-Zeile der HUD-Tabelle mit den verkleinerten Chips, Ausrichtung oben, „NIEDERLAGE“ in Brief und Mockups). Die Ergänzung setzt Nutzerentscheidungen um (Q-50, Q-53, Q-54, PE-119); der Status „geändert“ ist auf Wunsch des Nutzers gesetzt, damit der Planner sie übernimmt. Nächster Schritt: Planner-Auftrag „Design übernehmen“ für AP-92 (Übergabe unter „Änderungen“, H-25).

## Ausgangslage

- **Produkt:** Rundenbasierter 360°-Survival-Shooter im Pixel-Stil. Eine süße Astronautin steht in der Bildschirmmitte auf einem fremden Planeten und überlebt Monsterwellen (Wald 0–4, Wald bei Nacht 5–9, Elfenwald 10–20).
- **Zielgruppe:** Gelegenheitsspieler auf Handy und PC, im ersten Stich nur der Nutzer selbst.
- **Plattform:** Phaser 3 + TypeScript, feste Spielfläche 640×360 logische px, `pixelArt: true`, skaliert mit FIT. PC (Maus) und iPhone (PWA, Querformat, Touch, virtueller Stick).
- **Styling vorher:** kein CSS-Framework. Farben und Schriften hart codiert in TS (rund 120 Stellen in 21 Dateien), Systemschrift `monospace`.
- **Bestand:** Alle 30 Sprites sind Platzhalter (`public/assets/.placeholders.json`). Bleibt: Biom-Stimmung (Wald grün, Nacht blau mit Glühwürmchen, Elfenwald violett mit Sporen), Gold als Münzfarbe, Spielerporträt im Menü. Wird ersetzt: alle UI-Farben, Buttons, Schrift, Darstellung von Spielerin und Waffe.
- **Recht:** nicht veröffentlicht, deshalb kein Impressum nötig (R3 greift erst bei Veröffentlichung). Keine externen Requests, alle Schriften und Grafiken sind eigene Dateien.

## Umfang des Designs

- UI-System (Farben, Schrift, Buttons, Panels, HUD, Menü, Ergebnis) **plus** verbindlicher Sprite-Styleguide (1a).

## Wirkung

- **Drei Adjektive:** niedlich, mutig, geheimnisvoll. **Auf keinen Fall:** düster-brutal, Handy-Casino-bunt.
- **Vorbilder:** Metroid als Haltung (dunkle fremde Welt, Leuchtakzente), Zelda (Charme, Menüs, Items), Celeste (süße Figur, stimmungsvolle Welt), Vampire Survivors nur fürs Spielprinzip.
- **Abgrenzung:** kein überladener Survivor-Look mit Zahlenregen und grellen Effekten.
- **Lesbarkeit:** größeres HUD zugunsten des iPhones (5b), Zustände nie nur über Farbe.
- **Dichte und Ton:** Menü ruhig und luftig, HUD kompakt und sachlich, Arcade-Retro-Anteil bleibt (8a).

## Gewählte Richtung

**„Außen die Spielkassette, innen das Funkgerät im Anzug.“** Eine Kombination aus den Richtungen B und C (Nutzer, 2026-10-25).

- **Kassette (Menü, Level-Auswahl, Upgrade-Panel, Dialoge, Laden, Hochformat-Hinweis):** Pflaume, Koralle, Minze, Creme. Jede Fläche hat eine helle Kante oben links und eine dunkle unten rechts, dazu einen schwarzen Umriss und einen harten 4-px-Pixelschatten. Biom-Namen sind Aufkleber. Schrift *Astro Kapsel*.
- **Funkgerät (Runde, HUD, Pause, Ergebnis):** dunkles Glas mit Phosphorgrün, 1-px-Linien, gepunktete Trenner, Logbuch-Kopf. Schrift *Astro Funk*. Das Biom zeigt sich nur in der Welt und als Farbband auf dem Ergebnis-Screen (11a).
- **Erkennungsmerkmal:** die eigene Schrift „Astro“ (Kapsel mit weichen Ecken, Funk mit angeschliffener Ecke oben links) und die aufrechte, süße Astronautin mit kreisender Retro-Strahlenpistole.
- **Waffe:** eigenes Sprite mit Ankerpunkten, dreht sich um 360° um die Hand (Gungeon-Prinzip, 13a). Retro-Strahlenpistole (14a) mit drei Ausbaustufen nach Waffen-Upgrades 0–6, 7–13 und 14–20 (15a).
- **Abgelehnt:** A „Visier“ (Türkis, Zielklammern): zu kühl. Fertige Pixelschriften: wirkten zu generisch („zu KI-mäßig“).

## Grundsätze

Coder und Reviewer prüfen diese Regeln:

1. **Nur Tokens.** Farben, Abstände, Größen und Zeiten kommen aus `src/config/theme.ts` (erzeugt aus `docs/design/export/tokens.resolved.json`). Keine `0x…`- oder `#…`-Literale in `src/scenes/**` und `src/entities/**`.
2. **Zwei Welten, nicht mischen.** Menü-Szenen nutzen nur `color.menu.*` und die Schrift Kapsel. Runde, Pause und Ergebnis nutzen nur `color.hud.*` und die Schrift Funk. Gold (`gold.400`), Warnrot (`red.300`) und die Sprite-Palette sind in beiden Welten gleich.
3. **Ein Pixelraster.** 1 Grafik-Pixel ist 1 logischer Pixel. Schrift wird nur ganzzahlig skaliert (1×–4×), Sprites gar nicht (Ausnahme: Boss 2×). Keine weichen Verläufe, keine Unschärfe.
4. **Nie nur Farbe.** Jeder Zustand hat ein zweites Merkmal: Stern (geschafft), Ring und Pfeil (aktuell), Schloss (gesperrt), Text „ZU TEUER“ oder „MAX“, Label „ENERGIE!“ bei wenig Energie, „BOSS!“ in der Nachspielzeit, Zahl oder Sekunden in jedem HUD-Chip.
5. **Ziele mindestens 32×32** logische px (Buttons, Kacheln, HUD-Buttons). Der Fokus ist ein sichtbarer 2-px-Ring (`menu.focus` bzw. `hud.focus`) mit Abstand.
6. **Eine Hauptaktion je Ansicht** in Koralle (Menü: „UPGRADES“ bzw. Kaufen; Ergebnis: „NÄCHSTES LEVEL“ oder „NOCHMAL“ mit Akzentrahmen).
7. **Bewegung ist kurz und abschaltbar.** 80–300 ms, Pixel-Easing in Stufen. Mit `prefers-reduced-motion` gibt es kein Blinken (Energie, Timer, liegende Items) und keine Bildschirm-Erschütterung. Die Information bleibt über Text und Umriss erhalten.
8. **Keine Zahlen über Gegnern.** Treffer zeigen sich als weißer Blitz von 120 ms, nicht als Schadenszahl.

## Schriften und Assets

| Schrift/Asset | Nutzung | Lizenz | Quelle/Paket |
|---|---|---|---|
| Astro Kapsel (eigene Bitmap-Schrift) | Menü, Titel, große Zahlen | eigene Arbeit des Projekts | Glyphen in `docs/design/assets/fonts.js` → `public/assets/fonts/astro-kapsel.png` + `.xml` |
| Astro Funk (eigene Bitmap-Schrift) | HUD, Pause, Ergebnis, Labels | eigene Arbeit des Projekts | Glyphen in `docs/design/assets/fonts.js` → `public/assets/fonts/astro-funk.png` + `.xml` |
| Sprite-Vorlagen (Astronautin, Strahlenpistole 1–3, Gegner, Items, Icons) | Silhouette und Palette für die finalen Sprites | eigene Arbeit | `docs/design/assets/pixel.js`, `mockups/sprites.html` |
| Finale Ingame-Sprites (Astronautin 32×32×4, Strahlenpistole 24×16×6, Laser 16×4) | Pixelquelle für `public/assets/sprites/` | eigene Arbeit | `docs/design/assets/sprites.js`, `mockups/sprites-ingame.html` |
| Finale Ingame-Sprites der Welt (Gegner, Bosse, Geschosse, Items, Münzen, Kacheln, UI-Icons) | Pixelquelle für `public/assets/sprites/` | eigene Arbeit | `docs/design/assets/sprites-world.js`, `mockups/sprites-welt.html` |
| App-Icon (Helm mit Visier) | `public/icons/icon-180/192/512.png` | eigene Arbeit | `docs/design/assets/app-icon.svg` |
| Silkscreen, Press Start 2P, Pixelify Sans, Atkinson Hyperlegible Next | nur in den Richtungs-Entwürfen geprüft, **nicht verwendet** | OFL-1.1 | – |

Keine neuen npm-Abhängigkeiten.

## Entscheidungen

- 2026-10-25 Nutzer: 1a Umfang UI + Sprite-Styleguide · 2a niedlich, mutig, geheimnisvoll · 3a Metroid als Haltung · 4a Pixelschrift für Titel und Zahlen
- 2026-10-25 Nutzer: 5b größeres HUD · 6a Logo-Schriftzug und App-Icon · 7a + Zelda · 8a ruhiges Menü, kompaktes HUD, Arcade-Retro behalten, Spielerporträt im Menü behalten
- 2026-10-25 Nutzer: 9a Energie als Zahl + 10 Segmente · 10b Level-Raster bleibt · 11a UI unabhängig vom Biom
- 2026-10-25 Nutzer: Menü und Level-Auswahl aus B, Runde aus C · Waffe als eigenes, austauschbares Sprite · 12a eine Schriftfamilie, keine generische · 13a Figur aufrecht, Waffe kreist · 14a Retro-Strahlenpistole · 15a drei Ausbaustufen
- 2026-10-25 Nutzer: 16a eigene Schrift „Astro“ (Kapsel + Funk) · 17a Strahlenpistole wie entworfen
- 2026-10-25 Nutzer: Design freigegeben (inklusive der folgenden Annahmen)
- (angenommen) Laserfarbe gehört zur Waffe: Strahlenpistole Korallenrosa `#ff8fae`.
- (angenommen) Sekundenangaben im HUD mit kleinem „s“ (z. B. „4s“), damit sie nicht wie „45“ gelesen werden.
- (angenommen) Name „360shooter“ bleibt, das Logo ist der Kapsel-Schriftzug „360“ in Koralle + „SHOOTER“ in Creme.
- (angenommen) Kein zusätzlicher Fließtext-Font. Alle Texte im Spiel laufen über die Bitmap-Schrift.

## Übergabe an den Planner

**Ziel:** Das freigegebene Design ersetzt alle hart codierten Farben und die Systemschrift und trennt die Waffe von der Figur. Die Spiellogik ändert sich nicht.

### Exporte und Zielorte

| Quelle | Ziel im Projekt | Hinweis |
|---|---|---|
| `docs/design/export/tokens.resolved.json` | `src/config/theme.ts` | Ein Coder erzeugt daraus typisierte Konstanten. Farben als `0xRRGGBB` (Phaser) **und** als `'#rrggbb'` (Text-Tint). Alpha-Werte (`hud.glass`, `menu.scrim`, `hud.scrim`) als Paar aus Farbe und Alpha. `export/tokens.ts` und `tokens.css` sind für Phaser nicht nutzbar (CSS-Variablen). |
| `docs/design/assets/fonts.js` (Glyphen Kapsel, Funk) | `public/assets/fonts/astro-kapsel.png/.xml`, `astro-funk.png/.xml` | Ein kleines Node-Skript ohne neue Abhängigkeiten (`scripts/build-fonts.mjs`) schreibt PNG und BMFont-XML. Weiße Glyphen, Farbe per `setTint`. Laufweite 1 px, Leerzeichen Kapsel 3 px, Funk 2 px. Funk hat zusätzlich das kleine `s`. In `config/assets.ts` als Asset-Typ `bitmapFont` eintragen, `assets:check` erweitern. |
| `docs/design/assets/app-icon.svg` | `public/icons/icon-180.png`, `icon-192.png`, `icon-512.png` | Nearest-Neighbor skalieren. |
| Farben `menu.bg` | `index.html` (`theme-color`, Hintergrund), `public/manifest.webmanifest` (`background_color`, `theme_color`), `src/main.ts` (`backgroundColor`) | bisher `#0b0b14` |

### Anzupassende Screens und Komponenten

| Datei | Änderung | Mockup |
|---|---|---|
| `src/scenes/menu/Button.ts` | Kassetten-Button: Fase (2 px hell/dunkel), 2-px-Umriss, 4-px-Schatten. Varianten primary/secondary/danger/icon, Zustände hover, active (2 px versetzt), disabled, Fokus-Ring. Text in Kapsel 2×. | `styleguide.html` „Buttons · Menü“ |
| `src/scenes/MenuScene.ts` | Layout nach Mockup: Logo, Porträt-Karte (Spielerlevel, XP-Balken, Gold, Waffe x/20 mit Waffen-Symbol der Ausbaustufe, Anzug x/20, UPGRADES), Level-Panel, Zurücksetzen, Hinweiszeile. Sternenhimmel und Planet als Hintergrund. Leerer Spielstand: Hinweis „WILLKOMMEN! STARTE MIT LEVEL 0.“ | `mockups/hauptmenue.html` 1 und 4 |
| `src/scenes/menu/LevelGrid.ts` | nach Biom gruppiert mit Aufkleber und Bereich (0–4, 5–9, 10–20). Kachelzustände geschafft (Minze + Stern), aktuell (Koralle, Creme-Ring, Pfeil), gesperrt (Schloss). Legende unten. | `hauptmenue.html` 1 |
| `src/scenes/menu/UpgradePanel.ts` | Kassetten-Panel mit den Gruppen WAFFE und ANZUG, je Zeile 10 Pips, „x/10“ und Kaufen-Button mit Preis. Zustände kaufbar, zu teuer (deaktiviert, „ZU TEUER“) und MAX. Zeigt die nächste Waffen-Ausbaustufe. | `hauptmenue.html` 2 |
| `src/scenes/menu/ConfirmDialog.ts` | Kassetten-Dialog. Der Fokus liegt zuerst auf „ABBRECHEN“. | `hauptmenue.html` 3 |
| `src/scenes/HudScene.ts`, `hud/PowerIndicators.ts`, `hud/CoinCounter.ts`, `hud/ArmourIndicator.ts`, `hud/hudMath.ts` | Funk-HUD: Energie-Panel mit Zahl 3× und 10 Segmenten, Warnzustand ab 25 % oder weniger. Timer-Panel mit Warnung unter 10 s und „BOSS!“ in der Nachspielzeit. Chips nur für aktive Kräfte. Feuerring aktiv (Akzentrahmen) bzw. lädt (gepunktet). Pause-Overlay im Funk-Stil mit Level, Biom und Restzeit. | `mockups/runde.html` 1–4 |
| `src/scenes/controls/VirtualStick.ts` | gepunkteter Phosphor-Ring, Knopf mit Phosphor-Rand, aktiv heller | `styleguide.html` „Stick“ |
| `src/platform/audio.ts` (`addMuteButton`) | Ton-Button als Icon-Button: im Menü Kassette, in der Runde Funk | `styleguide.html` |
| `src/scenes/ResultScene.ts` | Funk-Ergebnis: Biom-Farbband oben, Logbuch-Kopf, GEWONNEN/VERLOREN 4×, Faktenliste, Buttons rechts unten mit Fokus auf der Hauptaktion | `mockups/ergebnis.html` 1–2 |
| `src/scenes/PreloadScene.ts` | Ladebalken im Kassetten-Stil „LADE KASSETTE …“. Die Schrift ist dann noch nicht geladen, deshalb nur Balken und Systemschrift, oder die Bitmap-Schrift als erstes Asset laden. | `styleguide.html` „Laden“ |
| `index.html` | Hochformat-Hinweis im Kassetten-Stil (Astronautin, „BITTE DREHEN“, Symbol Hoch → Quer). Als HTML/CSS, Farben aus `tokens.css`. | `ergebnis.html` 3 |
| `src/entities/Player.ts` | **Darstellung umbauen:** Die Figur dreht sich nicht mehr, sie spiegelt sich bei Zielwinkel > 90° (`flipX`). Neues Waffen-Sprite `weapon-raygun` als eigenes GameObject: Origin am Griff (7 \| 12 von 24×16), Position am Handpunkt (+10 \| +9 von der Mitte, gespiegelt −10), Rotation = Zielwinkel, `flipY` beim Zielen nach links, Tiefe hinter der Figur bei −160° bis −20°. Der Laser startet an der Mündung (+15 \| −5 vom Griff, mitrotiert) statt bei `MUZZLE_OFFSET`. Ausbaustufe aus der Summe der Waffen-Upgrades (0–6, 7–13, 14–20). `facingDeg` und die Logik bleiben unverändert. | `mockups/sprites.html`, `mockups/schrift-und-waffe.html` |
| `src/entities/Laser.ts` / `LaserPool.ts` | Laser per Tint in `game.laser-raygun` | `runde.html` |
| `src/config/maps.ts` | `baseColor` aus `biome.*-ground`, Partikel `game.firefly` / `game.spore` | `runde.html` |
| `src/config/assets.ts`, `docs/guides/grafik-austauschen.md` | neue Assets `weapon-raygun` (24×16, 6 Frames) und Bitmap-Fonts. `ui-icons` neu: Ton an, Ton aus, Pause, Schloss (16×16, 4 Frames). Sprite-Regeln aus `mockups/sprites.html` in die Anleitung übernehmen. | `sprites.html` |
| Schild-Ring, Feuerring (`Player.ts`, `ArmourRing.ts`) | Farben `game.shield-ring`, `game.fire-ring`. Der Feuerring ist gestrichelt. | `runde.html` 2 |

### Neue Abhängigkeiten

- keine. Schriften und Icons sind eigene Dateien. Das Font-Skript nutzt nur Node-Bordmittel (z. B. `zlib` für PNG).

### Reihenfolge-Empfehlung

1. **Grundlage (ein Paket):** `src/config/theme.ts` aus den Tokens, Bitmap-Fonts (Skript + Assets + `assets:check`), App-Icons und `index.html`/Manifest-Farben. Ohne Sichtwechsel bei den Szenen. Danach können die UI-Pakete parallel laufen.
2. **Menü-Paket:** `Button`, `MenuScene`, `LevelGrid`, `UpgradePanel`, `ConfirmDialog`, `PreloadScene`, Mute-Button.
3. **Runden-Paket:** `HudScene` mit Indikatoren, `VirtualStick`, Pause, `ResultScene`, `maps.ts`, Laser-Tint, Ringe.
4. **Waffen-Paket:** Player-Darstellung mit Spiegeln, Waffen-Sprite, Ankerpunkte, Mündung, Ausbaustufe. Dazu ein Platzhalter-Sprite `weapon-raygun.png` aus der Vorlage. Logik-Tests für Mündungsposition und Ausbaustufe (reine Funktionen in `src/logic/`).
5. **Sprites (optional, [Mensch] oder Coder):** Platzhalter der Astronautin und der Gegner nach `mockups/sprites.html` neu zeichnen. Dateiaustausch ohne Code.

Pakete 2 bis 4 hängen nur von Paket 1 ab und berühren verschiedene Dateien, außer `config/assets.ts`. Die gehört deshalb in Paket 1.

### UI-Pakete mit Design-Review

- Pakete 2, 3 und 4 bekommen ein Design-Review (`ma-designer`, Modus Review) zusätzlich zum normalen Review. Prüfgrundlage: Grundsätze oben, `tokens.json`, Screenshots in `docs/design/screenshots/`.
- Handtest auf dem iPhone im Querformat: Lesbarkeit von Funk 1× (Labels) und Kapsel 1× (Legende, Hinweis). Sind sie zu klein, Labels auf 2× anheben. Dafür ist im Layout Platz.

### Offene Punkte für spätere Pakete

- Boss-Lebensbalken (`runde.html` 3) ist ein Vorschlag für M3 und gehört nicht zu diesem Umbau.
- Tastatur-Navigation im Menü (Fokus-Ring ist gestaltet) ist heute keine Funktion. Kandidat für den Backlog.

## Änderungen

### 2026-10-26 · Ergänzung „Ingame-Sprites“ (freigegeben am 2026-10-26)

**Auftrag (Nutzer):** Ingame-Sprites passend zu den Astronautin-Designs (Porträt im Menü, App-Icon, Vorlage in `pixel.js`). Heute ist `astronaut.png` ein Platzhalter (lila Dreiecke), und `weapon-raygun.png` ist die 12×8-Vorlage, nur 2× vergrößert.

**Ergebnis:**

- `docs/design/assets/sprites.js` (`window.PX_SPRITES`) ist die Quelle der finalen Pixel, im Format wie `fonts.js`: reine Daten plus kleine, reine Hilfsfunktionen, ohne DOM und ohne Netz, also im leeren vm-Kontext auswertbar. Schlüssel = Asset-Key, ein Zeichen = ein Pixel, Frames liegen nebeneinander.
  - `astronaut` 32×32, 4 Frames: 0–1 Ruhe (Kopf sinkt 1 px, Visier-Glanz wandert), 2–3 Rückstoß (Kopf weicht 1 px zurück, Augen kneifen, Antenne wippt). Die rechte Hand liegt in allen Frames auf dem Handpunkt 26|25 (= +10|+9 von der Mitte). Ohrstücke, Antenne, Kragen, Gürtelschnalle und Stiefel in Koralle, Augen in Mint, Wangen in Rosa, wie im Porträt.
  - `weapon-raygun` 24×16, 6 Frames, nativ gezeichnet statt hochskaliert: Stufe 1 Kolben mit Koralle-Lampe · Stufe 2 Flosse, Spule am Lauf, Energiezelle wird mint · Stufe 3 zusätzlich längerer Emitter und Mint-Spulen. Schuss-Frame: Mündung `muzzle-flash`, Emitterringe glühen. Die Ankerpunkte bleiben unverändert: Griff 7|12, Mündung 22|7.
  - `laser` 16×4: weißer Kopf, ausfransender Schweif, Farbe per Tint.
- `mockups/sprites-ingame.html`: Spritesheets (6×), Szenen in allen drei Biomen (3× und 1×), Zielrad mit Spiegeln, Tiefe und Mündung. Die Vorschau prüft Breite, Höhe und Palette jedes Frames und zeigt Fehler oben rot an. Screenshot: `screenshots/sprites-ingame-desktop.png`.
- Neue Tokens `color.sprite.highlight`, `suit-deep`, `accent-shade`, `eyes-hi`, `eyes-shade`, `muzzle-flash`. Kontrastprüfung grün, Exporte neu gebaut.
- **Nachtrag (Nutzer: „erstelle die nicht enthaltenen auch“):** `docs/design/assets/sprites-world.js` ergänzt `PX_SPRITES` um alle übrigen Sprites, in den Größen und Frame-Zahlen aus `src/config/assets.ts`:
  - Gegner: `enemy-cursed-tree` (Baum mit Wurzelfüßen, rote Augen), `enemy-forest-witch` (Hut, grünes Gesicht, Zauberstab mit Glühen), `enemy-zombie-squirrel` 24×24 (Hüpfzyklus, Narbe, rotes Auge), `enemy-forest-spirit` (Mint-Geist mit Spross, Magenta-Augen, wogender Saum). Alle schauen nach rechts, das Spiel spiegelt sie. Umriss Nachtschwarz.
  - Bosse: `boss-root-monster` 64×64 (Stumpf mit Kronenästen, Wurzelarmen und Zähnen), `boss-root-spike` 16×32 (dornige Wurzel mit roten Adern), `boss-forest-ghost` 48×48 (Geist mit Geweih), `boss-giant-stone` 64×64 (Fels mit Kristallen und Moos; beim Rollen wandern die Oberflächenflecken). Die Varianten-Tönung im Code bleibt nutzbar.
  - Geschosse: `witch-bolt` (Magenta), `boss-ghost-orb` (hell, wird im Spiel mint getönt).
  - Items 16×16 × 2 (Frame 1 = Glanz oder Bewegung): Heilung (Mint-Kreuz), Doppelschuss (zwei Koralle-Bolzen), Schild (blau), Schnellfeuer (Blitz), Feuerring (Orange mit Flammen). Umriss Tinte, den hellen Rand fügt das Spiel hinzu.
  - Münzen: `coin-small` 8×8 und `coin-big` 16×16 (laut Code, nicht 12×12 wie im alten Styleguide), je 4 Frames Drehung, große Münze mit Stern-Prägung. **Überholt durch H-25:** Auf dem Feld `coin-field` 6×6 und `coin-big` 12×12; `coin-small` bleibt nur für Menüsymbole und den Münzzähler.
  - Kacheln je Biom: Frame 0 ist der Boden (transparent mit ruhigen Tupfen in `*-ground-hi/lo`, Kontrast ≤ 1,5:1), Frames 1–3 sind Deko (Gras, Blumen bzw. Leuchtpilze, Kiesel bzw. Kristalle). Die Farben sind je Biom fertig gesetzt.
  - `ui-icons` nativ 16×16: Ton an, Ton aus, Pause, Schloss. Linie und Füllung, im Spiel getönt.
- Vorschau `mockups/sprites-welt.html` (drei Spielszenen und alle Sheets), Screenshot `screenshots/sprites-welt-desktop.png`.

**Übergabe an den Planner:**

| Datei | Änderung |
|---|---|
| `src/config/maps.ts` | `tint` bei `forestNight` und `elfForest` entfernen, weil die Kacheln ihre Farben schon mitbringen. Sonst färbt die Tönung sie doppelt und dunkelt sie ab. |
| `scripts/build-sprites.mjs` (neu), `package.json` | Skript `sprites:build` nach dem Muster von `build-fonts.mjs`: `docs/design/assets/sprites.js` und danach `sprites-world.js` im selben leeren vm-Kontext auswerten, je Schlüssel ein PNG `public/assets/sprites/<key>.png` (Frames nebeneinander, `.` transparent, sonst deckend). Es prüft Framegröße und Framezahl gegen `src/config/assets.ts` und bricht bei Abweichung ab. |
| `scripts/generate-placeholders.mjs` | `makeRaygun` und die `RAYGUN`-Vorlage entfernen. Für Schlüssel aus `PX_SPRITES` keine Platzhalter mehr erzeugen (sonst überschreibt `assets:placeholders` die finalen Bilder). |
| `public/assets/.placeholders.json`, `scripts/check-assets.mjs`, `scripts/generate-placeholders.mjs` | Keines der 24 Sprites gilt mehr als Platzhalter, die Töne bleiben Platzhalter. Der Generator erzeugt nur noch Töne; `makeRaygun`, `makeUiIcons` und die Sprite-Zeichnung entfallen. |
| `public/assets/LICENSES.md` | alle Zeilen unter `sprites/`: „eigene Arbeit des Projekts (Pixel `docs/design/assets/sprites.js` und `sprites-world.js`, `npm run sprites:build`)“. |
| `src/entities/Player.ts`, `src/config/assets.ts` | keine Logik-Änderung. Prüfen, dass die Beschreibung von `astronaut` lautet: 0–1 Ruhe, 2–3 Rückstoß. |
| `docs/guides/grafik-austauschen.md` | Abschnitt: Sprites in `sprites.js` ändern, `npm run sprites:build`, Vorschau `mockups/sprites-ingame.html`. |

Keine neuen Abhängigkeiten. Ein Paket ohne Design-Review (keine UI), aber mit Handtest: alle drei Biome mit Boss spielen, Figur und Waffe in allen Ausbaustufen ansehen, nach links zielen, dazu Items, Münzen sowie die Ton- und Pause-Icons prüfen. Vergleich: `screenshots/sprites-ingame-desktop.png` und `screenshots/sprites-welt-desktop.png`.

### 2026-10-26 · Ergänzung H-14 (freigegeben am 2026-10-26)

**Auftrag (Plan §13 H-14, PE-70, Q-34, Q-37, AP-66, Coder-Bericht AP-20):**

1. **Power-up-Lagerplatz** für zeitbegrenzte Kräfte (heute Dauerfeuer und Feuerring, später mehr): je Art ein Fach, Stapel 1, Aktivierung nur durch Tippen oder Klick. Gesucht: HUD-Platz, Symbol, Größe, Zustände leer, bereit, gesperrt (Kraft aktiv oder Abklingzeit).
2. **Boss-Lücken aus AP-20:** Banner „BOSS KOMMT!“ (heute Funk 3×, Rahmen `hud.danger` mit Glühen, blinkt, bei 28 % Höhe), Ergebnis nach Boss-Sieg (`ergebnis.html`), Zustände der Boss-Leiste (kritisch, Treffer-Blitz, unverwundbar).

**Rahmen:** Die Ergänzung bleibt in der freigegebenen Richtung (Funkgerät in der Runde, Grundsätze 1–8). Keine drei neuen Richtungen, sondern Varianten innerhalb des Systems.

**Ist-Stand HUD (1×, 640×360):** oben links Energie (160×44) und darunter die Chip-Reihe (Gold, dann aktive Kräfte), oben Mitte Timer, oben rechts Ton und Pause, unten rechts Stick (Fangfläche ab x = 490, am PC per `STICK_ON_DESKTOP` künftig aus, AP-69), unten Mitte Boss-Leiste (x 220, top 334, 200 breit). Frei: unten links.

**Entscheidungen Lagerplatz (Nutzer, 2026-10-26):**

- 1a **Platz unten links**, zwei Fächer nebeneinander (Reihenfolge wie `STORABLE_POWERS`: Dauerfeuer, Feuerring). Linker Daumen, kein Konflikt mit Stick und Boss-Leiste.
- 2a **Eigener Funk-Knopf 40×40** (1×, skaliert mit `funkScale`) mit großem Item-Symbol, dasselbe Motiv wie das liegende Item.
- 3c **Fächer immer sichtbar, ohne „TIPP“-Label.** leer: gepunkteter Rahmen, Symbol als blasser Umriss · bereit: durchgezogener Akzentrahmen, Symbol voll · gesperrt: abgedunkelt, darüber die Sekunden der Sperre („8s“).
- 4a **Einlagern:** einmaliges Aufleuchten 200 ms plus Pickup-Ton. Mit `prefers-reduced-motion` nur der Rahmenwechsel.

**Entscheidungen Boss-Lücken (Nutzer, 2026-10-26):**

- 5a **Banner als Funkspruch:** Logbuch-Zeile „FUNK · WARNUNG“ (Funk 1×, `hud.text-muted`), „BOSS KOMMT!“ (Funk 3×, `hud.danger`), Boss-Name (Funk 1×). Blinkt dreimal, dann ruhig. Mit `prefers-reduced-motion` kein Blinken.
- 6a **Ergebnis:** Überschrift bleibt „GEWONNEN“. Siegel „BOSS BESIEGT“ mit Pixel-Stern im Logbuch-Kopf, Faktenzeile „BOSS · <NAME> · BESIEGT“. Bei Niederlage gegen den Boss: „BOSS · <NAME> · 38 % ÜBRIG“.
- 7a **Boss-Leiste:** Treffer 120 ms weiße Füllung plus Nachlaufstück in Creme (300 ms) · kritisch ≤ 25 %: Tag „SCHWACH!“, kein Blinken · unverwundbar: Rahmen gepunktet, Füllung gedimmt, Tag „IMMUN“ mit Schloss.

**Ergebnis:** `mockups/lagerplatz-und-boss.html` (Ansichten 1–7), Screenshot `screenshots/lagerplatz-und-boss-desktop.png`. Neue Tokens: `color.hud.flash`, `color.hud.trail`, `color.hud.danger-dim`, `size.hud-slot` (40), `size.hud-slot-gap` (8), `size.hud-slot-icon-scale` (3), `motion.duration.hit` (120 ms), `.store-flash` (200 ms), `.trail` (300 ms), `motion.banner-blinks` (3), `opacity.dim` (0,35), `opacity.ghost` (0,6). Kontrastprüfung grün, Exporte neu gebaut. Keine neuen Schriften, Sprites oder Abhängigkeiten: Die Fächer nutzen die Item-Symbole `rapid` und `ring`, das Schloss und der Stern sind vorhanden (`ui-icons`, `pixel.js`).

**Übergabe H-14 an den Planner:**

| Datei | Änderung | Mockup |
|---|---|---|
| `src/config/theme.ts` | aus `export/tokens.resolved.json` neu erzeugen (neue Tokens oben) | – |
| `src/scenes/hud/PowerSlots.ts` (neu, AP-66), `hudMath.ts` | Fächer 40×40 · `funkScale`, links 8, unten 8, Abstand 8, Reihenfolge `STORABLE_POWERS`. Rahmen 1 px. **leer:** gepunktet `hud.line`, Symbol nur Umriss in `hud.line`, Alpha `opacity.ghost`, nicht klickbar. **bereit:** Rahmen `hud.accent` mit Glühen `hud.glow`, Symbol voll (Dauerfeuer Füllung `hud.accent`, Feuerring `game.fire-ring`). **gesperrt:** Rahmen `hud.line-dim`, Symbol Alpha `opacity.dim`, darüber Restsekunden Funk 2× `hud.text` mit 1-px-Schatten `hud.screen` (Kraft aktiv: Restlaufzeit, Abklingzeit: Restsekunden). **eingelagert:** Fläche `hud.flash` für `store-flash`, dann bereit; bei `prefers-reduced-motion` ohne Fläche. **Maus darüber:** Akzentrahmen, Fläche Akzent 18 %. **gedrückt:** Fläche `hud.accent` für `duration.fast`. Die Fächer enden bei x = 96 (1×), liegen also weit weg von der Fangfläche des Sticks (ab x = 490) und berühren die Boss-Leiste (ab x = 220) nicht. | Ansichten 1–4 |
| `src/scenes/HudScene.ts` (Banner) | Funkspruch: Zeile „FUNK · WARNUNG“ Funk 1× `hud.text-muted`, „BOSS KOMMT!“ Funk 3× `hud.danger`, gepunktete Trennlinie, Boss-Name Funk 1× `hud.text`. Rahmen `hud.danger` mit Glühen. Blinkt `banner-blinks` × `duration.blink`, danach ruhig bis zum Erscheinen; mit `prefers-reduced-motion` gar nicht. Name aus dem Ereignis `boss-warning` (fehlt er dort, meldet der Coder die Lücke). | Ansichten 2, 5 |
| `src/scenes/HudScene.ts` (Boss-Leiste) | **Treffer:** Füllung `game.hit-flash` für `duration.hit`, das verlorene Stück bleibt in `hud.trail` und verschwindet nach `duration.trail`. **kritisch** (≤ 25 %): Tag „SCHWACH!“ in `hud.accent` statt „BOSS“, kein Blinken. **unverwundbar** (`boss.isInvulnerable`): Rahmen gepunktet, Füllung `hud.danger-dim`, Tag Schloss + „IMMUN“ in `hud.text-muted`. Ohne Bewegung (`prefers-reduced-motion`) entfällt der weiße Blitz, das Nachlaufstück bleibt. | Ansichten 3, 5 |
| `src/scenes/ResultScene.ts` | Bei Boss-Level: Faktenzeile „BOSS“ als erste Zeile. Sieg: Stern (`hud.gold`) + „<NAME> · BESIEGT“ Funk 2× `hud.accent`, dazu Siegel „BOSS BESIEGT“ (Stern + Funk 1× `hud.accent`, Rahmen `hud.accent`) mittig im Logbuch-Kopf. Niederlage: „<NAME> · <n> % ÜBRIG“ Funk 2× `hud.danger`, Prozent aufgerundet aus Boss-HP. Untertitel Sieg optional je Boss (z. B. „DER RIESEN-STEIN IST ZERFALLEN.“). Zeilenabstand der Faktenliste 8. | Ansichten 6, 7 |

**Paketierung (Vorschlag):** Lagerplatz in AP-66 (Pflichtlektüre: Ansichten 1–4). Die Boss-Lücken betreffen `HudScene.ts` und `ResultScene.ts` und kollidieren deshalb mit AP-66 bei `HudScene.ts`. Entweder in AP-66 mitnehmen oder als eigenes Paket danach. Beide mit Design-Review.

### 2026-10-28 · Ergänzung H-23 „HUD am Handy“ (freigegeben am 2026-10-28)

**Auftrag (Nutzer, H-23, PE-103):** Der Brief regelte das HUD nur bei k = 1. Gesucht: Größen bei k über 1, Verhalten bei Arena-Breite 640 bis 800, Slot-Rand (8) gegen Panel-Rand (round(8k) = 11). Dazu V-16 (Laser), V-18 (Item-Symbole im Lagerplatz), Token `game.aura`, Q-45 und der Niederlage-Text.

**Entscheidungen:**

- **Q-45 (Nutzer, 2026-10-28):** `HOVER_FILL_ALPHA` und `BLINK_ALPHA` werden Tokens: `opacity.hover` (0,18) und `opacity.blink` (0,55).
- **Niederlage-Text (Nutzer, 2026-10-28):** Rechts im Logbuch-Kopf steht bei jeder Niederlage nur ein Wort, mit oder ohne Boss. Das ersetzt „5:00 · BOSS NICHT BESIEGT“. **Geändert in H-25 (Q-54):** Das Wort lautet „NIEDERLAGE“, nicht „BESIEGT“.
- **HUD-Rand (Designer):** Alle HUD-Elemente halten denselben Außenrand `m = round(8·k)`. Das gilt auch für den Lagerplatz, das Fach selbst bleibt 40 (PE-94). Ein Rand für alle Elemente lässt Lagerplatz, Energie und Chips auf derselben linken Kante stehen. Damit ist der Befund „Slot-Rand 8 gegen Panel-Rand 11“ erledigt.
- **V-18 (Designer):** Die Item-Symbole sind mehrfarbig. Deshalb werden sie **nie multiplikativ getönt** (`setTint`). Sie zeigen entweder ihre eigenen Farben (`clearTint`) oder eine flache Silhouette (`setTintFill`). Die H-14-Vorgabe „Dauerfeuer Füllung `hud.accent`, Feuerring `game.fire-ring`“ entfällt, weil das Sprite seine Farben selbst mitbringt.
- **V-16 (Designer):** Der Laser wird multiplikativ getönt (`setTint` statt `setTintFill`). So bleibt der Verlauf erhalten, vom hellen Kopf (`#ff8fae`) bis zum dunkleren, ausfransenden Schweif (etwa `#b86186`). Der Kopf trägt den Kontrast (Paare `game.laser-raygun` grün), der Schweif ist Dekor. Auch das Mockup `sprites-welt.html` multipliziert jetzt.
- **`game.aura` (Designer):** Mint `{color.mint.400}` `#5fe0c0` statt `0x9b59b6`, das auf Elfenwald nur 2,6:1 erreichte. Jetzt sind es 4,7:1 (Wald), 10,4:1 (Nacht) und 7,5:1 (Elfenwald). Mint ist die Farbe des Waldgeists selbst. Gezeichnet werden eine Fläche mit `opacity.aura` (0,25) und ein 1-px-Ring in voller Deckkraft. So ist die Gefahrenzone auch über ihre Form erkennbar und nicht nur über die Farbe.

**Tabelle „HUD am Handy“** (Arena-Einheiten; k = `hudScale`, begrenzt auf `MAX_K` = 1,4; typisches iPhone im Querformat k ≈ 1,36; Zahlen nach den Formeln im Code):

| Element | Regel | k = 1 (PC) | k ≈ 1,36 | k = 1,4 | Anker bei Breite 640–800 |
|---|---|---|---|---|---|
| HUD-Rand `m` | `round(8·k)` (`space.2`), gilt für **alle** Ränder | 8 | 11 | 11 | – |
| Energie-Panel | Zahl Funk 3× fest (PE-94) · Label `funkScale(1,k)` · Innenabstand `round(8k)` · Segmente `round(8k)`×`round(6k)`, Lücke `max(2, round(2k))` | Label 1×, Seg. 8×6, Lücke 2, Höhe 40 | Label 2×, Seg. 11×8, Lücke 3, Höhe 46 | wie 1,36 | links oben (m, m) |
| Timer | Zahl Funk 3× fest · Innenabstand `round(8k)` | Höhe 40 | Höhe 46 | Höhe 46 | Mitte oben (`width/2`) |
| Pause, Ton | Kante `round(32k)` · **Abstand dazwischen `m`** (heute fest 8) | 32, Abstand 8 | 44, Abstand 11 | 45, Abstand 11 | rechts oben, rechte Kante `width − m` |
| Chips (übrige Kräfte: Dauerfeuer, Feuerring) | unverändert (PE-104): Höhe `round(24k)`, Text `funkScale(2,k)`, Innenabstand `round(6k)`, Symbol–Text `round(4k)` | 24 · 2× · 6 · 4 | 33 · 3× · 8 · 5 | 34 · 3× · 8 · 6 | links, unter dem Energie-Panel |
| Kleine Chips (Münzzähler, Doppelschuss, Schild; **H-25**, ersetzt „bleiben wie heute“) | `chipMetrics(k, 0,85)`: Kasten `round(24·k·0,85)`, Text **2× fest**, Innenabstand `round(6·k·0,85)`, Symbol–Text `round(4·k·0,85)`, Symbolspalte `round(16·k·0,85)`; Münzsymbol **16 px fest** (`coin-small` ×2) | Kasten 20 · 2× · 5 · 3 · Symbol 14 | 28 · 2× · 7 · 5 · 18 | 29 · 2× · 7 · 5 · 19 | wie oben, **oben ausgerichtet** |
| Chip-Reihe | Abstand zwischen Chips `round(4k)`, alle Chips mit der **Oberkante** auf derselben Linie (`rowY`) | 4 | 5 | 6 | links, `rowY = m + Panelhöhe + round(4k)` |
| Lagerplatz | Fach 40 fest, Abstand 8 fest, Symbol 2× (`slotIconScale`), Sekunden Funk 2× fest · **Rand links und unten `m`** (heute 8) | x 8–96 | x 11–99 | x 11–99 | links unten |
| Boss-Leiste | `round(200k)` × `round(8k)`, Rand unten `m`, Name/Tag `funkScale(1,k)` | 200×8 | 272×11 | 280×11 | Mitte unten |
| Banner „BOSS KOMMT!“, Pause-Titel | `funkScale(3,k)` bleibt (PE-105) | 3× | 4× | 4× | Mitte, Banner-Oberkante 92/360 der Höhe |
| Stick | unverändert (Fangfläche 126) | – | – | – | rechts unten (an `width`) |
| Pause-Overlay, Scrims | ganze Arena | – | – | – | volle Breite `width` |

**Verhalten bei Arena-Breite 640–800:** Nichts im HUD wird breiter oder gestreckt. Jedes Element hängt an seinem Anker: links an `m`, rechts an `width − m`, Mitte an `width/2`. Die zusätzliche Breite bleibt freies Spielfeld zwischen den Ecken. Die Höhe ist immer 360. Sicherheitsbereiche (Notch, Home-Balken) sind schon durch `fitArena` aus der Arena genommen, das HUD braucht deshalb keinen eigenen Inset. Die engste Stelle ist Breite 640 bei k = 1,4. Oben liegt das Energie-Panel etwa bei x 11–235, der Timer etwa bei 264–376 und die Buttons ab etwa 529. Unten liegen der Lagerplatz bis x 99, die Boss-Leiste bei 180–460 und die Stick-Fangfläche ab etwa 490. Die genauen Breiten (`measureFunk`) prüft ein Test für die Breiten 640, 734 und 800 bei k = 1, 1,36 und 1,4: Kein Rechteck überlappt ein anderes (`rectsOverlap`), alle liegen in der Arena (`rectInArena`).

**Lagerplatz-Zustände mit mehrfarbigen Symbolen (ersetzt in der H-14-Zeile `PowerSlots.ts` die Symbol-Regeln):**

| Zustand | Rahmen (unverändert) | Symbol |
|---|---|---|
| leer | gepunktet `hud.line` | `setTintFill(hud.line)`, Alpha `opacity.ghost`: flache Silhouette |
| bereit | `hud.accent` mit Glühen | `clearTint()`, Alpha 1: eigene Farben |
| gesperrt | `hud.line-dim`, Sekunden darüber | `clearTint()`, Alpha `opacity.dim` |
| Maus darüber | Akzent, Fläche `hud.accent` mit `opacity.hover` | wie bereit |
| gedrückt | Fläche `hud.accent` | `setTintFill(hud.screen)`: dunkle Silhouette |

Ein Chip mit lädendem Feuerring (`ArmourIndicator`) zeigt wie ein leeres Fach eine Silhouette in `hud.line` (`setTintFill`), der aktive Feuerring seine eigenen Farben.

**Ergebnis:** Neue Tokens `color.game.aura`, `opacity.hover`, `opacity.blink`, `opacity.aura` mit drei Kontrastpaaren (Aura auf den drei Böden). Die Beschreibungen von `size.hud-slot` und `size.hud-slot-icon-scale` sind aktualisiert. `contrast.js --tokens` ist grün, die Exporte sind neu gebaut (css, ts, json). Mockups: `lagerplatz-und-boss.html` zeigt die echten Item-Sprites in den Fächern (Ansichten 1–4) und den Niederlage-Text in Ansicht 7, `ergebnis.html` Ansicht 2 den Niederlage-Text (seit H-25 „NIEDERLAGE“), `sprites-welt.html` den multiplikativ getönten Laser. Screenshot: `screenshots/lagerplatz-und-boss-desktop.png`. Ein eigenes Mockup bei k = 1,36 gibt es nicht. Prüfgrundlage für AP-86 ist die Tabelle oben.

**Übergabe H-23 an den Planner:**

| Datei | Änderung |
|---|---|
| Theme-Sync (Lead, PE-98) | `npm run theme:build` nach dem Designer-Commit am Export. Neu in `src/config/theme.ts`: `color game.aura`, `OPACITY.hover`, `OPACITY.blink`, `OPACITY.aura`. |
| `src/scenes/HudScene.ts` | `BLINK_ALPHA` entfällt, stattdessen `OPACITY.blink`. Abstand Ton- zu Pause-Button `m` statt fest 8. Rest nach der Tabelle „HUD am Handy“. |
| `src/scenes/hud/PowerSlots.ts`, `hudMath.ts` | `HOVER_FILL_ALPHA` entfällt, stattdessen `OPACITY.hover`. Rand von `powerSlotRects` ist `round(8·k)`, Fach und Abstand bleiben 40 und 8 (z. B. Rand getrennt von Größe übergeben). Symbol-Zustände nach der Tabelle oben (V-18). |
| `src/scenes/hud/FunkPanel.ts` (`FunkChip.setIconTint`), `ArmourIndicator.ts` | Icon-Tönung als `setTintFill` statt `setTint` (Silhouette für „lädt“). |
| `tests/scenes/hud.test.ts` | Layout-Test: Breiten 640, 734, 800 × k 1, 1,36, 1,4, keine Überlappung, alles in der Arena, linke Kante von Lagerplatz, Energie und Chips gleich (`m`). |
| `src/scenes/ResultScene.ts` | Bei Niederlage rechts im Logbuch-Kopf „NIEDERLAGE“ (H-25; ursprünglich „BESIEGT“) (Funk `this.lab`, `hud.text-muted`), an derselben Stelle wie „m:ss ÜBERLEBT“ beim Sieg. Gilt für jede Niederlage. Die Boss-Zeile „<NAME> · n % ÜBRIG“ bleibt. |
| `src/entities/Laser.ts` | `setTint` statt `setTintFill` (V-16). |
| `src/entities/enemies/Enemy.ts` | Aura: Farbe `game.aura`, Füllung `OPACITY.aura`, dazu 1-px-Ring `game.aura` in voller Deckkraft (`setStrokeStyle(1, …, 1)`). `0x9b59b6` und das `eslint-disable` entfallen. |

**Paketierung (Vorschlag):** Zuerst das Theme-Sync-Paket. Danach AP-86 (HUD: `HudScene`, `hud/**`, Test) mit Design-Review. Für ResultScene, Laser und Aura ein kleines Paket mit Design-Review; es teilt keine Datei mit AP-86 und kann parallel laufen. Keine neuen Abhängigkeiten, keine neuen Sprites oder Schriften. Handtest in H-24: leeres und gesperrtes Fach, Laser in allen drei Biomen, Waldgeist-Aura auf Elfenwald, Niederlage-Ergebnis.

### 2026-10-28 · Ergänzung H-25 „Münzen 12 px, kleine Chips, NIEDERLAGE“ (Status: geändert, wartet auf Übernahme)

**Auftrag (Nutzer, Handtest-Antworten Q-50, Q-53, Q-54, PE-113, PE-119):** (1) Münzen auf dem Feld 12×12 statt 16×16, Münzen im Menü und das Symbol im Münzzähler bleiben 16 px. (2) Münzzähler, Doppelschuss- und Schild-Chip 15 % kleiner, Maße in die HUD-Tabelle, Ausrichtung gemischt hoher Chips festlegen. (3) Niederlage-Text „NIEDERLAGE“ statt „BESIEGT“.

**Münzen:**

| Verwendung | Schlüssel | Pixel | Skalierung | Anzeige | Frames |
|---|---|---|---|---|---|
| Feld, normale Münze (Wert < `BIG_COIN_MIN_VALUE`) | `coin-field` (**neu**) | 6×6 | 2 | 12×12 | 4: Vorderseite, Dreiviertel, Kante, Dreiviertel gespiegelt |
| Feld, große Münze (Wert ≥ 4) | `coin-big` (**geändert**, vorher 16×16) | 12×12 | 1 | 12×12 | 4, Stern-Prägung auf Frame 0 bleibt |
| Menü, Upgrade-Panel, Ergebnis, **Münzzähler im HUD** | `coin-small` (unverändert) | 8×8 | 2 | 16×16 | 4 |

- Die Feldmünze ist rund gezeichnet (Zeilen 2-2-4-4-2-2 statt Kasten mit gekappten Ecken), sonst wirkt sie bei 6 px wie ein Kästchen. Die große Münze unterscheidet sich weiter über Stern und Fläche, nicht über die Größe. Beide behalten die 2-px-Kontur `game.hit-flash` (`COIN_VISUAL.outlinePx`).
- Pixel: `docs/design/assets/sprites-world.js` (`coin-field`, `coinBig`). Vorschau `mockups/sprites-welt.html` (Szenen nutzen `coin-field` ×2 und `coin-big` ×1), Screenshot `screenshots/sprites-welt-desktop.png`.
- Das weicht von Q-50 in einem Punkt ab: Laut Nutzer (H-25) bleibt das **Münzsymbol im Münzzähler 16 px**, nur der Kasten schrumpft. `CoinCounter.ts` behält `coin-small`.

**Kleine Chips:** Maße stehen in der Tabelle „HUD am Handy“ (H-23, Zeile „Kleine Chips“) und entsprechen `chipMetrics(k, 0,85)` aus AP-86: Kasten 20 / 28 / 29 bei k = 1 / 1,36 / 1,4, Text 2× fest, Innenabstand 5 / 7 / 7, Symbol–Text 3 / 5 / 5. Das 16-px-Münzsymbol passt bei k = 1 mit 2 px Luft oben und unten in den 20-px-Kasten.

**Ausrichtung (Designer):** Gemischt hohe Chips stehen **oben ausgerichtet**, alle Oberkanten auf `rowY`. Begründung: Der Abstand zum Energie-Panel bleibt für jeden Chip gleich (`round(4k)`), die Reihe hängt wie ein Etikettenstreifen unter dem Panel, und es entstehen keine halben Pixel (20 gegen 24 wäre mittig 2 px, 28 gegen 33 aber 2,5 px). Innerhalb eines Chips bleiben Symbol und Text senkrecht mittig. Das entspricht dem heutigen Code (`relayoutChips` setzt alle auf `rowY`), deshalb ist keine Änderung nötig.

**Niederlage-Text:** „NIEDERLAGE“ rechts im Logbuch-Kopf bei jeder Niederlage (Funk `this.lab`, `hud.text-muted`). Mockups `ergebnis.html` Ansicht 2 und `lagerplatz-und-boss.html` Ansicht 7 sind angepasst, Screenshots `screenshots/ergebnis-desktop.png` und `screenshots/lagerplatz-und-boss-desktop.png`. AP-94 hat das schon umgesetzt.

**Übergabe H-25 an den Planner:**

| Datei | Änderung |
|---|---|
| `npm run sprites:build` → `public/assets/sprites/coin-field.png` (neu), `coin-big.png` (12×12×4) | aus `docs/design/assets/sprites-world.js`; `coin-small.png` bleibt byte-gleich |
| `src/config/assets.ts` | neu `sprite('coin-field', 6, 6, 4, …)`, `coin-big` auf 12×12×4, `coin-small` unverändert |
| `src/config/coins.ts` (`COIN_VISUAL`) | `smallDisplayScale` 2 (für `coin-field`), `bigDisplayScale` 1, Kommentar: beide Feldmünzen 12 px (ersetzt Q-46); Kontur 2 bleibt |
| `src/entities/Coin.ts` | kleine Feldmünze `coin-field` statt `coin-small`; Körper aus der neuen Größe. Einsammeln bleibt `collectRadiusPx` 12 |
| `src/scenes/hud/CoinCounter.ts` | **keine Änderung** (bleibt `coin-small`, `scale: 2`, `fixedScale`) |
| `src/scenes/hud/hudMath.ts`, `HudScene.ts` | keine Änderung; die Tabelle beschreibt den Stand nach AP-86. Ausrichtung oben ist bestätigt |
| `public/assets/LICENSES.md`, `docs/guides/grafik-austauschen.md`, Tests zu Manifest und Münzen | neue Zeile `coin-field`, Größe `coin-big` |

Keine neuen Tokens, Schriften oder Abhängigkeiten. AP-92 mit Design-Review: Vergleich mit `screenshots/sprites-welt-desktop.png`, im Handtest die Münzen im Gedränge prüfen (beide Größen unterscheidbar).

- keine weiteren (erste Fassung vom 2026-10-25)
