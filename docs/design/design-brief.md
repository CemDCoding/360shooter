# Design-Brief – 360shooter

**Status:** entwurf
**Stand:** Schritt 3: drei Richtungen liegen vor (`mockups/richtung-a|b|c.html`, Screenshots in `screenshots/`). Wartet auf die Wahl des Nutzers.

## Ausgangslage

- **Produkt:** Rundenbasierter 360°-Survival-Shooter im Pixel-Stil. Eine süße Astronautin steht in der Bildschirmmitte auf einem fremden Planeten und überlebt Monsterwellen (Wald 0–4, Wald bei Nacht 5–9, Elfenwald 10–20).
- **Zielgruppe:** Gelegenheitsspieler auf Handy und PC, im ersten Stich nur der Nutzer selbst.
- **Plattform:** Phaser 3 + TypeScript, feste Spielfläche 640×360 logische px, `pixelArt: true`, skaliert mit FIT. PC (Maus) und iPhone (PWA, Querformat, Touch, virtueller Stick).
- **Styling:** kein CSS-Framework. Farben und Schriften sind hart codiert in TS (rund 120 Stellen in 21 Dateien, v. a. `src/scenes/**`, `src/config/maps.ts`). Systemschrift ohne bewusste Wahl.
- **Bestand:** Alle 30 Sprites sind Platzhalter (`public/assets/.placeholders.json`). Bleibt: Biom-Stimmung (Wald grün, Nacht blau mit Glühwürmchen, Elfenwald violett mit Sporen), Gold als Münzfarbe, dunkler Grund. Wird ersetzt: alle UI-Farben, Button-Look, Schrift.
- **Screens:** Hauptmenü (`MenuScene`, `LevelGrid`, `UpgradePanel`, `ConfirmDialog`, `Button`), HUD (`HudScene`, `PowerIndicators`, `CoinCounter`, `ArmourIndicator`, `VirtualStick`), Ergebnis (`ResultScene`), Hochformat-Hinweis.
- **Recht:** nicht veröffentlicht, deshalb kein Impressum nötig. Keine externen Requests, Schriften nur lokal.

## Umfang des Designs

- 2026-10-25 Nutzer (1a): UI-System (Farben, Pixelschrift, Buttons, Panels, HUD, Menü, Ergebnis) **plus** verbindlicher Sprite-Styleguide (Palette je Biom, Umrissregeln, Größen, Silhouetten für Astronautin, Gegner, Items als Pixel-Mockups).

## Wirkung

- **Drei Adjektive:** niedlich, mutig, geheimnisvoll (2a)
- **Auf keinen Fall:** düster-brutal, Handy-Casino-bunt
- **Vorbild:** Metroid als Haltung (3a): dunkle fremde Welt, kräftige Leuchtakzente, kantige Sci-Fi-Rahmen um HUD und Menüs wie ein Anzugvisier. Die Astronautin bleibt rund und süß. Der Kontrast aus kantigem Visier und runder Figur ist das Erkennungsmerkmal.
- **Weitere Vorbilder (7a):** Zelda (Pixel-Abenteuer mit Charme), Celeste (süße Pixel-Figur in stimmungsvoller Welt), Vampire Survivors nur fürs Spielprinzip.
- **Abgrenzung:** kein wuseliger, überladener Survivor-Look mit Zahlenregen und grellen Effekten.
- **Lesbarkeit (5b):** größeres HUD zugunsten der Lesbarkeit auf dem iPhone, auch wenn es mehr Spielfläche verdeckt. Zustände nie nur über Farbe (Icon + Zahl).
- **Dichte und Ton (8a):** Menü ruhig und luftig wie ein Raumschiff-Terminal, HUD kompakt und sachlich, verspielt nur Astronautin, Münzen und Treffer (kurze Animationen, abschaltbar bei reduzierter Bewegung). **Arcade-Retro-Anteil bleibt** erhalten.
- **Lebenspunkte (9a):** Metroid-Stil: große Pixelzahl „ENERGIE 87“ + Segmentbalken (10 Segmente). Zelda prägt Menü, Münzen und Items.
- **Level-Auswahl (10b):** bleibt ein Raster, kein Umbau zur Weltkarte. Gestaltung: gruppiert nach Biom.
- **UI und Biom (11a):** Das Visier-UI ist in allen Biomen gleich (Anker der Figur). Biom-Farben nur in der Welt und als Akzent auf dem Ergebnis-Screen.
- **Bleibt aus dem Bestand:** das Spielerporträt (animierte Astronautin) neben dem Spielerlevel im Startmenü, ausdrücklicher Wunsch des Nutzers.
- **Logo und Icons (6a):** Pixel-Schriftzug „360shooter“ als Logo (Name bleibt, angenommen) und neue App-Icons (Helm mit Visier-Rahmen) als SVG-Vorlage.

## Gewählte Richtung

{{offen, Wahl des Nutzers}}

Vorgelegt am 2026-10-25:

- **A „Visier“:** Die UI ist das Innere des Helms: Türkis #36d6c3 auf Helmschwarz, Zielklammern an allen Ecken, Silkscreen.
- **B „Sternenkassette“:** wie ein Kassetten-Etikett: Koralle #ff6b8a, Minze, Pflaume, Fase mit hartem Pixelschatten, Biom-Aufkleber, Press Start 2P.
- **C „Funklogbuch“:** Phosphor-Display, fast einfarbig #a8d86b, Logbuchnummern, gepunktete Linien, Pixelify Sans.

Hinweis: Die Mockups zeichnen Schrift und Sprites mit `assets/pixel.js`, einem 5×7-Platzhalter für die gewählte Pixelschrift. Die Sprites dort sind Entwürfe für den Sprite-Styleguide.

## Grundsätze

{{offen}}

## Schriften und Assets

| Schrift/Asset | Nutzung | Lizenz | Quelle/Paket |
|---|---|---|---|
| Silkscreen (Kandidat A) | Titel, Zahlen | OFL-1.1 (fontsource.org/fonts/silkscreen) | `@fontsource/silkscreen` |
| Press Start 2P (Kandidat B) | Titel, Zahlen | OFL-1.1 (fontlibrary.org/font/press-start-2p) | `@fontsource/press-start-2p` |
| Pixelify Sans (Kandidat C) | Titel, Zahlen | OFL-1.1 (fontsource.org/fonts/pixelify-sans), variabel 400–700 | `@fontsource-variable/pixelify-sans` |
| Atkinson Hyperlegible Next | Hinweise, kleiner Text | OFL-1.1 (fontsource.org/fonts/atkinson-hyperlegible-next), variabel 200–800 | `@fontsource-variable/atkinson-hyperlegible-next` |

## Entscheidungen

- 2026-10-25 Nutzer: 1a Umfang UI + Sprite-Styleguide · 2a niedlich, mutig, geheimnisvoll · 3a Metroid als Haltung, Visier-Rahmen gegen süße Figur · 4a Pixelschrift für Titel und Zahlen, lesbare Schrift für Fließtext
- 2026-10-25 Nutzer: 5b größeres HUD · 6a Logo-Schriftzug und App-Icons · 7a + Zelda · 8a ruhiges Menü, kompaktes HUD, Arcade-Retro-Anteil behalten, Spielerporträt im Startmenü behalten
- 2026-10-25 Nutzer: 9a HP als Energiezahl + Segmentbalken · 10b Level-Raster bleibt · 11a Visier-UI unabhängig vom Biom

## Übergabe an den Planner

{{offen, Schritt 5}}

## Änderungen

- keine
