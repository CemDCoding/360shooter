# Design-Brief – 360shooter

**Status:** entwurf
**Stand:** Interview Runde 1 beantwortet (Umfang, Wirkung, Metroid-Bezug, Schrift). Nächste Runde: Nutzungssituation, Bestand, Vorbilder, Dichte und Ton.

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
- **Abgrenzung:** {{offen}}

## Gewählte Richtung

{{offen, Schritt 3}}

## Grundsätze

{{offen}}

## Schriften und Assets

| Schrift/Asset | Nutzung | Lizenz | Quelle/Paket |
|---|---|---|---|
| Pixelschrift {{Wahl offen}} | Titel, Zahlen (Timer, Gold, HP) | OFL | lokal |
| Lesbare Textschrift {{Wahl offen}} | Beschreibungen, kleiner Text | OFL | lokal |

## Entscheidungen

- 2026-10-25 Nutzer: 1a Umfang UI + Sprite-Styleguide · 2a niedlich, mutig, geheimnisvoll · 3a Metroid als Haltung, Visier-Rahmen gegen süße Figur · 4a Pixelschrift für Titel und Zahlen, lesbare Schrift für Fließtext

## Übergabe an den Planner

{{offen, Schritt 5}}

## Änderungen

- keine
