# Balancing: Schwierigkeit einstellen

Alle Spielwerte stehen als Zahlen in `src/config/`. Du aenderst nur diese Zahlen, nie die Logik.
Nach jeder Aenderung `npm test` laufen lassen: `tests/logic/balance.test.ts` meldet, wenn die
Schwierigkeit nicht mehr stetig steigt.

## Was bewirkt welcher Wert?

| Wert | Datei | Wirkung |
|---|---|---|
| `SPAWN_INTERVAL_MS` (Liste, ein Eintrag pro Level) | `levels.ts` | Wartezeit zwischen zwei neuen Gegnern in Millisekunden. **Kleiner = mehr Gegner = schwerer.** Im Lauf der Runde sinkt sie auf 60 %. |
| `MAX_ENEMIES` (Liste) | `levels.ts` | Wie viele Gegner gleichzeitig leben duerfen (hoechstens 150). Bremst, wenn die Astronautin nicht mitkommt. |
| `POOL_OF_BATCH` / Gewichte | `levels.ts` | Welche Gegner je Batch vorkommen und wie oft (hoeheres Gewicht = haeufiger). Die Zuordnung Gegner zu Batch (F-19, PE-125) nicht aendern. |
| `LEVEL_SCALING` (`hp`, `xp`, `coin`, `contact`) | `scaling.ts` | Faktoren je Level auf Lebenspunkte, Erfahrung, Muenz-Drop-Chance und Kontaktschaden. Ab Level 21 traegt `hp` die Kurve. |
| `COST_BASE`, `COST_GROWTH`, `perLevel` | `upgrades.ts` | Preis und Wirkung der Upgrade-Stufen 1 bis 15. |
| Rundendauer (3 oder 5 Minuten) | `levels.ts` | Vorgabe aus dem Plan (PE-05), nicht aendern. |
| `hp`, `speed`, `contactDamage` | `enemies.ts` | Leben, Lauftempo und Schaden pro Sekunde bei Beruehrung eines Gegners. |
| `projectile.damage` / `intervalMs` | `enemies.ts` | Schaden und Abstand der Schuesse (Hexe, Kamel, Archaeologe, Mumie). |
| `charge`, `burrow`, `onHit` | `enemies.ts` | Ansturm (Wildschwein, Armadillo), Eingraben (Sandwurm), Gift (Schlange) und Wickel (Mumie). Sie gehen in die Kennzahlen ein (siehe „Neue Gegner“). |
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
  Seit AP-105 rechnet der Druck mit **wirksamen** Lebenspunkten: Ansturm, Eingraben und Wickel erhoehen sie (siehe „Neue Gegner“).
- **Skalierung (AP-91)**: `LEVEL_SCALING` in `scaling.ts` mit den Faktoren `hp`, `xp`, `coin`, `contact` je Level. Die Kennzahlen rechnen sie ein (Lebenspunkte gerundet wie im Spiel).
- **Schaden ohne Abschuss/Min**: Schaden pro Minute an der Astronautin, wenn sie gar nichts trifft und
  alle Gegner ungestoert ankommen. Sie ist nur zum Vergleichen der Level gedacht (die Zahl waechst mit
  der Rundendauer, daher sind 5-Minuten-Level hoeher). Annahme: Gegner starten 380 px vom Zentrum.
  Gift (Schlange) und Wickel (Mumie) zaehlen hier als zusaetzlicher Schaden (AP-105).

## Tabelle aller Level

| Level | Batch | Minuten | Spawn-Abstand (ms) | Max. Gegner | Spawns/Min | Gegner-HP/Min | Druck | Schaden ohne Abschuss/Min |
|---|---|---|---|---|---|---|---|---|
| 0 | forest | 3 | 1500 | 25 | 52 | 1193 | 0,50 | 5716 |
| 1 | forest | 3 | 1450 | 28 | 54 | 1294 | 0,54 | 6753 |
| 2 | forest | 3 | 1400 | 31 | 56 | 1459 | 0,61 | 7714 |
| 3 | forest | 5 | 1360 | 34 | 57 | 1610 | 0,67 | 10284 |
| 4 | forest | 5 | 1330 | 37 | 59 | 1832 | 0,76 | 12108 |
| 5 | forestNight | 3 | 870 | 52 | 90 | 2006 | 0,84 | 14970 |
| 6 | forestNight | 3 | 840 | 55 | 94 | 2080 | 0,87 | 15787 |
| 7 | forestNight | 3 | 810 | 57 | 97 | 2154 | 0,90 | 16365 |
| 8 | forestNight | 5 | 770 | 60 | 101 | 2242 | 0,93 | 18728 |
| 9 | forestNight | 5 | 740 | 62 | 105 | 2331 | 0,97 | 19365 |
| 10 | elfForest | 3 | 615 | 78 | 127 | 2543 | 1,06 | 25133 |
| 11 | elfForest | 3 | 610 | 83 | 128 | 2564 | 1,07 | 26520 |
| 12 | elfForest | 3 | 600 | 88 | 130 | 2604 | 1,08 | 27925 |
| 13 | elfForest | 3 | 590 | 94 | 132 | 2650 | 1,10 | 29578 |
| 14 | elfForest | 3 | 585 | 99 | 133 | 2670 | 1,11 | 30907 |
| 15 | elfForest | 3 | 575 | 104 | 136 | 2717 | 1,13 | 32273 |
| 16 | elfForest | 5 | 560 | 109 | 138 | 2768 | 1,15 | 37294 |
| 17 | elfForest | 5 | 555 | 114 | 140 | 2796 | 1,16 | 38847 |
| 18 | elfForest | 5 | 545 | 120 | 142 | 2844 | 1,18 | 40734 |
| 19 | elfForest | 5 | 540 | 125 | 143 | 2872 | 1,20 | 42270 |
| 20 | elfForest | 5 | 530 | 130 | 146 | 2924 | 1,22 | 43849 |
| 21 | desert | 3 | 525 | 131 | 148 | 3193 | 1,33 | 37646 |
| 22 | desert | 3 | 520 | 132 | 150 | 3462 | 1,44 | 38307 |
| 23 | desert | 3 | 515 | 133 | 151 | 3718 | 1,55 | 38974 |
| 24 | desert | 5 | 510 | 134 | 152 | 4001 | 1,67 | 44032 |
| 25 | desert | 5 | 505 | 135 | 153 | 4270 | 1,78 | 44819 |
| 26 | pyramids | 3 | 500 | 136 | 156 | 4675 | 1,95 | 38060 |
| 27 | pyramids | 3 | 495 | 137 | 157 | 5010 | 2,09 | 38683 |
| 28 | pyramids | 3 | 490 | 138 | 159 | 5388 | 2,25 | 39313 |
| 29 | pyramids | 5 | 485 | 139 | 159 | 5769 | 2,40 | 44620 |
| 30 | pyramids | 5 | 480 | 140 | 161 | 6217 | 2,59 | 45323 |
| 31 | oasis | 3 | 475 | 141 | 164 | 6801 | 2,83 | 45917 |
| 32 | oasis | 3 | 470 | 142 | 165 | 7301 | 3,04 | 46545 |
| 33 | oasis | 3 | 465 | 143 | 167 | 7865 | 3,28 | 47207 |
| 34 | oasis | 3 | 460 | 144 | 169 | 8449 | 3,52 | 47848 |
| 35 | oasis | 3 | 455 | 145 | 171 | 9069 | 3,78 | 48495 |
| 36 | oasis | 5 | 450 | 146 | 172 | 9755 | 4,06 | 54872 |
| 37 | oasis | 5 | 445 | 147 | 174 | 10477 | 4,37 | 55586 |
| 38 | oasis | 5 | 440 | 148 | 176 | 11251 | 4,69 | 56306 |
| 39 | oasis | 5 | 435 | 149 | 178 | 12095 | 5,04 | 57033 |
| 40 | oasis | 5 | 430 | 150 | 180 | 12989 | 5,41 | 57796 |

Seit AP-105 mit Wildschwein, Baer und Fee in Level 0 bis 20. Ab Level 21 ist der Druck gegen die Grundwaffe ohne Upgrades
gerechnet und deshalb deutlich ueber 1: Die Wueste setzt Upgrades voraus (siehe „Level 21 bis 40“).

## Was die Tests sichern

- Der Druck steigt mit jedem Level 0 bis 40, auch ueber Batch-Grenzen (Spawns/Min ebenso).
- Die Spruenge 4 zu 5 (Ist +9,5 %, erlaubt 8 bis 12 %), 9 zu 10 (Ist +9,1 %), 20 zu 21 (Ist +9,2 %), 25 zu 26 (Ist +9,5 %)
  und 30 zu 31 (Ist +9,4 %, alle erlaubt 8 bis 10 %) sind spuerbar und groesser als jeder normale Schritt im neuen Batch.
- Ab Level 5 waechst der Druck je Level um hoechstens 10 %.
- 5-Minuten-Level sind in ihrem Batch fordernder als die 3-Minuten-Level.
- Level 0 hat Druck 0,45 bis 0,55 (Ist 0,50), Level 4 0,72 bis 0,80 (Ist 0,76). Level 20 liegt bei 0,95 bis 1,25 (Ist 1,22):
  die Grundwaffe reicht nicht, schon Doppelschuss Stufe 1 (80 pro Sekunde) reicht rechnerisch aus.
- Gold im Mittel etwa 45 je gewonnenem Level 0 bis 20, Stufe 10 eines Upgrades nach 15 bis 20 Leveln (siehe unten).
- Level 0 bis 20: Druck, Gold und Erfahrung je Level hoechstens 4 % neben dem Stand vor M5 (PE-125).
- Level 21 bis 40: `hp` ueber 0,77 und steigend, Druck mit angenommenen Upgrades steigend und in Level 40 bei 0,8 bis 1,25,
  Stufe 15 einer Spur bis etwa Level 35, `MAX_ENEMIES` hoechstens 150.
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

**Level 21 bis 40 (M5, AP-97):** waren vorlaeufig, AP-105 hat sie eingestellt (siehe unten). Boss-Werte stehen in `bosses.ts` und gehoeren nicht dazu.
Seit AP-105 hat der Baum in Level 0 bis 4 22 / 23 / 25 / 27 / 30 Lebenspunkte (siehe „Neue Gegner und Level 0 bis 20“).

## Neue Gegner und Level 0 bis 20 (AP-105, PE-125, PE-127)

Gegnerwerte nach den Stichworten aus F-19 (Basiswerte vor `LEVEL_SCALING`):

| Gegner | Batches | HP | Tempo | Kontakt | Erfahrung / Muenze | Besonderheit | Wirksame HP | Schaden/s am Ziel |
|---|---|---|---|---|---|---|---|---|
| Wildschwein `boar` | Wald, Wald bei Nacht | 80 | 30 | 10 | 7 / 1 | Ansturm (800 ms Ankuendigung) | x1,23 | 10 |
| Baer `bear` | Wald, Wald bei Nacht | 90 | 36 | 12 | 7 / 1 | Tank, mittel schnell | x1 | 12 |
| Fee `fairy` | Wald bei Nacht, Elfenwald | 4 | 75 | 15 | 4 / 2 | Zickzack, sehr wenig HP, viel Schaden | x1 | 15 |
| Mumie `mummy` | Pyramiden, Oase | 40 | 22 | 15 | 10 / 4 | Wickel 12 Schaden alle 2,6 s, Drehung 2 s halbiert | x1,24 | 6,4 |
| Sandwurm `sandWorm` | Wueste, Pyramiden | 16 | 70 | 8 | 6 / 2 | Eingraben 1,8 s von 4,3 s | x1,21 | 8 |
| Armadillo `armadillo` | Wueste | 90 | 20 | 10 | 8 / 3 | Ansturm, halber Schaden beim Rollen | x1,44 | 10 |
| Kamel `camel` | Wueste | 35 | 30 | 6 | 10 / 4 | Spucke 8 Schaden alle 2,2 s | x1 | 3,6 |
| Schlange `snake` | Wueste, Oase | 10 | 85 | 5 | 5 / 2 | Gift 3 Schaden/s fuer 3 s | x1 | 8 |
| Archaeologe `archaeologist` | Pyramiden, Oase | 20 | 40 | 5 | 10 / 4 | Standardwerte wie die Hexe | x1 | 4 |
| Sphinx `sphinx` | Pyramiden, Oase | 160 | 18 | 18 | 15 / 5 | Tank, die meisten HP | x1 | 18 |

**Wie Ansturm, Eingraben, Wickel und Gift in die Rechnung eingehen** (Annahmen, `tests/logic/balance.test.ts`):

- **Ansturm:** Die letzten `CHARGE_TRIGGER_DISTANCE` (120 px) legt der Gegner mit Ankuendigung und Sprint (`dashSpeed`) zurueck
  statt im Gehen. Die Zeit zum Abschiessen auf 380 px Anlauf sinkt, die wirksamen HP steigen im selben Verhaeltnis
  (Wildschwein 10,3 s statt 12,7 s, also x1,23). Armadillo dazu: halber Schaden waehrend des Rollens (1200 von 5600 ms), zusammen x1,44.
- **Eingraben:** Abgetaucht ist der Sandwurm unverwundbar (1800 von 4300 ms). Die Haelfte dieser Zeit geht der Spielerin verloren
  (in der anderen Haelfte trifft sie andere Gegner), also x(1 + 0,5 x 0,42) = x1,21.
- **Wickel:** Die Spielerin dreht 2 s lang halb so schnell. Annahme: Die Haelfte der Kampfzeit ist Drehen. So lange der Wickel wirkt
  (2 von 2,6 s), verliert sie ein Viertel ihres Schadens. Das zaehlt als x1,24 auf die Mumie und beim Schaden ohne Abschuss
  als Aufschlag (1 + 0,5 x 0,77) auf den Wickel-Schaden.
- **Gift:** aendert weder HP noch Schaden der Spielerin. Es zaehlt mit 3 Schaden/s zusaetzlich beim Schaden ohne Abschuss.

**Level 0 bis 20 (PE-125):** Wildschwein und Baer ab Level 0, Fee ab Level 5, mit kleinen Gewichten (hoechstens 10 % des Baums).
Die alten Gewichte sind vervielfacht (Wald 40 Baeume, Wald bei Nacht 60 / 30 / 48, Elfenwald 40 / 20 / 32 / 16), dazu Wildschwein 1
und Baer 1 (Wald, Wald bei Nacht) sowie Fee 6 (Wald bei Nacht) bzw. 1 (Elfenwald). Die Fee (3 HP nach Skalierung) gleicht im Wald bei
Nacht die beiden Tanks aus. Im Wald gibt es keinen leichten Gegner, deshalb ist `hp` in Level 0 bis 4 um einen Baum-Lebenspunkt gesenkt
(0,44 / 0,46 / 0,50 / 0,54 / 0,60, Baum 22 / 23 / 25 / 27 / 30 statt 23 / 24 / 26 / 28 / 31). Spawn-Abstand, `MAX_ENEMIES`, `xp`,
`coin` und `contact` bleiben. Die Fee bringt 2 Gold, damit der mittlere Muenzwert der Pools gleich bleibt.
Ergebnis gegenueber vor M5: Druck je Level etwa -1 % bis +1 %, Gold und Erfahrung etwa -1 % bis +2 % (Test: hoechstens 4 %,
Toleranz wie AP-95). Gold-Mittel Level 0 bis 20: 46,1 (Band 43 bis 47).

## Level 21 bis 40 (AP-105, PE-129)

Ziel: Die Kurve laeuft weiter, staerker werden die Gegner selbst, nicht ihre Zahl. `MAX_ENEMIES` hoechstens 150 (Leistung am iPhone, RI-6).

- **Spawn-Abstand:** 525 ms (Level 21) bis 430 ms (Level 40), 5 ms je Level. Spawns/Min steigen nur von 146 (Level 20) auf 180 (+23 %).
- **`MAX_ENEMIES`:** 131 bis 150, +1 je Level (Bremse, Obergrenze 150 in Level 40).
- **Pools:** Die Gewichte halten die wirksamen mittleren HP der drei Batches nahe beieinander, Tanks sind selten:
  Wueste Sandwurm 10, Armadillo 2, Kamel 4, Schlange 10; Pyramiden Mumie 3, Sandwurm 14, Archaeologe 8, Sphinx 1;
  Oase Mumie 4, Schlange 14, Archaeologe 6, Sphinx 2.
- **`hp`:** 0,806 (Level 21) bis 2,422 (Level 40), so gewaehlt, dass der Druck je Level um etwa +7,5 % steigt und an den
  Batch-Grenzen 20 zu 21, 25 zu 26 und 30 zu 31 um etwa +9,5 % springt (wie 4 zu 5 und 9 zu 10, hoechstens +10 %).
- **`contact`:** 0,77 bis 0,963, waechst wie die angenommenen Lebenspunkte der Spielerin (200 bei Stufe 10, 250 bei Stufe 15).
  Geschosse, Gift und Aura werden nicht skaliert.
- **`coin` und `xp`:** 1,2 (Level 21) plus 0,05 je Level bis 2,15 (Level 40). Die Muenz-Chance liegt damit bei 9,6 % bis 17,2 %.

**Annahme Upgrades:** Der Plan nimmt Stufe 10 auf allen Spuren bei Level 21 und Stufe 15 bei Level 40 an, dazwischen linear.
Fuer den Druck zaehlen nur Feuerrate und Schaden: Stufe 10 ergibt den 4-fachen, Stufe 15 den 6,25-fachen Schaden pro Sekunde.
Begruendung: Wer jedes Level einmal gewinnt, hat nach Level 20 etwa 970 Gold, das reicht fuer Stufe 8 auf beiden Schadens-Spuren;
Stufe 10 auf beiden braucht 1396 Gold, also einige Wiederholungen (auch Niederlagen bringen die Haelfte). Bis Level 40 reicht das Gold
(6054) fuer Stufe 14 auf beiden Schadens-Spuren. Die Annahme ist also leicht optimistisch, deshalb prueft ein Test auch die Spielerin
mit Stufe 8 bei Level 21 und Stufe 14 bei Level 40 (Level 40: Druck mit Upgrades 0,94, erlaubt hoechstens 1,25).

| Level | `hp` | `coin` = `xp` | `contact` | Gold je Level | Gold Level 0 bis hier | Stufe (Annahme) / Druck mit Upgrades | Schritt Druck |
|---|---|---|---|---|---|---|---|
| 20 | 0,770 | 0,770 | 0,770 | 90 | 967 | - | +1,8 % |
| 21 | 0,806 | 1,200 | 0,770 | 102 | 1069 | 10,0 / 0,33 | +9,2 % |
| 22 | 0,850 | 1,250 | 0,780 | 107 | 1176 | 10,3 / 0,35 | +8,4 % |
| 23 | 0,917 | 1,300 | 0,790 | 113 | 1289 | 10,5 / 0,37 | +7,4 % |
| 24 | 0,984 | 1,350 | 0,800 | 195 | 1484 | 10,8 / 0,39 | +7,6 % |
| 25 | 1,043 | 1,400 | 0,811 | 205 | 1689 | 11,1 / 0,40 | +6,7 % |
| 26 | 1,054 | 1,450 | 0,821 | 160 | 1849 | 11,3 / 0,43 | +9,5 % |
| 27 | 1,122 | 1,500 | 0,831 | 168 | 2017 | 11,6 / 0,45 | +7,2 % |
| 28 | 1,191 | 1,550 | 0,841 | 175 | 2192 | 11,8 / 0,47 | +7,6 % |
| 29 | 1,279 | 1,600 | 0,851 | 302 | 2494 | 12,1 / 0,49 | +7,1 % |
| 30 | 1,344 | 1,650 | 0,861 | 315 | 2809 | 12,4 / 0,52 | +7,8 % |
| 31 | 1,385 | 1,700 | 0,871 | 200 | 3009 | 12,6 / 0,55 | +9,4 % |
| 32 | 1,472 | 1,750 | 0,881 | 208 | 3217 | 12,9 / 0,58 | +7,4 % |
| 33 | 1,563 | 1,800 | 0,892 | 217 | 3434 | 13,2 / 0,61 | +7,7 % |
| 34 | 1,663 | 1,850 | 0,902 | 225 | 3659 | 13,4 / 0,64 | +7,4 % |
| 35 | 1,772 | 1,900 | 0,912 | 233 | 3893 | 13,7 / 0,67 | +7,3 % |
| 36 | 1,891 | 1,950 | 0,922 | 402 | 4295 | 13,9 / 0,71 | +7,6 % |
| 37 | 2,022 | 2,000 | 0,932 | 417 | 4711 | 14,2 / 0,74 | +7,4 % |
| 38 | 2,147 | 2,050 | 0,942 | 432 | 5143 | 14,5 / 0,78 | +7,4 % |
| 39 | 2,272 | 2,100 | 0,952 | 448 | 5591 | 14,7 / 0,82 | +7,5 % |
| 40 | 2,422 | 2,150 | 0,963 | 463 | 6054 | 15,0 / 0,87 | +7,4 % |

Lesart: Mit den angenommenen Upgrades beginnt die Wueste leicht (0,33) und wird stetig fordernder, Level 40 liegt bei 0,87
(Level 20 ohne Upgrades: 1,22). Der Schaden ohne Abschuss steigt ab Level 21 langsamer als vorher, weil der Kontaktschaden nur
mit den Leben der Spielerin waechst. Er ist wie bisher nur zum Vergleich innerhalb eines Batches gedacht.
Nachjustieren: Druck ueber `hp` in `scaling.ts` (die Tests pruefen Schritte und Spruenge), Gold ueber `coin`.

## Upgrades Stufe 11 bis 15 (AP-105, PE-129)

Die Preise folgen weiter `round(10 x 1,4^k)`, die Wirkung je Stufe bleibt (+10 % Feuerrate bzw. Schaden, +10 Leben, +15 Grad/s).

| Stufe | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|
| Preis (Gold) | 289 | 405 | 567 | 794 | 1111 |
| Summe ab Stufe 0 | 987 | 1392 | 1959 | 2753 | 3864 |
| Wirkung Feuerrate / Schaden | +110 % | +120 % | +130 % | +140 % | +150 % |
| Wirkung Leben / Drehtempo | +110 / +165 | +120 / +180 | +130 / +195 | +140 / +210 | +150 / +225 |

Eine Spur auf Stufe 15 kostet 3864 Gold. Mit dem Gold aller gewonnenen Level ist das nach Level 35 erreicht (3893 Gold; Test: nach
Level 33 noch nicht, nach Level 36 sicher). Stufe 15 auf allen vier Spuren (15456 Gold) ist bis Level 40 nicht vorgesehen.

## Nachjustieren: Beispiele

- Level 0 zu schwer: in `scaling.ts` `hp` von Level 0 senken oder in `levels.ts` `SPAWN_INTERVAL_MS[0]` erhoehen (hoechstens 1500, groesste Luecke); Druck-Untergrenze 0,45 beachten.
- Rundenstart zu hektisch oder zu leer: `OPENING_RADIUS_FACTOR` (Abstand der Eroeffnungswelle, 0,65) oder den Anteil in `openingCount` (15 %, 3 bis 8) in `spawn.ts` aendern.
  Dann stimmt eventuell der Abstand zu Level 1 nicht mehr, der Test sagt es dir.
- Items zu stark: `perStack` oder `maxStacks` in `items.ts` senken, bei Dauerfeuer `durationMs`.
- Mehr Items: `dropChance` in `items.ts` erhoehen.
- Handtest-Ziel (M2-DEP): Level 0 gut schaffbar, Level 20 nur mit Items.
