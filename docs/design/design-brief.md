# Design-Brief – 360shooter

**Status:** freigegeben am 2026-10-25
**Stand:** Freigegeben. Nächster Schritt: Lead beauftragt den Planner mit „Design übernehmen“ (Übergabe unten).

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

- keine (erste Fassung)
