# 360shooter

2D-Pixel-Art-Shooter im Browser (Phaser 3, TypeScript, Vite). Eine Astronautin dreht sich zum Zeiger und schießt auf Waldgegner.

## Voraussetzungen

- Node 24 und npm

## Befehle

| Befehl                        | Wirkung                                     |
| ----------------------------- | ------------------------------------------- |
| `npm install`                 | Abhängigkeiten installieren                 |
| `npm run dev`                 | Entwicklungsserver (Browser)                |
| `npm run build`               | Typprüfung und Produktions-Build            |
| `npm run preview`             | Build lokal ansehen                         |
| `npm test`                    | Vitest                                      |
| `npm run lint`                | ESLint                                      |
| `npm run typecheck`           | `tsc --noEmit`                              |
| `npm run format`              | Prettier                                    |
| `npm run preview:lan`         | Build und Vorschau im WLAN (für das iPhone) |
| `npm run icons`               | Platzhalter-Icons neu erzeugen              |
| `npm run assets:check`        | Prüft Sprites in `public/assets/`           |
| `npm run assets:placeholders` | Erzeugt Platzhalter-Grafiken                |

## Am PC spielen

1. Im Projektordner ein Terminal öffnen und `npm install` eintippen (nur beim ersten Mal).
2. `npm run dev` eintippen. Das Terminal zeigt eine Adresse wie `http://localhost:5173/`.
3. Diese Adresse im Browser öffnen. Gezielt wird mit der Maus, geschossen mit der Maustaste.

## Auf dem iPhone spielen

Das Spiel läuft als Homescreen-App im Vollbild. Der PC dient als Server im eigenen WLAN.

1. PC und iPhone müssen im **gleichen WLAN** sein.
2. Am PC im Projektordner `npm run preview:lan` eintippen. Das baut das Spiel und startet den Server.
3. Im Terminal steht unter `Network:` eine Adresse wie `http://192.168.0.23:4173/`. Das ist die IP des PCs.
4. Fragt die Windows-Firewall beim ersten Start nach, auf **Zulassen** klicken (nur für private Netzwerke).
5. Auf dem iPhone **Safari** öffnen und die Adresse aus Schritt 3 eintippen.
6. In Safari auf **Teilen** tippen, dann **Zum Home-Bildschirm** und **Hinzufügen**.
7. Das Spiel ab jetzt über das neue Symbol auf dem Home-Bildschirm starten. Es läuft ohne Safari-Leisten im Querformat. Im Hochformat erscheint „Bitte drehen“.

Hinweis: Der Server darf **nur im Heimnetz** laufen. Keine Portweiterleitung im Router einrichten und das Spiel nicht öffentlich ins Internet stellen. Ändert sich die IP des PCs, muss die Adresse neu eingegeben werden. Der Server muss am PC laufen, solange gespielt wird. Einen Service Worker gibt es bewusst nicht (iOS erlaubt ihn über `http://` im WLAN nicht), das Spiel läuft also nicht offline.

### Icons

`public/icons/` enthält Platzhalter-Icons (180, 192, 512 Pixel). `npm run icons` erzeugt sie neu. Der Designer kann sie durch eigene PNGs mit gleichem Namen und gleicher Größe ersetzen. Auf dem iPhone das Symbol danach vom Home-Bildschirm löschen und neu hinzufügen.

## Debug-Parameter

An die Adresse anhängen, z. B. `http://localhost:5173/?level=5`:

- `?level=0` bis `?level=20`: startet direkt dieses Level (ungültig ergibt Level 0)
- `?fps=1`: zeigt die FPS-Anzeige
- `?assets=1`: zeigt alle Sprites mit Animation

## Grafik und Sound austauschen

- Grafiken: [docs/guides/grafik-austauschen.md](docs/guides/grafik-austauschen.md)
- Sounds: [docs/guides/sound-austauschen.md](docs/guides/sound-austauschen.md)
- `npm run assets:check` prüft, ob alle erwarteten Sprites vorhanden und gültig sind.
- `npm run assets:placeholders` erzeugt die Platzhalter-Grafiken neu (überschreibt eigene Dateien, vorher sichern).

## Design

Gestaltung, Grunds�tze und Mockups stehen in `docs/design/` (Einstieg: `docs/design/design-brief.md`).

- `npm run theme:build` erzeugt aus den Design-Tokens die Theme-Datei `src/config/theme.ts`.
- `npm run fonts:build` bereitet die Schriften auf.
- Regel "nur Tokens": In `src/scenes/**` und `src/entities/**` sind keine Farb-Literale (`0x�`, `#�`) und keine Systemschrift erlaubt. ESLint (`npm run lint`) erzwingt das. Farben und Schriften kommen aus `src/config/theme.ts`.

## Ordnerstruktur

- `src/contracts/` gemeinsame Typen und Event-Namen (ohne Phaser)
- `src/config/` datengetriebene Inhalte (Level, Gegner, Items, Waffe)
- `src/logic/` reine Spiellogik ohne Phaser, mit Vitest getestet
- `src/entities/` Phaser-Objekte (Astronautin, Gegner, Projektile, Items)
- `src/scenes/` Boot, Preload, Menu, Game, Hud, Result
- `src/platform/` Zeiger-Eingabe (Maus/Touch) und Speicher (`localStorage`)
- `public/` Sprites, Manifest, Icons
- `tests/` Vitest-Tests (`tests/**/*.test.ts`)

## Regel

Spielwerte (HP, Geschwindigkeit, Drop-Chancen, Drehgeschwindigkeit usw.) stehen nur in `src/config`, nie verstreut im Code.

© Cem Dogan. Alle Rechte vorbehalten. Code, Grafiken und Sounds dürfen ohne Erlaubnis nicht verwendet werden.
