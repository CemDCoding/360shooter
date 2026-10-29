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
- **Skalierung (AP-91)**: `LEVEL_SCALING` in `scaling.ts` mit den Faktoren `hp`, `xp`, `coin`, `contact` je Level. Die Kennzahlen rechnen sie ein (Lebenspunkte gerundet wie im Spiel).
- **Schaden ohne Abschuss/Min**: Schaden pro Minute an der Astronautin, wenn sie gar nichts trifft und
  alle Gegner ungestoert ankommen. Sie ist nur zum Vergleichen der Level gedacht (die Zahl waechst mit
  der Rundendauer, daher sind 5-Minuten-Level hoeher). Annahme: Gegner starten 380 px vom Zentrum.

## Tabelle aller Level

| Level | Batch | Minuten | Spawn-Abstand (ms) | Max. Gegner | Spawns/Min | Gegner-HP/Min | Druck | Schaden ohne Abschuss/Min |
|---|---|---|---|---|---|---|---|---|
| 0 | forest | 3 | 1500 | 25 | 52 | 1196 | 0,50 | 5687 |
| 1 | forest | 3 | 1450 | 28 | 54 | 1296 | 0,54 | 6718 |
| 2 | forest | 3 | 1400 | 31 | 56 | 1456 | 0,61 | 7674 |
| 3 | forest | 5 | 1360 | 34 | 57 | 1602 | 0,67 | 10233 |
| 4 | forest | 5 | 1330 | 37 | 59 | 1817 | 0,76 | 12048 |
| 5 | forestNight | 3 | 870 | 52 | 90 | 2015 | 0,84 | 14199 |
| 6 | forestNight | 3 | 840 | 55 | 94 | 2089 | 0,87 | 14974 |
| 7 | forestNight | 3 | 810 | 57 | 97 | 2164 | 0,90 | 15521 |
| 8 | forestNight | 5 | 770 | 60 | 101 | 2253 | 0,94 | 17784 |
| 9 | forestNight | 5 | 740 | 62 | 105 | 2342 | 0,98 | 18389 |
| 10 | elfForest | 3 | 615 | 78 | 127 | 2564 | 1,07 | 24944 |
| 11 | elfForest | 3 | 610 | 83 | 128 | 2584 | 1,08 | 26321 |
| 12 | elfForest | 3 | 600 | 88 | 130 | 2624 | 1,09 | 27716 |
| 13 | elfForest | 3 | 590 | 94 | 132 | 2671 | 1,11 | 29356 |
| 14 | elfForest | 3 | 585 | 99 | 133 | 2691 | 1,12 | 30675 |
| 15 | elfForest | 3 | 575 | 104 | 136 | 2738 | 1,14 | 32030 |
| 16 | elfForest | 5 | 560 | 109 | 138 | 2790 | 1,16 | 37022 |
| 17 | elfForest | 5 | 555 | 114 | 140 | 2818 | 1,17 | 38564 |
| 18 | elfForest | 5 | 545 | 120 | 142 | 2866 | 1,19 | 40437 |
| 19 | elfForest | 5 | 540 | 125 | 143 | 2895 | 1,21 | 41961 |
| 20 | elfForest | 5 | 530 | 130 | 146 | 2947 | 1,23 | 43529 |

## Was die Tests sichern

- Der Druck steigt mit jedem Level, auch ueber Batch-Grenzen (Spawns/Min ebenso).
- Die Spruenge 4 zu 5 (Ist +11 %, erlaubt 8 bis 12 %) und 9 zu 10 (Ist +9 %, erlaubt 8 bis 10 %) sind spuerbar (mindestens 8 %)
  und groesser als jeder normale Schritt im neuen Batch.
- Ab Level 5 waechst der Druck je Level um hoechstens 10 %.
- 5-Minuten-Level sind in ihrem Batch fordernder als die 3-Minuten-Level.
- Level 0 hat Druck 0,45 bis 0,55 (Ist 0,50), Level 4 0,72 bis 0,80 (Ist 0,76). Level 20 liegt bei 0,95 bis 1,25 (Ist 1,23):
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

## Skalierung je Level (AP-91, B5)

Handtest H-22: In Level 0 bis 4 kam der naechste Gegner teils erst nach 3,3 s, die Runde wirkte leer. Jetzt:

- **Dichte:** Spawn-Abstand in Level 0 bis 4 von 3320 / 3020 / 2800 / 2410 / 2170 ms auf 1500 / 1450 / 1400 / 1360 / 1330 ms. Die groesste Luecke ist damit 1,5 s (vorher 3,3 s), im Lauf der Runde sinkt sie auf 60 %. `MAX_ENEMIES` bleibt (25 bis 37, unter dem Wert 40 von Level 5).
- **Schwaechere Einzelgegner:** In Level 0 bis 4 hat jeder Baum weniger Lebenspunkte, bringt weniger Erfahrung, laesst seltener eine Muenze fallen und macht weniger Kontaktschaden, im Verhaeltnis alte zu neue Gegnerzahl. Druck, Gold-Tempo (Q-51), Erfahrung je Level und Gesamt-Kontaktschaden bleiben dadurch gleich.
- **Level 5 bis 20:** in AP-91 unveraendert, seit AP-95 dichter (siehe unten).

| Level | Abstand vorher / nachher (ms) | Spawns/Min vorher / nachher | Faktor | `hp` (Baum-HP) | `xp` und `coin` | `contact` | Druck vorher / nachher | Gold je Level |
|---|---|---|---|---|---|---|---|---|
| 0 | 3320 / 1500 | 24,0 / 52,0 | 2,17 | 0,46 (23) | 0,462 | 0,46 | 0,50 / 0,50 | 5,8 / 5,8 |
| 1 | 3020 / 1450 | 26,3 / 54,0 | 2,05 | 0,48 (24) | 0,488 | 0,49 | 0,55 / 0,54 | 6,3 / 6,3 |
| 2 | 2800 / 1400 | 28,7 / 56,0 | 1,95 | 0,52 (26) | 0,512 | 0,51 | 0,60 / 0,61 | 6,9 / 6,9 |
| 3 | 2410 / 1360 | 32,6 / 57,2 | 1,75 | 0,56 (28) | 0,570 | 0,57 | 0,68 / 0,67 | 13,0 / 13,0 |
| 4 | 2170 / 1330 | 36,4 / 58,6 | 1,61 | 0,62 (31) | 0,621 | 0,62 | 0,76 / 0,76 | 14,6 / 14,6 |

Der Faktor ist die Gegnerzahl pro Minute nachher geteilt durch vorher (mindestens 1,5, Ziel erreicht). Der Sprung 4 zu 5 bleibt bei +10 %.
Bekannte Folge: Der Verfluchte Baum hat in Level 0 bis 4 nur 23 bis 31 statt 50 Lebenspunkte (Gegenstueck zu AP-56 (e)): eine Doppelschuss-Salve (Stufe 2, 3 mal 10 Schaden) toetet ihn in Level 0 bis 3. Das ist die Kehrseite von doppelt so vielen Gegnern bei gleichem Druck und im Handtest zu pruefen.
Nachjustieren: zuerst `hp` in `scaling.ts` (Baum-HP = 50 mal `hp`, ganzzahlig halten), die Tests der Kurve bleiben der Massstab.

## Dichte und Skalierung Level 5 bis 20 (AP-95, B5 Teil 3)

Handtest H-22: Auch Level 5 bis 20 sollen dichter werden. Ziel: Gegner je Minute mindestens etwa x1,3 gegenueber dem Stand nach AP-91.
Begruendung des Faktors: Level 5 bis 20 hatten schon Luecken von hoechstens 1,13 s, deshalb reicht ein kleinerer Faktor als die x1,5 fuer Level 0 bis 4 (die aus 3,3 s kamen). Mehr als x1,3 treibt `MAX_ENEMIES` und die Last am Handy (RI-6).

- **Dichte:** `SPAWN_INTERVAL_MS` in Level 5 bis 20 durch 1,3 (auf 5 ms gerundet, jeder Eintrag kleiner als der vorige). Ergebnis: x1,29 bis x1,30 Spawns/Min (inklusive Eroeffnungswelle).
- **`MAX_ENEMIES`:** je Level x1,3 (Level 5: 40 auf 52, Level 20: 100 auf 130). Der Hoechstwert 130 ist +30 % ueber dem Hoechstwert nach AP-91 (100), das ist die Obergrenze aus RI-6; mehr wird nicht gebraucht. Level 0 bis 4 unveraendert (25 bis 37).
- **Schwaechere Einzelgegner:** `hp` und `contact` 0,77 in allen Level 5 bis 20 (Baum 39, Hexe 15, Eichhoernchen 6, Waldgeist 8 Lebenspunkte, gerundet wie im Spiel), `xp` und `coin` 0,767 bis 0,776 (alte durch neue Gegnerzahl je Level, damit Gold und Erfahrung je Level gleich bleiben).
- **Ergebnis:** Druck je Level aendert sich um hoechstens +0,01 (Level 20: 1,22 auf 1,23, Band 0,95 bis 1,25). Sprung 4 zu 5: +10,9 % (erlaubt bis 12 %), 9 zu 10: +9,5 % (erlaubt 8 bis 10 %), Schritte ab Level 6 hoechstens +9,5 %. Gold-Mittel ueber alle Level 46,0 (Band 43 bis 47), Stufe 10 einer Upgrade-Spur nach etwa 15,2 Leveln. Gesamt-Kontaktschaden je Level bleibt (Gegnerzahl mal `contact`).
- **Boss-Fairness:** `BOSS_SPAWN_RATE_FACTOR` und die Boss-Konfiguration sind unveraendert; die Spawnrate in Boss-Phasen wird weiter halbiert (der Abstand ist aber kuerzer, die Phase hat also mehr normale Gegner als vor AP-95, immer begrenzt durch `maxEnemies`).

| Level | Spawns/Min vorher / nachher | Faktor | Abstand vorher / nachher (ms) | Max. Gegner vorher / nachher |
|---|---|---|---|---|
| 5 | 69,7 / 90,3 | 1,3 | 1130 / 870 | 40 / 52 |
| 6 | 72,0 / 93,7 | 1,3 | 1090 / 840 | 42 / 55 |
| 7 | 75,0 / 97,0 | 1,29 | 1050 / 810 | 44 / 57 |
| 8 | 77,8 / 101,0 | 1,3 | 1000 / 770 | 46 / 60 |
| 9 | 81,0 / 105,0 | 1,3 | 960 / 740 | 48 / 62 |
| 10 | 98,3 / 127,0 | 1,29 | 800 / 615 | 60 / 78 |
| 11 | 99,3 / 128,0 | 1,29 | 790 / 610 | 64 / 83 |
| 12 | 100,7 / 130,0 | 1,29 | 780 / 600 | 68 / 88 |
| 13 | 102,0 / 132,3 | 1,3 | 770 / 590 | 72 / 94 |
| 14 | 103,3 / 133,3 | 1,29 | 760 / 585 | 76 / 99 |
| 15 | 104,7 / 135,7 | 1,3 | 750 / 575 | 80 / 104 |
| 16 | 106,4 / 138,2 | 1,3 | 730 / 560 | 84 / 109 |
| 17 | 107,8 / 139,6 | 1,29 | 720 / 555 | 88 / 114 |
| 18 | 109,4 / 142,0 | 1,3 | 710 / 545 | 92 / 120 |
| 19 | 111,0 / 143,4 | 1,29 | 700 / 540 | 96 / 125 |
| 20 | 112,4 / 146,0 | 1,3 | 690 / 530 | 100 / 130 |

**Baum-HP und Anschluss Level 4 nach 5:** Der Verfluchte Baum hat in Level 0 bis 4 23 / 24 / 26 / 28 / 31 Lebenspunkte (statt 50), ab Level 5 jetzt 39. Der Sprung 31 auf 39 ist gewollt: Level 5 bringt zusaetzlich Hexe und Eichhoernchen, der Druck steigt stetig (0,76 auf 0,84), die Gegnerzahl je Minute springt aber von 59 auf 90 (Level 0 bis 4 wurden in AP-91 nur auf etwa x1,6 bis x2,2 angehoben). AP-95 aendert Level 0 bis 4 nicht. Eine Doppelschuss-Salve (Stufe 2, 3 mal 10 Schaden) toetet den Baum in Level 0 bis 3 in einem Zug, in Level 4 und ab Level 5 nicht (Handtest steht aus, H-24).
Nachjustieren: `hp` und `contact` in `scaling.ts`, bei der Dichte `SPAWN_INTERVAL_MS`; `xp` und `coin` danach neu als alte durch neue Gegnerzahl setzen.

## Nachjustieren: Beispiele

- Level 0 zu schwer: in `scaling.ts` `hp` von Level 0 senken oder in `levels.ts` `SPAWN_INTERVAL_MS[0]` erhoehen (hoechstens 1500, groesste Luecke); Druck-Untergrenze 0,45 beachten.
- Rundenstart zu hektisch oder zu leer: `OPENING_RADIUS_FACTOR` (Abstand der Eroeffnungswelle, 0,65) oder den Anteil in `openingCount` (15 %, 3 bis 8) in `spawn.ts` aendern.
  Dann stimmt eventuell der Abstand zu Level 1 nicht mehr, der Test sagt es dir.
- Items zu stark: `perStack` oder `maxStacks` in `items.ts` senken, bei Dauerfeuer `durationMs`.
- Mehr Items: `dropChance` in `items.ts` erhoehen.
- Handtest-Ziel (M2-DEP): Level 0 gut schaffbar, Level 20 nur mit Items.
