# Balancing: Schwierigkeit einstellen

Alle Spielwerte stehen als Zahlen in `src/config/`. Du aenderst nur diese Zahlen, nie die Logik.
Nach jeder Aenderung `npm test` laufen lassen: `tests/logic/balance.test.ts` meldet, wenn die
Schwierigkeit nicht mehr stetig steigt.

## Was bewirkt welcher Wert?

| Wert | Datei | Wirkung |
|---|---|---|
| `SPAWN_INTERVAL_MS` (Liste, ein Eintrag pro Level) | `levels.ts` | Wartezeit zwischen zwei neuen Gegnern in Millisekunden. **Kleiner = mehr Gegner = schwerer.** Im Lauf der Runde sinkt sie auf 60 %. |
| `MAX_ENEMIES` (Liste) | `levels.ts` | Wie viele Gegner gleichzeitig leben duerfen (hoechstens 150). Bremst, wenn die Astronautin nicht mitkommt. |
| `poolOf` / Gewichte | `levels.ts` | Welche Gegner vorkommen und wie oft (hoeheres Gewicht = haeufiger). Die Gegner-Ab-Level stehen in `idee.txt` und nicht aendern. |
| Rundendauer (3 oder 5 Minuten) | `levels.ts` | Vorgabe aus dem Plan (PE-05), nicht aendern. |
| `hp`, `speed`, `contactDamage` | `enemies.ts` | Leben, Lauftempo und Schaden pro Sekunde bei Beruehrung eines Gegners. |
| `projectile.damage` / `intervalMs` | `enemies.ts` | Schaden und Abstand der Hexen-Schuesse. |
| `aura.dps` / `radius` | `enemies.ts` | Dauerschaden und Reichweite des Waldgeists. |
| `xp` | `enemies.ts` | Erfahrung pro besiegtem Gegner (Spielerlevel). |
| `fireRatePerSec`, `damage` | `weapon.ts` | Schuesse pro Sekunde und Schaden pro Schuss der Laserpistole ohne Items. |
| `perStack` | `items.ts` | Wie viel ein eingesammeltes Item bringt (0,25 = +25 % des Grundwerts pro Stufe, bis Stufe 5). |
| `dropWeight` | `items.ts` | Relative Haeufigkeit eines Item-Typs beim Drop. |
| `dropChance`, `lifetimeMs` | `items.ts` | Drop-Chance pro besiegtem Gegner (0,08 = 8 %) und wie lange das Item liegen bleibt. |
| `maxHp` | `player.ts` | Lebenspunkte der Astronautin. |
| `xpCurveBase`, `xpCurveExponent`, `lossXpFactor` | `progression.ts` | Wie viel Erfahrung fuer das naechste Spielerlevel noetig ist und wie viel bei Niederlage bleibt. |

## Kennzahlen (so liest du die Tabelle)

- **Spawns/Min**: neue Gegner pro Minute im Durchschnitt der Runde.
- **Gegner-HP/Min**: Summe der Lebenspunkte aller neuen Gegner pro Minute.
- **Druck**: Gegner-HP pro Sekunde geteilt durch den Schaden pro Sekunde der Laserpistole ohne Items
  (jetzt 3 Schuesse/s mal 10 Schaden = 30 pro Sekunde). Unter 1 reicht die Grundwaffe rechnerisch,
  ueber 1 braucht man Items. Mit allen Items auf Stufe 5 ist der Schaden rund 4,5-mal so hoch (135 pro Sekunde).
  In der Praxis trifft man nicht immer, deshalb ist Level 0 mit 0,36 bewusst weit unter 1.
- **Schaden ohne Abschuss/Min**: Schaden pro Minute an der Astronautin, wenn sie gar nichts trifft und
  alle Gegner ungestoert ankommen. Sie ist nur zum Vergleichen der Level gedacht (die Zahl waechst mit
  der Rundendauer, daher sind 5-Minuten-Level hoeher). Annahme: Gegner starten 380 px vom Zentrum.

## Tabelle aller Level

| Level | Batch | Minuten | Spawn-Abstand (ms) | Max. Gegner | Spawns/Min | Gegner-HP/Min | Druck | Schaden ohne Abschuss/Min |
|---|---|---|---|---|---|---|---|---|
| 0 | forest | 3 | 3570 | 25 | 21 | 640 | 0,36 | 10312 |
| 1 | forest | 3 | 3130 | 28 | 24 | 730 | 0,41 | 11635 |
| 2 | forest | 3 | 2780 | 31 | 27 | 820 | 0,46 | 12967 |
| 3 | forest | 5 | 2450 | 34 | 31 | 936 | 0,52 | 16725 |
| 4 | forest | 5 | 2190 | 37 | 35 | 1044 | 0,58 | 18289 |
| 5 | forestNight | 3 | 1200 | 45 | 64 | 1284 | 0,71 | 14972 |
| 6 | forestNight | 3 | 1120 | 49 | 68 | 1372 | 0,76 | 16261 |
| 7 | forestNight | 3 | 1050 | 53 | 73 | 1466 | 0,81 | 17549 |
| 8 | forestNight | 5 | 970 | 57 | 79 | 1590 | 0,88 | 20823 |
| 9 | forestNight | 5 | 890 | 61 | 86 | 1735 | 0,96 | 22328 |
| 10 | elfForest | 3 | 710 | 75 | 108 | 2010 | 1,12 | 27909 |
| 11 | elfForest | 3 | 680 | 80 | 112 | 2097 | 1,16 | 29663 |
| 12 | elfForest | 3 | 660 | 85 | 116 | 2165 | 1,20 | 31349 |
| 13 | elfForest | 3 | 640 | 90 | 119 | 2228 | 1,24 | 33035 |
| 14 | elfForest | 3 | 620 | 95 | 123 | 2302 | 1,28 | 34728 |
| 15 | elfForest | 3 | 600 | 100 | 127 | 2377 | 1,32 | 36429 |
| 16 | elfForest | 5 | 580 | 105 | 132 | 2464 | 1,37 | 42214 |
| 17 | elfForest | 5 | 560 | 110 | 137 | 2550 | 1,42 | 44170 |
| 18 | elfForest | 5 | 540 | 115 | 142 | 2647 | 1,47 | 46137 |
| 19 | elfForest | 5 | 520 | 120 | 147 | 2748 | 1,53 | 48119 |
| 20 | elfForest | 5 | 500 | 125 | 153 | 2856 | 1,59 | 50117 |

## Was die Tests sichern

- Der Druck steigt mit jedem Level, auch ueber Batch-Grenzen (Spawns/Min ebenso).
- Die Spruenge 4 zu 5 und 9 zu 10 sind spuerbar (mindestens 10 % mehr Druck), aber hoechstens 50 %,
  und groesser als jeder normale Schritt im Batch.
- 5-Minuten-Level sind in ihrem Batch fordernder als die 3-Minuten-Level.
- Level 0 hat Druck von hoechstens 0,4. Level 20 liegt ueber 1,2 (Grundwaffe reicht nicht) und
  bleibt mit einem Teil der Items schaffbar.

## Nachjustieren: Beispiele

- Level 0 zu schwer: in `levels.ts` den ersten Eintrag von `SPAWN_INTERVAL_MS` erhoehen (z. B. 4000).
  Dann stimmt eventuell der Abstand zu Level 1 nicht mehr, der Test sagt es dir.
- Items zu stark: `perStack` in `items.ts` senken.
- Mehr Items: `dropChance` in `items.ts` erhoehen.
- Handtest-Ziel (M2-DEP): Level 0 gut schaffbar, Level 20 nur mit Items.
