# 360shooter

2D-Pixel-Art-Shooter im Browser (Phaser 3, TypeScript, Vite). Eine Astronautin dreht sich zum Zeiger und schießt auf Waldgegner.

## Voraussetzungen

- Node 24 und npm

## Befehle

| Befehl              | Wirkung                          |
| ------------------- | -------------------------------- |
| `npm install`       | Abhängigkeiten installieren      |
| `npm run dev`       | Entwicklungsserver (Browser)     |
| `npm run build`     | Typprüfung und Produktions-Build |
| `npm run preview`   | Build lokal ansehen              |
| `npm test`          | Vitest                           |
| `npm run lint`      | ESLint                           |
| `npm run typecheck` | `tsc --noEmit`                   |
| `npm run format`    | Prettier                         |

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
