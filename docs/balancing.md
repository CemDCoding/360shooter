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
| `perStack`, `maxStacks`, `durationMs` | `items.ts` | Wie viel ein Item bringt, wie oft es sich stapeln laesst (Schild: 60 je Stufe, bis Stufe 2) und wie lange Dauerfeuer haelt (4000 ms). |
| `dropWeight` | `items.ts` | Relative Haeufigkeit eines Item-Typs beim Drop. |
| `dropChance`, `lifetimeMs` | `items.ts` | Drop-Chance pro besiegtem Gegner (0,08 = 8 %) und wie lange das Item liegen bleibt. |
| `maxHp` | `player.ts` | Lebenspunkte der Astronautin. |
| `xpCurveBase`, `xpCurveExponent`, `lossXpFactor` | `progression.ts` | Wie viel Erfahrung fuer das naechste Spielerlevel noetig ist und wie viel bei Niederlage bleibt. |

## Kennzahlen (so liest du die Tabelle)

- **Spawns/Min**: neue Gegner pro Minute im Durchschnitt der Runde.
- **Gegner-HP/Min**: Summe der Lebenspunkte aller neuen Gegner pro Minute.
- **Druck**: Gegner-HP pro Sekunde geteilt durch den Schaden pro Sekunde der Laserpistole ohne Items
  (jetzt 4 Schuesse/s mal 10 Schaden = 40 pro Sekunde). Unter 1 reicht die Grundwaffe rechnerisch,
  ueber 1 braucht man Items. Mit Doppelschuss Stufe 2 (drei Schuesse) ist der Schaden 3-mal so hoch (120 pro Sekunde).
  In der Praxis trifft man nicht immer, deshalb ist Level 0 mit 0,50 bewusst unter 1.
  Die Eroeffnungswelle (AP-56) zaehlt bei Spawns/Min mit.
- **Schaden ohne Abschuss/Min**: Schaden pro Minute an der Astronautin, wenn sie gar nichts trifft und
  alle Gegner ungestoert ankommen. Sie ist nur zum Vergleichen der Level gedacht (die Zahl waechst mit
  der Rundendauer, daher sind 5-Minuten-Level hoeher). Annahme: Gegner starten 380 px vom Zentrum.

## Tabelle aller Level

| Level | Batch | Minuten | Spawn-Abstand (ms) | Max. Gegner | Spawns/Min | Gegner-HP/Min | Druck | Schaden ohne Abschuss/Min |
|---|---|---|---|---|---|---|---|---|
| 0 | forest | 3 | 3320 | 25 | 24 | 1200 | 0,50 | 10551 |
| 1 | forest | 3 | 3020 | 28 | 26 | 1317 | 0,55 | 11767 |
| 2 | forest | 3 | 2800 | 31 | 29 | 1433 | 0,60 | 12937 |
| 3 | forest | 5 | 2410 | 34 | 33 | 1630 | 0,68 | 16770 |
| 4 | forest | 5 | 2170 | 37 | 36 | 1820 | 0,76 | 18315 |
| 5 | forestNight | 3 | 1130 | 40 | 70 | 2011 | 0,84 | 13661 |
| 6 | forestNight | 3 | 1090 | 42 | 72 | 2079 | 0,87 | 14320 |
| 7 | forestNight | 3 | 1050 | 44 | 75 | 2165 | 0,90 | 14983 |
| 8 | forestNight | 5 | 1000 | 46 | 78 | 2246 | 0,94 | 17067 |
| 9 | forestNight | 5 | 960 | 48 | 81 | 2338 | 0,97 | 17808 |
| 10 | elfForest | 3 | 800 | 60 | 98 | 2564 | 1,07 | 22657 |
| 11 | elfForest | 3 | 790 | 64 | 99 | 2590 | 1,08 | 23973 |
| 12 | elfForest | 3 | 780 | 68 | 101 | 2625 | 1,09 | 25271 |
| 13 | elfForest | 3 | 770 | 72 | 102 | 2660 | 1,11 | 26554 |
| 14 | elfForest | 3 | 760 | 76 | 103 | 2694 | 1,12 | 27822 |
| 15 | elfForest | 3 | 750 | 80 | 105 | 2729 | 1,14 | 29076 |
| 16 | elfForest | 5 | 730 | 84 | 106 | 2774 | 1,16 | 33704 |
| 17 | elfForest | 5 | 720 | 88 | 108 | 2811 | 1,17 | 35178 |
| 18 | elfForest | 5 | 710 | 92 | 109 | 2853 | 1,19 | 36647 |
| 19 | elfForest | 5 | 700 | 96 | 111 | 2894 | 1,21 | 38110 |
| 20 | elfForest | 5 | 690 | 100 | 112 | 2931 | 1,22 | 39568 |

## Was die Tests sichern

- Der Druck steigt mit jedem Level, auch ueber Batch-Grenzen (Spawns/Min ebenso).
- Die Spruenge 4 zu 5 (Ist +10 %, erlaubt 8 bis 12 %) und 9 zu 10 (Ist +10 %, erlaubt 8 bis 10 %) sind spuerbar (mindestens 8 %)
  und groesser als jeder normale Schritt im neuen Batch.
- Ab Level 5 waechst der Druck je Level um hoechstens 10 %.
- 5-Minuten-Level sind in ihrem Batch fordernder als die 3-Minuten-Level.
- Level 0 hat Druck 0,45 bis 0,55 (Ist 0,50), Level 4 0,72 bis 0,80 (Ist 0,76). Level 20 liegt bei 0,95 bis 1,25 (Ist 1,22):
  die Grundwaffe reicht nicht, schon Doppelschuss Stufe 1 (80 pro Sekunde) reicht rechnerisch aus.
- Gold im Mittel etwa 45 je gewonnenem Level, Stufe 10 eines Upgrades nach 15 bis 20 Leveln (siehe unten).
- Doppelschuss, Schild und Dauerfeuer bleiben spuerbar, aber nicht uebermaechtig (siehe unten).

## Aenderung nach dem Handtest (AP-23)

Im Handtest kippte das Spiel ab Level 5, Level 12 war zu schwer. Deshalb:

- Die Laserpistole schiesst jetzt 4 statt 3 Mal pro Sekunde. Das gilt in allen Level, also sind auch Level 0-4 etwas leichter.
- Das Zombie-Eichhoernchen laeuft langsamer (Tempo 80 statt 110). Es kommt erst ab Level 5 vor.
- Der Verfluchte Baum bleibt unveraendert.
- Level 0-4 behalten ihre Spawn-Werte (Abstand und Max. Gegner).
- Level 5-20 haben weniger und gleichmaessiger wachsende Gegnermengen: Sprung von Level 4 auf 5 etwa +11 %,
  danach hoechstens +10 % je Level. Alt: Abstand Level 5 = 1200 ms, Level 12 = 660 ms, Level 20 = 500 ms. Neu: 1330, 860, 620 ms.
- Die Druck-Werte sind nicht mit den Werten aus AP-15 vergleichbar, weil die Grundwaffe jetzt 40 statt 30 Schaden pro Sekunde macht.

## Gold und Upgrades (AP-35)

Gold kommt aus Muenzen: jeder besiegte Gegner laesst mit 8 % Chance (seit AP-70, Q-42/Q-43, vorher 4,5 %) eine Muenze fallen
(`dropChance` in `coins.ts`), der Wert steht je Gegner in `enemies.ts` (`coinValue`). Gold je gewonnenem Level
ist also Gegnerzahl mal 0,08 mal mittlerer Muenzwert. Muenzwerte seit AP-70 (Q-43, Preise unveraendert, Tempo ueber die Werte gehalten): cursedTree 1, zombieSquirrel 1, forestWitch 4, forestSpirit 4 (vorher 2/2/5/8). Grosse Muenze ab Wert 4 (`BIG_COIN_MIN_VALUE`): Hexe und Waldgeist gross, Baum und Eichhoernchen klein. Bei Sieg bleibt alles Gold, bei Niederlage die Haelfte.
Der Preis fuer Stufe k auf k+1 ist `round(10 * 1,4^k)` (`COST_BASE`, `COST_GROWTH` in `upgrades.ts`).
Die Stufe 10 gilt fuer das Spiel-Level (0 bis 20), nicht fuers Spielerlevel (PE-50).

| Kennzahl | Wert | Woher |
|---|---|---|
| Gold je gewonnenem Level, Mittel ueber Level 0-20 | etwa 45 (Level 0: etwa 7, Level 20: etwa 105) | `dropChance` 0,08, `coinValue` 1/1/4/4 |
| Preis Stufe 0 auf 1 / Stufe 9 auf 10 | 10 / 207 Gold | `COST_BASE`, `COST_GROWTH` |
| Eine Upgrade-Spur auf Stufe 10 | 698 Gold, also etwa 15,5 Level im Mittel | Summe der Preise |
| Alle vier Spuren auf Stufe 10 | 2792 Gold (etwa 2 800) | 4 mal 698 |
| Wirkung je Stufe | Feuerrate und Schaden +10 %, Leben +10, Drehtempo +15 Grad/s (additiv aufsummiert, Stufe 10 = +100 % bzw. +100 / +150) | `UPGRADES` |
| Doppelschuss | Stufe 1: zwei Schuesse, Stufe 2: drei Schuesse (2-fach bzw. 3-fach Schaden pro Sekunde, hoechstens 3-fach) | `items.ts`, `maxStacks` 2 |
| Schild | 60 je Stufe, hoechstens 2 Stufen = 120 Puffer (1,2-mal die 100 Leben) | `perStack` 60, `maxStacks` 2 |
| Dauerfeuer | 20 Schuesse/s (5-mal die Grundwaffe) fuer 4 Sekunden | `durationMs` 4000, `RAPID_FIRE_MAX_PER_SEC` |
| Dauerfeuer-Anteil in Level 20 | etwa 20 % der Rundenzeit, Schaden im Mittel etwa 1,8-fach | bei 8 % Item-Drop, 30 von 100 Gewicht |

Boss (PE-76, AP-68): Der Boss erscheint erst in den letzten 30 Sekunden der Runde (vorher 60 s). Die Gegner-Spawnrate wird nur in diesem Fenster halbiert. Wird der Boss besiegt, endet die Runde sofort mit Sieg.

Was sich gegenueber AP-27 geaendert hat:

- AP-70 (Q-43): Drop 4,5 % auf 8 %, Muenzwerte auf 1/1/4/4, grosse Muenze ab 4. Gold-Mittel bleibt im Zielbereich 43-47, Stufe 10 nach 15-20 Leveln.
- `dropChance` Muenzen 0,05 auf 0,048: das Gold-Mittel lag bei 46,8 und damit eine Stufe-10-Spur bei 14,9 Leveln (unter 15). Jetzt etwa 45 und 15,5.
- Schild `maxStacks` 3 auf 2: 180 Puffer waren fast das Doppelte der Leben, das ist zu stark. Jetzt 120.
- Dauerfeuer `durationMs` 5000 auf 4000: in Level 20 war man etwa 25 % der Zeit im Dauerfeuer (Schaden im Mittel fast 2-fach), jetzt etwa 20 %.
- Unveraendert: Doppelschuss, Upgrade-Preise und -Wirkung, Level- und Gegnerwerte (Spawn-Werte Level 0-4 bleiben gleich).

## Aenderung nach dem Handtest M2b-DEP (AP-56)

Befund (Handtest 2026-10-25): (c) die ersten Level waren zu einfach, (d) jede Runde begann mit einem leeren Feld
(erster Gegner nach einem vollen Intervall, Level 0: 3,57 s, dazu etwa 12 s Laufweg), (e) der Verfluchte Baum starb mit einem Laser
oder einer Doppelschuss-Salve.

- **Eroeffnungswelle (d):** Beim ersten `tick` erscheinen sofort `openingCount(level) = clamp(round(maxEnemies * 0,15), 3, 8)` Gegner
  (Level 0: 4, Level 20: 8), gleichmaessig auf dem Ring verteilt (zufaelliger Startwinkel), auf dem Radius
  `spawnRadius * OPENING_RADIUS_FACTOR` (0,65, also am Bildrand). Genau einmal je Director, begrenzt durch `maxEnemies`.
  Danach laeuft alles wie bisher (erster Regel-Spawn nach einem vollen Intervall).
- **Baum (e):** `cursedTree.hp` 30 auf 50. Die Grundwaffe braucht 5 Treffer, eine Doppelschuss-Salve Stufe 2 mit
  Schaden-Upgrade Stufe 5 (3 mal 15 = 45) toetet ihn nicht. Mit Schaden-Upgrade Stufe 10 kann eine volle Salve ihn toeten (gewollt).
- **Kurve (c):** Die zaeheren Baeume heben den Druck von selbst; Spawn-Abstaende wurden neu eingestellt (Zielwerte siehe oben).
  Level 0 vorher 0,27, jetzt 0,50; Level 4 vorher 0,43, jetzt 0,76; Level 20 vorher 0,96, jetzt 1,22 (ohne Anpassung etwa 1,34).
  Die Kurven-Tests wurden nicht gelockert: Bereiche sind nur dort neu, wo der Plan neue Zielwerte setzt (Level 0, 4, 20);
  Level 0 hat jetzt auch eine Untergrenze. Der Abstand sinkt weiter streng, `MAX_ENEMIES` blieb unveraendert.
  Die Spruenge 4 zu 5 (+10 %) und 9 zu 10 (+9 %) sowie die Schritte ab Level 5 (hoechstens +10 %, Ist 1 bis 4 %) halten.
- **Gold:** Mehr Spawns (Eroeffnungswelle, dichtere Level 0-9) hoben das Gold-Mittel auf etwa 47,3. `dropChance` 0,048 auf 0,045
  bringt es auf etwa 44,4 (Test: 43 bis 47). Eine Upgrade-Spur auf Stufe 10 (698 Gold) braucht damit etwa 15,7 Level.
- Alle neuen Startwerte (Baum-HP 50, Radius 0,65, Zielwerte) sind angenommen und werden im Handtest geprueft.

## Nachjustieren: Beispiele

- Level 0 zu schwer: in `levels.ts` den ersten Eintrag von `SPAWN_INTERVAL_MS` erhoehen (z. B. 3600; Druck-Untergrenze 0,45 beachten).
- Rundenstart zu hektisch oder zu leer: `OPENING_RADIUS_FACTOR` (Abstand der Eroeffnungswelle, 0,65) oder den Anteil in `openingCount` (15 %, 3 bis 8) in `spawn.ts` aendern.
  Dann stimmt eventuell der Abstand zu Level 1 nicht mehr, der Test sagt es dir.
- Items zu stark: `perStack` oder `maxStacks` in `items.ts` senken, bei Dauerfeuer `durationMs`.
- Mehr Items: `dropChance` in `items.ts` erhoehen.
- Handtest-Ziel (M2-DEP): Level 0 gut schaffbar, Level 20 nur mit Items.
