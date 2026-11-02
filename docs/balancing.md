# Balancing: Schwierigkeit einstellen

Alle Spielwerte stehen als Zahlen in `src/config/`. Du aenderst nur diese Zahlen, nie die Logik.
Nach jeder Aenderung `npm test` laufen lassen: `tests/logic/balance.test.ts` meldet, wenn die
Schwierigkeit nicht mehr stetig steigt.

## Was bewirkt welcher Wert?

| Wert | Datei | Wirkung |
|---|---|---|
| `ENEMY_COUNT_FACTOR` (Liste) | `levels.ts` | Gegnerzahl-Faktor je Level seit AP-127 (1,5 bis 2,5): teilt den Spawn-Abstand und vervielfacht `MAX_ENEMIES`, `xp` und `coin` werden durch ihn geteilt. |
| `BASE_SPAWN_INTERVAL_MS` (Liste, ein Eintrag pro Level) | `levels.ts` | Wartezeit zwischen zwei neuen Gegnern in Millisekunden vor AP-127, im Spiel durch den Faktor geteilt (mindestens `MIN_SPAWN_INTERVAL_MS` 150). **Kleiner = mehr Gegner = schwerer.** Im Lauf der Runde sinkt sie auf 60 %. |
| `BASE_MAX_ENEMIES` (Liste), `MAX_ENEMIES_CAP` | `levels.ts` | Wie viele Gegner gleichzeitig leben duerfen: Wert vor AP-127 mal Faktor, hoechstens `MAX_ENEMIES_CAP` (250 seit AP-127, vorher 150). Bremst, wenn die Astronautin nicht mitkommt. Bei Ruckeln senken. |
| `CAP_HP_BONUS` | `scaling.ts` | HP-Aufschlag, wo `MAX_ENEMIES_CAP` greift (wird berechnet, nicht von Hand setzen). |
| `TIER_RULES` | `tiers.ts` | Gegnerstufen (AP-128): HP und Schaden je Level-Index im Batch. |
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
  Seit AP-127 zaehlt der Stufen-Faktor der Gegner (`tierFor`) mit, und die Gegnerzahl wird um die Obergrenze gekuerzt (siehe Abschnitt M7).
- **Skalierung (AP-91)**: `LEVEL_SCALING` in `scaling.ts` mit den Faktoren `hp`, `xp`, `coin`, `contact` je Level. Die Kennzahlen rechnen sie ein (Lebenspunkte gerundet wie im Spiel).
- **Schaden ohne Abschuss/Min**: Schaden pro Minute an der Astronautin, wenn sie gar nichts trifft und
  alle Gegner ungestoert ankommen. Sie ist nur zum Vergleichen der Level gedacht (die Zahl waechst mit
  der Rundendauer, daher sind 5-Minuten-Level hoeher). Annahme: Gegner starten 380 px vom Zentrum.
  Gift (Schlange) und Wickel (Mumie) zaehlen hier als zusaetzlicher Schaden (AP-105). Seit AP-113 treffen Verfolger, Ansturm und Eingraben nur einmal (0,5 s Kontaktschaden), siehe „Spawn-Gewichte ... (AP-113)“; die Zahlen der Tabelle sind deshalb viel kleiner als vor AP-113 und nur untereinander vergleichbar.

## Tabelle aller Level

**Stand bis AP-127** (ohne Gegnerstufe). Die Werte ab AP-127 stehen in „M7: mehr Gegner und Gegnerstufen (AP-127)“.

| Level | Batch | Minuten | Spawn-Abstand (ms) | Max. Gegner | Spawns/Min | Gegner-HP/Min | Druck | Schaden ohne Abschuss/Min |
|---|---|---|---|---|---|---|---|---|
| 0 | forest | 3 | 1500 | 25 | 52 | 1229 | 0,51 | 216 |
| 1 | forest | 3 | 1450 | 28 | 54 | 1338 | 0,56 | 238 |
| 2 | forest | 3 | 1400 | 31 | 56 | 1507 | 0,63 | 256 |
| 3 | forest | 5 | 1360 | 34 | 57 | 1663 | 0,69 | 307 |
| 4 | forest | 5 | 1330 | 37 | 59 | 1889 | 0,79 | 341 |
| 5 | forestNight | 3 | 870 | 52 | 90 | 2066 | 0,86 | 2258 |
| 6 | forestNight | 3 | 840 | 55 | 94 | 2132 | 0,89 | 2372 |
| 7 | forestNight | 3 | 810 | 57 | 97 | 2174 | 0,91 | 2460 |
| 8 | forestNight | 5 | 770 | 60 | 101 | 2264 | 0,94 | 2782 |
| 9 | forestNight | 5 | 740 | 62 | 105 | 2354 | 0,98 | 2880 |
| 10 | elfForest | 3 | 615 | 78 | 127 | 2560 | 1,07 | 9768 |
| 11 | elfForest | 3 | 610 | 83 | 128 | 2580 | 1,08 | 10284 |
| 12 | elfForest | 3 | 600 | 88 | 130 | 2621 | 1,09 | 10812 |
| 13 | elfForest | 3 | 590 | 94 | 132 | 2668 | 1,11 | 11431 |
| 14 | elfForest | 3 | 585 | 99 | 133 | 2688 | 1,12 | 11927 |
| 15 | elfForest | 3 | 575 | 104 | 136 | 2735 | 1,14 | 12440 |
| 16 | elfForest | 5 | 560 | 109 | 138 | 2786 | 1,16 | 14241 |
| 17 | elfForest | 5 | 555 | 114 | 140 | 2814 | 1,17 | 14816 |
| 18 | elfForest | 5 | 545 | 120 | 142 | 2862 | 1,19 | 15519 |
| 19 | elfForest | 5 | 540 | 125 | 143 | 2891 | 1,20 | 16088 |
| 20 | elfForest | 5 | 530 | 130 | 146 | 2943 | 1,23 | 16678 |
| 21 | desert | 3 | 525 | 131 | 148 | 3193 | 1,33 | 4386 |
| 22 | desert | 3 | 520 | 132 | 150 | 3462 | 1,44 | 4431 |
| 23 | desert | 3 | 515 | 133 | 151 | 3718 | 1,55 | 4477 |
| 24 | desert | 5 | 510 | 134 | 152 | 4001 | 1,67 | 4989 |
| 25 | desert | 5 | 505 | 135 | 153 | 4270 | 1,78 | 5039 |
| 26 | pyramids | 3 | 500 | 136 | 156 | 4675 | 1,95 | 12638 |
| 27 | pyramids | 3 | 495 | 137 | 157 | 5010 | 2,09 | 12748 |
| 28 | pyramids | 3 | 490 | 138 | 159 | 5388 | 2,25 | 12858 |
| 29 | pyramids | 5 | 485 | 139 | 159 | 5769 | 2,40 | 14582 |
| 30 | pyramids | 5 | 480 | 140 | 161 | 6217 | 2,59 | 14702 |
| 31 | oasis | 3 | 475 | 141 | 164 | 6801 | 2,83 | 13326 |
| 32 | oasis | 3 | 470 | 142 | 165 | 7301 | 3,04 | 13441 |
| 33 | oasis | 3 | 465 | 143 | 167 | 7865 | 3,28 | 13557 |
| 34 | oasis | 3 | 460 | 144 | 169 | 8449 | 3,52 | 13674 |
| 35 | oasis | 3 | 455 | 145 | 171 | 9069 | 3,78 | 13791 |
| 36 | oasis | 5 | 450 | 146 | 172 | 9755 | 4,06 | 15578 |
| 37 | oasis | 5 | 445 | 147 | 174 | 10477 | 4,37 | 15706 |
| 38 | oasis | 5 | 440 | 148 | 176 | 11251 | 4,69 | 15834 |
| 39 | oasis | 5 | 435 | 149 | 178 | 12095 | 5,04 | 15963 |
| 40 | oasis | 5 | 430 | 150 | 180 | 12989 | 5,41 | 16093 |

**AP-168 (PE-209):** Die Spalten Spawn-Abstand, Max. Gegner, Spawns/Min, Gegner-HP/Min, Druck und Schaden gelten fuer Level 0 bis 4 mit dem alten Gegnerzahl-Faktor (1,5 / 1,75 / 2 / 2,25 / 2,5) und fuer Level 31 bis 40 mit dem alten `hp` (`M5_HP`); die aktuellen Werte dieser Level stehen in „M7: mehr Gegner und Gegnerstufen (AP-127)“ und „Kurve geglaettet (AP-168)“.

Seit AP-105 mit Wildschwein, Baer und Fee in Level 0 bis 20, Stand nach AP-113. Ab Level 21 ist der Druck gegen die Grundwaffe ohne Upgrades
gerechnet und deshalb deutlich ueber 1: Die Wueste setzt Upgrades voraus (siehe „Level 21 bis 40“).

## Was die Tests sichern

**Stand bis AP-127.** Ab AP-127 sind die Druck-Baender ersetzt (siehe „Was die Tests ab AP-127 sichern“ im Abschnitt M7).
Weiter gelten die Aussagen zu Gold, Upgrades, Spawns/Min, 5-Minuten-Leveln und Items (Dauerfeuer siehe dort).

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
| Gold je gewonnenem Level, Mittel ueber Level 0-20 | etwa 45 (Level 0: etwa 5,8, Level 20: etwa 90,8) | `dropChance` 0,08, `coinValue` 1/1/4/4 |
| Preis Stufe 0 auf 1 / Stufe 9 auf 10 | 10 / 207 Gold | `COST_BASE`, `COST_GROWTH` |
| Eine Upgrade-Spur auf Stufe 10 | 698 Gold, also etwa 15,5 Level im Mittel | Summe der Preise |
| Alle vier Spuren auf Stufe 10 | 2792 Gold (etwa 2 800) | 4 mal 698 |
| Wirkung je Stufe | Feuerrate und Schaden +10 %, Leben +10, Drehtempo +15 Grad/s (additiv aufsummiert, Stufe 10 = +100 % bzw. +100 / +150) | `UPGRADES` |
| Doppelschuss | Stufe 1: zwei Schuesse, Stufe 2: drei Schuesse (2-fach bzw. 3-fach Schaden pro Sekunde, hoechstens 3-fach) | `items.ts`, `maxStacks` 2 |
| Schild | 60 je Stufe, hoechstens 2 Stufen = 120 Puffer (1,2-mal die 100 Leben) | `perStack` 60, `maxStacks` 2 |
| Dauerfeuer | 20 Schuesse/s (5-mal die Grundwaffe) fuer 4 Sekunden | `durationMs` 4000, `RAPID_FIRE_MAX_PER_SEC` |
| Dauerfeuer-Anteil in Level 20 | etwa 20 % der Rundenzeit, Schaden im Mittel etwa 1,8-fach | bei 8 % Item-Drop, 30 von 100 Gewicht |

Boss (PE-76, AP-68): Der Boss erscheint erst in den letzten 30 Sekunden der Runde (vorher 60 s). Beim Boss-Auftritt verschwinden alle normalen Gegner, und im Boss-Kampf spawnt kein normaler Gegner nach, solange der Boss lebt (PE-137, Q-58). Wird der Boss besiegt, endet die Runde sofort mit Sieg.

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
- **Boss-Fairness:** `BOSS_SPAWN_RATE_FACTOR` und die Boss-Konfiguration blieben in AP-95 unveraendert (seit AP-126 haben die Bosse doppelte Basis-HP, PE-154); im Boss-Kampf spawnen keine normalen Gegner mehr (PE-137, Q-58); `BOSS_SPAWN_RATE_FACTOR` ist im Spiel gegenstandslos.

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
| Wildschwein `boar` | Wald, Wald bei Nacht | 75 | 30 | 10 | 7 / 1 | Ansturm (800 ms Ankuendigung) | x1,23 | Einmaltreffer 5 |
| Baer `bear` | Wald, Wald bei Nacht | 75 | 36 | 12 | 7 / 1 | Tank, mittel schnell | x1 | Einmaltreffer 6 |
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

## Spawn-Gewichte Wildschwein, Baer, Fee und Balancing neu (AP-113, PE-136)

Nach dem Handtest M5 sollen Wildschwein, Baer und Fee in Level 0 bis 20 deutlich haeufiger kommen (Q-56). Druck, Gold und
Erfahrung bleiben in den Baendern von `tests/logic/balance.test.ts` (Toleranz 4 %, Schritt hoechstens +10 % je Level,
`MAX_ENEMIES` hoechstens 150, alles bis AP-127). Die Baender sind nicht veraendert.

**Neue Gewichte** (Anteil am Pool, vorher in Klammern):

| Batch | Gewichte | Anteile |
|---|---|---|
| Wald (0 bis 4) | Baum 178, Wildschwein 11, Baer 11 (Summe 200) | je 5,5 % (2,4 %) |
| Wald bei Nacht (5 bis 9) | Baum 120, Hexe 60, Eichhoernchen 96, Wildschwein 17, Baer 17, Fee 35 (Summe 345) | Wildschwein, Baer je 4,9 % (0,7 %), Fee 10,1 % (4,1 %) |
| Elfenwald (10 bis 20) | Baum 80, Hexe 40, Eichhoernchen 64, Waldgeist 32, Fee 12 (Summe 228) | Fee 5,3 % (0,9 %) |

Ziel waren 7 % (Wald), 5 % / 10 % (Wald bei Nacht) und 5 % (Elfenwald). Im Wald liegt der Anteil 1,5 Prozentpunkte darunter
(Abweichung erlaubt, Plan AP-113): Im Wald gibt es keinen leichten Gegner, und der Baum darf nicht unter 22 bis 30 HP (AP-91). Bei 7 % waeren
die Druck-Abweichungen gegen die Referenz ueber 4 % gewesen. Alle Anteile sind mindestens doppelt so hoch wie vorher. Die alten Gegner behalten ihr Verhaeltnis
untereinander. Level 21 bis 40 haben diese Gegner nicht im Pool und bleiben in den Gewichten unveraendert.

**Stellschrauben** (in der Reihenfolge des Plans):

- **`hp` in `scaling.ts`:** Level 5 bis 9: 0,714 / 0,71 / 0,70 / 0,70 / 0,70 (vorher 0,77), Level 10 bis 20: 0,81 (vorher 0,77, die Fee senkt dort
  den Druck). Level 0 bis 4 bleiben (der Baum behaelt 22 / 23 / 25 / 27 / 30 HP). Level 21 (0,806) liegt jetzt knapp unter Level 20 (0,81),
  die Druck-Kurve steigt trotzdem (Sprung 20 zu 21 +8,5 %).
- **Basis-HP in `enemies.ts`:** Wildschwein 80 auf 75, Baer 90 auf 75 (genau das 1,5-Fache des Baums, Tanks bleiben Tanks).
- **`xp` und `coin`:** gleichen die neue Mischung aus (der Baum bringt 5 XP, Wildschwein und Baer 7). Level 0 bis 4 getrennt (xp 0,443 / 0,467 / 0,49 / 0,546 / 0,595,
  coin unveraendert), Level 5 bis 20 gleich (0,777 bis 0,783).
- **`SPAWN_INTERVAL_MS` und `MAX_ENEMIES`:** unveraendert (Level 0 steht schon auf der Obergrenze 1,5 s).

**Kontakt-Treffer-Modell (wegen AP-112):** Verfolger, Ansturm und Eingraben treffen einmal mit `contactDamage` x `CONTACT_HIT_SECONDS`
(0,5 s) x `contact` und verschwinden. Der Test rechnet `freeRunDamagePerMin` jetzt so: ein Treffer je Gegner, der die Spielerin vor
Rundenende erreicht (Ankunftszeit aus 380 px Anlauf und Tempo), Gift der Schlange einmalig `dps` x Dauer. Treffer-Gegner zaehlen nicht gegen `MAX_ENEMIES`
(sie verschwinden), Aura und Schuetzen bleiben pro Sekunde. Der Druck (HP/s durch Basis-DPS) haengt nicht am Kontakt.

**Ausgleich des Kontaktschadens (Annahme, Q-56):** Bisher richtete ein Kontakt-Gegner im Mittel etwa 1,0 s Kontaktschaden an (Annahme: die Spielerin schiesst
ihn in etwa 1 s ab). Neu sind es 0,5 s. Damit der Druck gleich bleibt, ist `contact` in allen Leveln mit `CONTACT_COMPENSATION = 2`
multipliziert (Level 0 bis 4: 0,92 / 0,98 / 1,02 / 1,14 / 1,24, Level 5 bis 20: 1,54, Level 21 bis 40: 1,54 bis 1,925). Ein Einzeltreffer des
staerksten Kontakt-Gegners eines Levels bleibt unter 15 % der angenommenen Spielerin-HP (hoechstens 11,6 von 100 in Level 0 bis 20, Test). Die Verhaeltnis-Tests
zum Kontaktschaden (Level 0 bis 4: 5 %, Level 5 bis 20: 4 %) gelten mit Referenz mal 2, mit gleicher Toleranz.

**Ergebnis** (Test, Toleranzen gleich):

| Kennzahl | vorher (AP-105) | nachher |
|---|---|---|
| Druck Level 0 / 4 / 5 / 9 / 10 / 20 | 0,50 / 0,76 / 0,84 / 0,97 / 1,06 / 1,22 | 0,51 / 0,79 / 0,86 / 0,98 / 1,07 / 1,23 |
| Druck gegen Referenz (Tabelle nach AP-95) | -1 % bis +1 % | Level 0 bis 4: +2,4 bis +3,5 %, Level 5 bis 20: -0,5 bis +2,5 % (Band 4 %) |
| Sprung Level 4 zu 5 / 9 zu 10 / 20 zu 21 | +9,5 % / +9,1 % / +9,2 % | +9,4 % / +8,8 % / +8,5 % |
| Gold-Mittel Level 0 bis 20 | 46,1 | 46,3 (Band 43 bis 47) |
| Gold und Erfahrung je Level | Referenz | gleich, Abweichung hoechstens 4 % gegen die alte Pool-Mischung und die alte Skala |

Die Gold- und Erfahrungs-Tests mit „vorher“-Zaehlung (AP-95) rechnen jetzt gegen die alte Pool-Mischung (`POOL_BEFORE_M5`) und die alten
`xp`/`coin`-Werte (`XP_BEFORE_AP113`), nicht mehr gegen die nackte Gegnerzahl; Toleranz bleibt 4 %.

## Level 21 bis 40 (AP-105, PE-129)

Ziel: Die Kurve laeuft weiter, staerker werden die Gegner selbst, nicht ihre Zahl. `MAX_ENEMIES` hoechstens 150 (Leistung am iPhone, RI-6).
Zahlen in diesem Abschnitt: **Stand bis AP-127** (seit AP-127 2,5-mal so viele Gegner, Obergrenze 250, siehe Abschnitt M7).

- **Spawn-Abstand:** 525 ms (Level 21) bis 430 ms (Level 40), 5 ms je Level. Spawns/Min steigen nur von 146 (Level 20) auf 180 (+23 %).
- **`MAX_ENEMIES`:** 131 bis 150, +1 je Level (Bremse, Obergrenze 150 in Level 40).
- **Pools:** Die Gewichte halten die wirksamen mittleren HP der drei Batches nahe beieinander, Tanks sind selten:
  Wueste Sandwurm 10, Armadillo 2, Kamel 4, Schlange 10; Pyramiden Mumie 3, Sandwurm 14, Archaeologe 8, Sphinx 1;
  Oase Mumie 4, Schlange 14, Archaeologe 6, Sphinx 2.
- **`hp`:** 0,806 (Level 21) bis 1,344 (Level 30); **Level 31 bis 40 seit AP-168 (PE-209) fallend von 1,250 auf 1,093** (vorher bis 2,422, siehe „Kurve geglaettet (AP-168)“). Bis Level 30 so gewaehlt, dass der Druck je Level um etwa +7,5 % steigt und an den
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
| 31 | 1,250 | 1,700 | 0,871 | 200 | 3009 | 12,6 / 0,55 | +9,4 % |
| 32 | 1,209 | 1,750 | 0,881 | 208 | 3217 | 12,9 / 0,58 | +7,4 % |
| 33 | 1,186 | 1,800 | 0,892 | 217 | 3434 | 13,2 / 0,61 | +7,7 % |
| 34 | 1,156 | 1,850 | 0,902 | 225 | 3659 | 13,4 / 0,64 | +7,4 % |
| 35 | 1,138 | 1,900 | 0,912 | 233 | 3893 | 13,7 / 0,67 | +7,3 % |
| 36 | 1,122 | 1,950 | 0,922 | 402 | 4295 | 13,9 / 0,71 | +7,6 % |
| 37 | 1,112 | 2,000 | 0,932 | 417 | 4711 | 14,2 / 0,74 | +7,4 % |
| 38 | 1,106 | 2,050 | 0,942 | 432 | 5143 | 14,5 / 0,78 | +7,4 % |
| 39 | 1,098 | 2,100 | 0,952 | 448 | 5591 | 14,7 / 0,82 | +7,5 % |
| 40 | 1,093 | 2,150 | 0,963 | 463 | 6054 | 15,0 / 0,87 | +7,4 % |

Seit AP-168 gilt fuer Level 31 bis 40 die Spalte `hp` neu; die Spalten „Stufe (Annahme) / Druck mit Upgrades“ und „Schritt Druck“ dieser zehn Zeilen zeigen den Stand **vor AP-168** (aktuelle Werte: Abschnitt M7, Spalte „Druck mit Upgrades“, und „Kurve geglaettet (AP-168)“).

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

## M7: mehr Gegner und Gegnerstufen (AP-127)

Ziel (F-25, PE-152, PE-153): etwa 2,5-mal so viele Gegner bei gleichen HP je Gegner, Obergrenze 250 gleichzeitig,
Gold und Erfahrung je Runde wie bisher (PE-163, Q-64 Option a). Dazu kommen die Gegnerstufen aus AP-128 (PE-161):
je Level-Index im Batch (Stufe) +8 % HP und +5 % Schaden, ohne Deckel (`TIER_RULES` in `tiers.ts`). Die Stufe steht
**nicht** in `LEVEL_SCALING`: `enemyScaleFor` (`logic/scaling.ts`) multipliziert `hp` und `contact` mit ihr.
Level 20 hat Stufe 10 (+80 % HP), Level 40 Stufe 9 (+72 % HP).

**Stellschrauben:**

- **Gegnerzahl-Faktor** `ENEMY_COUNT_FACTOR` (`levels.ts`): Level 0 1,5, Level 1 1,64, Level 2 1,72, Level 3 1,94, Level 4 2,15, ab Level 5 2,5 (seit AP-168; bei AP-127 waren es 1,5 / 1,75 / 2,0 / 2,25 / 2,5 ab Level 4).
- **Spawn-Abstand:** bisheriger Wert durch den Faktor, auf ganze ms gerundet (Level 0: 1500 auf 1000 ms, Level 40: 430 auf 172 ms).
  Untergrenze `MIN_SPAWN_INTERVAL_MS = 150`: Am Rundenende sinkt der Abstand auf 60 % (90 ms, gut 5 Frames bei 60 fps),
  mehr als ein Gegner je 5 Frames bringt am iPhone nichts ausser Last. Sie greift heute nirgends (kleinster Wert 172 ms).
- **`MAX_ENEMIES`:** bisheriger Wert mal Faktor (`MAX_ENEMIES_WANTED`), hoechstens `MAX_ENEMIES_CAP = 250` (ersetzt 150 aus RI-6).
  Die Obergrenze greift ab Level 15 (gewuenscht 260) bis Level 40 (gewuenscht 375).
- **HP-Aufschlag** `CAP_HP_BONUS` (`scaling.ts`): gewuenscht durch moeglich, also `MAX_ENEMIES_WANTED / 250`, mindestens 1
  (Level 15: 1,04, Level 20: 1,30, Level 40: 1,50). Annahme: Die Obergrenze bremst die Gegnerzahl im selben Verhaeltnis
  (von 375 gewuenschten Gegnern leben hoechstens 250, also kommen nur zwei Drittel). Der Aufschlag macht jeden Gegner im
  selben Verhaeltnis zaeher, der Druck erreicht so trotzdem das 2,5-Fache. Rechnung: Druck = Gegner pro Minute x (250 / gewuenscht)
  x mittlere HP x Aufschlag x Stufe = 2,5 x alter Druck x Stufe.
- **`xp` und `coin`:** Wert vor AP-127 durch den **wirksamen** Faktor (Faktor durch Aufschlag). Ohne Obergrenze ist das genau
  der Faktor (Level 0 bis 14). Wo die Obergrenze greift, kommen weniger, dafuer zaehere Gegner, und jeder bringt im selben
  Verhaeltnis mehr. Gold und Erfahrung je Runde bleiben dadurch gleich (Test: Band ±10 %, Ist -1,6 % bis +0,4 %).
- **`hp` und `contact` je Gegner** bleiben (bewusst mehr Druck, PE-152); nur der Aufschlag kommt ab Level 15 auf `hp`.
- **Item- und Ruestungs-Drops (AP-146, PE-182):** werden je besiegtem Gegner gewuerfelt und wuerden mit der Gegnerzahl wachsen. `ITEM_DROP_FACTOR` (`scaling.ts`, = `CAP_HP_BONUS / ENEMY_COUNT_FACTOR`, derselbe Faktor wie bei `xp` und `coin`) teilt `dropChance` durch den wirksamen Faktor (`scaledDropRate` in `items.ts`), Items und Ruestung je Runde bleiben auf dem Stand vor AP-127 (Dauerfeuer in Level 20 wieder etwa 23 %).

**Druck** (Test, `tests/logic/balance.test.ts`): Gegner pro Minute (nach der Obergrenze) x mittlere wirksame HP x Stufen-Faktor
durch die Grundwaffe (40 pro Sekunde). Geschoss- und Aura-Schaden wachsen erst mit AP-134 mit der Stufe (V-24), der Druck rechnet
weiter nur HP und Kontakt.

| Level | Faktor | Spawn-Abstand (ms) | Max. Gegner (gewuenscht) | HP-Aufschlag | Stufe | Druck alt / neu | neu / alt | Gold je Runde alt / neu | Druck mit Upgrades (Annahme AP-105) |
|---|---|---|---|---|---|---|---|---|---|
| 0 | 1,5 | 1000 | 38 (38) | 1,00 | 0 | 0,51 / 0,76 | x1,49 | 5,8 / 5,8 | - |
| 1 | 1,64 | 884 | 46 (46) | 1,00 | 1 | 0,56 / 0,96 | x1,71 | 6,3 / 6,3 | - |
| 2 | 1,72 | 814 | 53 (53) | 1,00 | 2 | 0,63 / 1,21 | x1,92 | 6,9 / 6,9 | - |
| 3 | 1,94 | 701 | 66 (66) | 1,00 | 3 | 0,69 / 1,54 | x2,23 | 13,0 / 13,0 | - |
| 4 | 2,15 | 619 | 80 (80) | 1,00 | 4 | 0,79 / 2,02 | x2,56 | 14,6 / 14,5 | - |
| 5 | 2,5 | 348 | 130 (130) | 1,00 | 0 | 0,86 / 2,12 | x2,46 | 27,5 / 27,1 | - |
| 6 | 2,5 | 336 | 138 (138) | 1,00 | 1 | 0,89 / 2,32 | x2,61 | 28,4 / 28,0 | - |
| 7 | 2,5 | 324 | 143 (143) | 1,00 | 2 | 0,91 / 2,56 | x2,83 | 29,6 / 29,2 | - |
| 8 | 2,5 | 308 | 150 (150) | 1,00 | 3 | 0,94 / 2,85 | x3,02 | 51,1 / 50,7 | - |
| 9 | 2,5 | 296 | 155 (155) | 1,00 | 4 | 0,98 / 3,16 | x3,22 | 53,2 / 52,8 | - |
| 10 | 2,5 | 246 | 195 (195) | 1,00 | 0 | 1,07 / 2,64 | x2,47 | 47,6 / 47,1 | - |
| 11 | 2,5 | 244 | 208 (208) | 1,00 | 1 | 1,08 / 2,87 | x2,67 | 48,1 / 47,6 | - |
| 12 | 2,5 | 240 | 220 (220) | 1,00 | 2 | 1,09 / 3,16 | x2,89 | 48,7 / 48,2 | - |
| 13 | 2,5 | 236 | 235 (235) | 1,00 | 3 | 1,11 / 3,39 | x3,05 | 49,4 / 48,8 | - |
| 14 | 2,5 | 234 | 248 (248) | 1,00 | 4 | 1,12 / 3,65 | x3,26 | 50,0 / 49,5 | - |
| 15 | 2,5 | 230 | 250 (260) | 1,04 | 5 | 1,14 / 3,95 | x3,47 | 50,7 / 50,1 | - |
| 16 | 2,5 | 224 | 250 (273) | 1,09 | 6 | 1,16 / 4,23 | x3,64 | 85,9 / 85,4 | - |
| 17 | 2,5 | 222 | 250 (285) | 1,14 | 7 | 1,17 / 4,56 | x3,89 | 87,0 / 86,4 | - |
| 18 | 2,5 | 218 | 250 (300) | 1,20 | 8 | 1,19 / 4,89 | x4,10 | 88,3 / 87,8 | - |
| 19 | 2,5 | 216 | 250 (313) | 1,25 | 9 | 1,20 / 5,14 | x4,27 | 89,6 / 89,0 | - |
| 20 | 2,5 | 212 | 250 (325) | 1,30 | 10 | 1,23 / 5,50 | x4,48 | 90,8 / 90,2 | - |
| 21 | 2,5 | 210 | 250 (328) | 1,31 | 0 | 1,33 / 3,31 | x2,49 | 101,9 / 100,9 | 0,83 |
| 22 | 2,5 | 208 | 250 (330) | 1,32 | 1 | 1,44 / 3,74 | x2,60 | 107,1 / 106,1 | 0,91 |
| 23 | 2,5 | 206 | 250 (333) | 1,33 | 2 | 1,55 / 4,43 | x2,86 | 112,6 / 111,4 | 1,05 |
| 24 | 2,5 | 204 | 250 (335) | 1,34 | 3 | 1,67 / 5,08 | x3,05 | 195,2 / 194,2 | 1,18 |
| 25 | 2,5 | 202 | 250 (338) | 1,35 | 4 | 1,78 / 5,86 | x3,29 | 204,6 / 203,4 | 1,32 |
| 26 | 2,5 | 200 | 250 (340) | 1,36 | 0 | 1,95 / 4,83 | x2,48 | 160,4 / 159,0 | 1,06 |
| 27 | 2,5 | 198 | 250 (343) | 1,37 | 1 | 2,09 / 5,60 | x2,68 | 167,7 / 166,0 | 1,20 |
| 28 | 2,5 | 196 | 250 (345) | 1,38 | 2 | 2,25 / 6,47 | x2,88 | 174,8 / 173,3 | 1,36 |
| 29 | 2,5 | 194 | 250 (348) | 1,39 | 3 | 2,40 / 7,41 | x3,08 | 302,1 / 300,5 | 1,52 |
| 30 | 2,5 | 192 | 250 (350) | 1,40 | 4 | 2,59 / 8,45 | x3,26 | 314,7 / 313,2 | 1,69 |
| 31 | 2,5 | 190 | 250 (353) | 1,41 | 0 | 2,83 / 6,34 | x2,24 | 200,3 / 198,6 | 1,24 |
| 32 | 2,5 | 188 | 250 (355) | 1,42 | 1 | 3,04 / 6,70 | x2,20 | 208,3 / 206,6 | 1,28 |
| 33 | 2,5 | 186 | 250 (358) | 1,43 | 2 | 3,28 / 7,12 | x2,17 | 216,9 / 214,8 | 1,33 |
| 34 | 2,5 | 184 | 250 (360) | 1,44 | 3 | 3,52 / 7,51 | x2,13 | 225,1 / 223,2 | 1,37 |
| 35 | 2,5 | 182 | 250 (363) | 1,45 | 4 | 3,78 / 7,95 | x2,10 | 233,5 / 231,6 | 1,42 |
| 36 | 2,5 | 180 | 250 (365) | 1,46 | 5 | 4,06 / 8,38 | x2,06 | 402,0 / 399,9 | 1,46 |
| 37 | 2,5 | 178 | 250 (368) | 1,47 | 6 | 4,37 / 8,84 | x2,02 | 416,6 / 414,7 | 1,51 |
| 38 | 2,5 | 176 | 250 (370) | 1,48 | 7 | 4,69 / 9,43 | x2,01 | 432,0 / 429,8 | 1,57 |
| 39 | 2,5 | 174 | 250 (373) | 1,49 | 8 | 5,04 / 9,93 | x1,97 | 447,6 / 445,3 | 1,62 |
| 40 | 2,5 | 172 | 250 (375) | 1,50 | 9 | 5,41 / 10,46 | x1,93 | 463,4 / 461,3 | 1,67 |

Seit AP-168 (PE-209, RS-05.2) gilt fuer Level 1 bis 4 der flachere Faktor und im Wald +5 % statt +8 % HP je Stufe, fuer Level 31 bis 40 das fallende `hp` (die Stufe traegt den Anstieg); „Druck neu“ und „Druck mit Upgrades“ sind fuer diese Level neu gerechnet. „Druck alt“ ist der Stand vor AP-127 (ohne Stufe, Tabelle „Tabelle aller Level“). „neu / alt“ ist Faktor mal Stufe
(kleine Abweichungen durch gerundete HP und die groessere Eroeffnungswelle). Gold-Mittel Level 0 bis 20: 45,9 (Band 43 bis 47).

**Lesart und Folgen (RI-30, Feinjustierung nach H-34):**

- Level 0 ist mit Druck 0,77 weiter mit der Grundwaffe zu schaffen. Ab Level 1 liegt der Druck ueber 1, ab Level 4 bei 2,0 bis 10,5 (vor AP-168 bis 23,2):
  Doppelschuss und Upgrades werden frueh noetig. Level 20 braucht 220 HP pro Sekunde (vorher 49), das ist mehr als Doppelschuss
  Stufe 2 ohne Upgrades (120) und knapp unter Doppelschuss Stufe 2 mit Upgrade-Stufe 10 auf beiden Schadens-Spuren (480, bei halber Trefferquote 240).
- Level 21 bis 40 mit den angenommenen Upgrades (Stufe 10 bei Level 21 bis 15 bei Level 40): Druck 0,83 bis 1,69 (vorher 0,33 bis 0,87; vor AP-168 bis 3,71).
  Seit AP-168 steigt der Druck in Level 31 bis 40 nur noch von 1,24 auf 1,67.
  Die frueheren Fairness-Baender (Level 40 mit Upgrades 0,8 bis 1,25) sind nicht mehr im Test.
- Innerhalb eines Batches steigt der Druck je Level um 5 bis 18 %. An jeder Batch-Grenze faellt er (die Stufe beginnt wieder bei 0),
  jeder Batch beginnt aber hoeher als der vorige. In Level 1 bis 4 steigt zusaetzlich der Faktor (seit AP-168 +5 bis +13 % je Level, vorher +11 bis +17 %);
  der Referenz-Druck steigt dort um 1,21 je Schritt (Abschnitt „Kurve geglaettet (AP-168)“).
- Item-Drops haengen an der Zahl besiegter Gegner (`ITEM_RULES.dropChance` in `items.ts`, nicht Teil von AP-127). Mit mehr Gegnern
  kommen auch mehr Items: Dauerfeuer in Level 20 etwa 45 % der Rundenzeit (vorher 23 %), Schaden im Mittel etwa 2,8-fach (vorher 1,9-fach).
- Ein Einzeltreffer des staerksten Kontakt-Gegners liegt mit dem Level-Faktor weiter unter 15 % der Spielerin-HP; die Stufe kommt
  ohne Deckel dazu (PE-161), in Level 20 (Stufe 10, +50 % Schaden) sind es bis zu 17,3 von 100.
- **Bei Ruckeln `MAX_ENEMIES` senken:** `MAX_ENEMIES_CAP` in `levels.ts` kleiner setzen (RI-28). Der HP-Aufschlag und `xp`/`coin`
  passen sich von selbst an, Druck sowie Gold und Erfahrung je Runde bleiben gleich, nur kommen weniger, dafuer zaehere Gegner.

**Was die Tests ab AP-127 sichern** (die alten Baender „Druck je Level gleich“, ±4 % und `MAX_ENEMIES` hoechstens 150 sind ersetzt):

- Faktor 1,5 / 1,64 / 1,72 / 1,94 / 2,15, ab Level 5 2,5 (AP-168); Spawns pro Minute = Faktor mal vorher (±3 %).
- Druck mindestens 1,4-mal der alte Wert in Level 0 bis 3, 2,3-mal in Level 4 bis 30 und 1,5-mal in Level 31 bis 40 (Stufe eingerechnet; Level 31 bis 40 seit AP-168 geglaettet).
- Druck innerhalb jedes Batches streng steigend, jeder Batch beginnt hoeher als der vorige.
- Schritt zwischen Nachbarleveln hoechstens 1,25; in Level 1 bis 5 gilt die Grenze fuer den Schritt ohne den Anstieg des Faktors.
- `MAX_ENEMIES` hoechstens 250, Abstand mindestens 150 ms, HP-Aufschlag = gewuenscht durch moeglich.
- Gold und Erfahrung je gewonnener Runde im Band ±10 % um den Stand vor AP-127.

## Mischung der Gegner in Level 0 bis 2 (AP-166, PE-207)

Handtest 2026-11-02, Nutzer: „es fehlt die variätat von gegner in den level 0-2 mehr durchmischen von den was verefügbar ist es ist zu langweilig“.

**Befund.** In Level 0 bis 2 sind genau 3 Typen freigeschaltet (Verfluchter Baum, Wildschwein, Bär; Hexe, Eichhörnchen, Fee, Waldgeist erscheinen erst ab Level 5 bzw. 10). Der Pool `forest` (178 / 11 / 11) bestand zu 89 % aus Bäumen, und `SpawnDirector` zog jeden Gegner unabhängig. Gemessen mit 20 Seeds und den ersten 30 s: längste Folge gleicher Typen im Mittel 17 bis 19 (Maximum 36 bis 39), im Mittel nur 2,85 bis 2,9 von 3 Typen sichtbar.

**Hebel 1: Pool nur für Level 0 bis 2** (`POOL_OVERRIDE_LEVELS_0_2` in `levels.ts`, Ausnahme von „der Pool hängt am Batch“, `MIX_LAST_LEVEL` = 2). Level 3 und 4 behalten den Pool `forest`.

| Typ | Anteil vorher | Anteil nachher (Gewicht) |
|---|---|---|
| Verfluchter Baum | 89,0 % | 56 % (112) |
| Wildschwein | 5,5 % | 22 % (44) |
| Bär | 5,5 % | 22 % (44) |

**Hebel 2: Abwechslungsregel in `SpawnDirector.pickEnemy`** (nur Level 0 bis 2, `MAX_RUN`, `FIRST_APPEARANCE_BY` in `spawn.ts`):

- Höchstens **3 gleiche Typen in Folge** (`MAX_RUN` = 3). Gezogen wird aus einem „Beutel“ (100 Marken im Verhältnis der Pool-Gewichte, nachgefüllt wenn leer, nichts wird verworfen): so entsprechen die Anteile auf lange Sicht genau den Pool-Gewichten (Test: 5000 Züge, ±2 Prozentpunkte), und nach 3 gleichen Typen wird der Typ übersprungen. Eine einfache Sperre mit Neuziehen hätte den Baum um etwa 4 Prozentpunkte gedrückt.
- **Eröffnungswelle** (6 bis 8 Gegner) enthält jeden verfügbaren Typ mindestens einmal (zufällig auf die Plätze verteilt).
- Ein Typ, der noch nie kam, wird **spätestens beim 8. Spawn** der Runde gezogen.
- Level ab 3 ziehen wie bisher unabhängig und gewichtet (gleiche Zufallszahlen, kein Zusatzaufruf). Grund: Im Pool `forest` (89 % Baum) würde die Regel die Anteile um mehr als 1 Prozentpunkt verschieben (Vorgabe des Pakets: höchstens 1); so bleibt Level 3 ff. unberührt.

**Ausgleich (Schwierigkeit, Gold, Erfahrung unverändert, ±4 %).** Wildschwein und Bär haben 75 statt 50 Basis-HP, der Mehranteil wird über `LEVEL_SCALING` Level 0 bis 2 bezahlt (Baum etwas schwächer, Münze unverändert, weil alle drei Typen 1 Münze geben). Pro Spawn, vorher → nachher:

| Level | `hp` (Baum-HP ohne / mit Stufe) | wirksame HP je Spawn | `xp` (Basis) | Erfahrung je Spawn | `contact` | Kontaktschaden je Spawn | Münze je Spawn |
|---|---|---|---|---|---|---|---|
| 0 | 0,44 → 0,36 (22 → 18) | 23,63 → 23,35 (−1,2 %) | 0,443 → 0,393 | 1,541 → 1,541 (±0 %) | 0,92 → 0,89 | 9,30 → 9,29 (−0,1 %) | 0,308 (±0 %) |
| 1 | 0,46 → 0,38 (25 → 21) | 26,80 → 26,99 (+0,7 %) | 0,467 → 0,415 | 1,393 → 1,394 (+0,1 %) | 0,98 → 0,95 | 9,91 → 9,92 (+0,1 %) | 0,279 (±0 %) |
| 2 | 0,50 → 0,42 (29 → 24) | 31,22 → 31,62 (+1,3 %) | 0,490 → 0,435 | 1,279 → 1,279 (±0 %) | 1,02 → 0,99 | 10,31 → 10,34 (+0,2 %) | 0,256 (±0 %) |

(„Wirksame HP“ wie im Test: gerundete HP mit Gegnerstufe mal Ansturm-Faktor des Wildschweins.) Spawn-Abstand, `maxEnemies` und Gegnerzahl-Faktor bleiben, also bleiben auch Gold und Erfahrung je Runde (Test `balance.test.ts`, Grenze ±4 %). Die Baum-HP bleibt über 15 (18 / 19 / 21 ohne Stufe). Die Doppelschuss-Salve tötet den Baum in Level 0 bis 2 weiterhin in einem Zug.

**Anschluss Level 2 auf 3.** Der Druck steigt weiter streng (Tests der Kurve unverändert grün). Die Mischung springt zwischen Level 2 und 3 von 56 / 22 / 22 auf 89 / 5,5 / 5,5; das ist Absicht des Pakets (Level 3 ff. unberührt) und wird im Handtest H-38 geprüft.

**Offene Grenze (Q-75).** Mehr als 3 Typen in Level 0 bis 2 gehen nur mit früherer Freischaltung (z. B. Fee oder Hexe schon in Level 1). Das ist nicht umgesetzt; es braucht die Entscheidung des Nutzers.

## Diamanten, Shop, Ruestung, Pets (M8, AP-136, AP-145, PE-166 bis PE-179)

Alle Zahlen stehen nur im Code (`config/shop.ts`, `config/gear.ts`, `config/pets.ts`); dieser Abschnitt liest sie ab. Alle Werte sind Startwerte fuer den Handtest M8-DEP (H-36).

**Diamanten:** Der erste Sieg eines Levels bringt 1 Diamant, das letzte Level jeder Map (4, 9, 20, 25, 30, 40) bringt 3 (`DIAMOND_RULES`, die Map-Enden werden aus den Batch-Starts abgeleitet). Bis Level 40 sind das 35 + 6 * 3 = 53 Diamanten. Zweiter Sieg und Niederlage geben nichts. Alte Staende bekommen die Diamanten einmal rueckwirkend (alle Level unter dem hoechsten freien gelten als gewonnen, das hoechste freie nicht). Die Hauptmenue-Kachel traegt den Diamant-Haken, wenn das Level in `wonLevels` steht.

**Preise:**

| Artikel | Anzahl | Preis | Summe |
|---|---|---|---|
| Pet-Ei (Biene, Pinguin, Capybara) | 3 | 5 | 15 |
| Ruestungsteil (3 Sets mal Kopf, Oberteil, Hose+Schuhe) | 9 | 3 | 27 |
| Pet-Ruestung (3 Pets mal 3 Sets) | 9 | 2 | 18 |
| Alles zusammen | 21 | | **60** |

Verdienbar sind bis Level 40 nur 53 Diamanten, 7 fehlen zum Komplettkauf: man muss auswaehlen (PE-172, PE-173). Diamanten sind reine Spielwaehrung (PE-177).

**Ruestung (PE-169):** Dornen, Brand und Explosion skalieren mit dem aktuellen Laserschaden der Runde (inkl. Upgrades, ohne Doppelschuss, ohne Krit; AP-171, RS-05.5, PE-212). Bei Laserschaden 10 genau 10 / 5 / 15, bei 40 genau 40 / 20 / 60. Der Brand-Schaden pro Sekunde wird beim Anlegen des Brandes aus dem Schaden des Treffers festgelegt.

| Set | Teil | Wert | Spezialeffekt |
|---|---|---|---|
| Diamant | Kristallhelm | +10 Leben | 10 % Block |
| Diamant | Kristallpanzer | 10 % weniger Schaden | Dornen 1,0 x Laserschaden (Grundwaffe 10) |
| Diamant | Kristallstiefel | +10 Leben | Rueckstoss 24 px |
| Hoelle | Teufelshoerner | +10 % Schaden | 10 % Krit (doppelter Schaden) |
| Hoelle | Glutpanzer | +10 % Schaden | Brand 3 s, 0,5 x Laserschaden/s (Grundwaffe 5) |
| Hoelle | Lavastiefel | +5 % Schaden | Explosion Radius 40 px, 1,5 x Laserschaden (Grundwaffe 15) |
| Himmel | Heiligenschein | +10 % Drehtempo | doppelte Heilung |
| Himmel | Engelsweste | +10 % Feuerrate | Schuss durchschlaegt 1 weiteres Ziel |
| Himmel | Wolkenstiefel | +10 % Drehtempo | Magnet und Item-Dauer 1,5-fach |

Set-Effekt bei allen drei Teilen: Diamant = alle 30 s ein Block, Hoelle = alle 20 s ein Feuerring fuer 3 s, Himmel = 1 Leben alle 2 s.

**Pets (PE-170):** Pets sind unverwundbar. Biene: 220 px/s, Stich 40 % des Laserschadens, 2,5 Stiche/s. Pinguin: Schneeball alle 0,9 s, 120 % des Laserschadens, 40 % langsamer fuer 1,5 s. Capybara: Aura Radius 70 px, seit AP-169 160 % des Laserschadens je Sekunde (vorher 50 %), 30 % langsamer, heilt 2 Leben alle 10 s.

**Pets greifen auch den Boss an (AP-164, PE-205):** Boss und lebende Boss-Teile (auch beide Teile des Riesen-Steins) sind Ziele; Unverwundbare (Geist-Phase) und Tote nicht. Der Schaden geht ueber `BossBase.takeDamage` (Ruestung `damageFactor`, Stein 0,5, wirkt wie beim Laser), der Pinguin verlangsamt Bosse nicht. Ursache des Fehlers: in der Boss-Runde ist der Gegner-Pool leer und Bosse waren nie in der Zielliste. Anteil am Laser-DPS (Laser 10 x 4/s = 40 DPS in der Basis): Der Pet-Schaden ist ein Anteil des Laserschadens, der Anteil ist deshalb in Level 4 und 40 gleich (nur Feuerrate-Upgrades senken ihn, `damageFactor` trifft Laser und Pet gleich). Stufe 0 (geschluepft): Biene 25 %, Pinguin 33 %, Capybara 40 % (seit AP-169, vorher 12,5 %; nur im Radius). Stufe 3 (seit AP-169 nur Schaden 1,3^3 = 2,2-fach, das Tempo bleibt, `powerUpSpeedMul` 1,0): Biene 88 % des Laserschadens je Stich, mit zwei Bienen etwa 110 % des Laser-DPS, Pinguin 264 % je Schneeball (etwa 73 % des Laser-DPS), Capybara etwa 88 % des Laser-DPS gegen ein Ziel (jeder Gegner im Radius bekommt es, gegen Gruppen etwa 3,2-fach, Q-85). Der Pet-Anteil am Gesamtschaden gegen den Boss steht im Abschnitt „Referenzspielerin und Ziel-Baender (M11)“ (Biene 25 bis 45 %, Pinguin 18 bis 35 %, Capybara 21 bis 39 %, Ausreisser Q-84). Der Nutzer hat die Staerke entschieden (RI-40), kein Deckel. Handtest: H-38.

**Pet-Leiste (PE-179):** Das Pet startet jede Runde als Ei. Besiegte Gegner fuellen die Leiste (ein Boss zaehlt wie 10 Gegner, `bossWeight`). Die erste volle Leiste (12 % der erwarteten Gegner der Runde, `hatchFraction` 0,12; PE-194, vorher 0,15) laesst das Pet schluepfen, jede weitere Leiste (25 %, `powerUpFraction` 0,25) gibt ein Power-up bis Rundenende, hoechstens 3 (`maxPowerUps`). Jedes Power-up macht seit AP-169 nur den Schaden 1,3-fach (das Tempo bleibt, `powerUpSpeedMul` 1,0); Zusatzboni: zweite Biene, Schneeball-Radius 1,5-fach, Aura-Radius 1,3-fach. Richtwert Schluepfzeit 30 bis 60 s Spielzeit (Startwert fuer den Handtest); die Schluepfzeit haengt an der Leveldauer (ideal etwa `hatchFraction` x Dauer x 1,277 s: 180-s-Level ca. 22 bis 28 s, 300-s-Level ca. 41 bis 44 s ohne Laufwege). Die Leiste sitzt mittig unter dem Timer (Abstand 4).

## Kurve geglaettet (AP-168)

AP-168 (PE-209, RS-05.2, PE-225): Die Spitze in Level 4 und die Steilwand in Level 31 bis 40 sind weg. Gemessen wird mit dem Referenz-Druck aus „Referenzspielerin und Ziel-Baender (M11)“.

**Was sich geaendert hat:**

- **Level 0 bis 4:** `ENEMY_COUNT_FACTOR` 1,5 / 1,64 / 1,72 / 1,94 / 2,15 (vorher 1,5 / 1,75 / 2 / 2,25 / 2,5), im Wald +5 % statt +8 % HP je Stufe (`TIER_RULES.hpPerStageByBatch`, `logic/tier.ts`; ab Level 5 weiter +8 %). `xp` und `coin` folgen dem Faktor, Gold je Runde bleibt gleich (Tabelle in M7); der Ausgleich aus AP-166 bleibt (Mix-Budget ±4 % gegen den Stand nach AP-166, umgerechnet um genau diese beiden Aenderungen).
- **Level 31 bis 40:** `M5_HP` (`scaling.ts`) faellt von 1,250 auf 1,093 (vorher 1,385 bis 2,422), weil die Gegnerstufe (+8 % je Level) den Anstieg schon traegt. Vorher wurde er doppelt gezaehlt. Level 5 bis 30 sind unveraendert (Q-78 (a), der Test `scaling.test.ts` prueft den Rest der Tabelle).

**Abweichung von den Zielzahlen RS-05.2 (Level 0 bis 4):** Der Plan nennt Druck 0,77 / 0,91 / 1,11 / 1,31 / 1,54 und die Faktoren 1,6 / 1,75 / 1,9 / 2,0. Damit laege Level 4 (1,54) **unter** dem Anfang von Level 5 (1,62), das Saegezahn-Band (jeder Batch beginnt unter dem Ende des vorigen) waere verletzt, und Level 5 darf nicht geaendert werden. Die Faktoren sind deshalb so gewaehlt, dass Level 4 knapp ueber Level 5 liegt und jeder Schritt unter +22 % bleibt.

| Level | Faktor alt / neu | Referenz-Druck alt | Referenz-Druck neu | Schritt neu |
|---|---|---|---|---|
| 0 | 1,5 / 1,5 | 0,76 | 0,76 | - |
| 1 | 1,75 / 1,64 | 1,02 | 0,92 | +20,8 % |
| 2 | 2,0 / 1,72 | 1,36 | 1,12 (1,115) | +21,1 % |
| 3 | 2,25 / 1,94 | 1,67 | 1,35 | +21,4 % |
| 4 | 2,5 / 2,15 | 2,11 | 1,64 | +21,2 % |
| 5 | 2,5 / 2,5 | 1,62 | 1,62 | Batch-Wechsel |

| Level | `hp` alt / neu | Referenz-Druck alt | Referenz-Druck neu | Schritt neu |
|---|---|---|---|---|
| 31 | 1,385 / 1,250 | 1,44 | 1,30 | Batch-Wechsel |
| 32 | 1,472 / 1,209 | 1,65 | 1,36 | +3,9 % |
| 33 | 1,563 / 1,186 | 1,86 | 1,41 | +4,4 % |
| 34 | 1,663 / 1,156 | 2,11 | 1,47 | +3,7 % |
| 35 | 1,772 / 1,138 | 2,37 | 1,52 | +3,8 % |
| 36 | 1,891 / 1,122 | 2,66 | 1,58 | +3,7 % |
| 37 | 2,022 / 1,112 | 2,97 | 1,63 | +3,2 % |
| 38 | 2,147 / 1,106 | 3,28 | 1,70 | +4,1 % |
| 39 | 2,272 / 1,098 | 3,61 | 1,74 | +2,8 % |
| 40 | 2,422 / 1,093 | 3,99 | 1,80 | +3,2 % |

**Schritt-Band je Abschnitt (PE-225, Q-81 (a)):** `BALANCE_BANDS.maxStepBySection` in `balanceTargets.ts` ersetzt das einheitliche +12 %: Level 0 bis 4 hoechstens +22 %, Level 21 bis 30 hoechstens +15 %, sonst +12 %. Als Ausnahme bleibt **Level 23** (+15,13 % gegen 1,15): kein Rundungsfall, sondern ein echter, knapper Ueberschritt, Level 21 bis 30 bleiben nach Q-78 (a) unveraendert; das Band wurde nicht angehoben, der Eintrag steht in `KNOWN_OUT_OF_BAND.step` (Entscheidung beim Nutzer).

**Gold je Minute gegen alle Nachbarn im Batch (PE-224):** Level 0 zu 1 +9,4 %, 1 zu 2 +8,8 %, 2 zu 3 +13,1 % (180 s zu 300 s), 3 zu 4 +11,1 %; alle uebrigen Nachbarn im Batch unter ±6 %. Level 3 und 4 stehen in `KNOWN_OUT_OF_BAND.gold`; sie entstehen nicht durch die Glaettung (Gold je Runde ist unveraendert), das Band wurde nicht gelockert. Ueber Batch-Grenzen springt Gold je Minute (Level 4 zu 5 dreifach, 20 zu 21 +87 %, 25 zu 26 +30 %, 30 zu 31 +6 %), das ist gewollt.

Hinweis: Die Tabelle der 41 Level im Abschnitt „Referenzspielerin und Ziel-Baender (M11)“ und die Liste „Bekannte Ausreisser“ stehen seit AP-170 auf dem Stand nach AP-168 und AP-169 (Level 2 steht in beiden Tabellen als 1,12; gerechnet 1,115).

## Referenzspielerin und Ziel-Baender (M11)

AP-167 (PE-208, RS-05.1). Das Spiel ist dadurch **unveraendert**: neu sind nur `src/config/balanceTargets.ts` (Annahmen und Baender), `src/logic/balanceModel.ts` (reine Rechnung) und die Tests `balanceModel`, `balanceBoss`, `balancePets` in `tests/logic/`. Die Werte sind Startwerte RS-05.1, nach H-42 nachjustieren. AP-168 bis AP-170 richten ihre Werte an diesen Baendern aus.

**Annahmen der Referenzspielerin** (`REFERENCE_PLAYER`):

- Gold: jedes Level einmal gewonnen, ab Level 10 zusaetzlich eine Niederlage je Level (halbes Gold, `GOLD_KEEP_ON_LOSS`). Zaehlt das Gold **vor** dem Level, das gerechnet wird (Level 0 hat keine Upgrades).
- Kaeufe: 35 % des Goldes auf Feuerrate, 35 % auf Schaden, 30 % auf Leben und Drehtempo (je Haelfte). Die Stufe hat eine Nachkommastelle (ganze Stufen nach `upgradeCost`, dazu der bezahlte Teil der naechsten), so ist die Kurve glatt.
- Wirksame HP: Ansturm, Rollen, Eingraben (die Haelfte der Abtauchzeit geht verloren, `burrowLossShare` 0,5) und Wickel (Anteil `aimShare` 0,5) wie in `balance.test.ts`.
- Schadens-Faktor = (1 + 0,1 x Stufe Feuerrate) x (1 + 0,1 x Stufe Schaden), Items und Trefferquote gleichen sich beim Druck grob aus (Annahme, im Handtest pruefen).
- **Referenz-Druck** = Druck (Definition wie in "Kennzahlen": HP aller neuen Gegner je Sekunde durch die Basis-DPS 40, mit Gegnerstufe, Obergrenze und wirksamen HP) geteilt durch den Schadens-Faktor.
- Boss: Trefferquote 0,9 (grosses Ziel), Doppelschuss im Mittel Faktor 1,5 (Stufe 1 = 2, Stufe 2 = 3), Pet mit 3 Power-ups (nur fuer den Pet-Anteil, die Boss-Dauer rechnet ohne Pet). Seit AP-169 wirken die Power-ups nur auf den Schaden (`powerUpSpeedMul` 1,0, 1,3 hoch 3 = 2,2-fach), die Kapybara-Aura macht 1,6 (`damageFractionPerSec`, vorher 0,5) des Laser-Treffers je Sekunde.
- **Boss-Dauer** = Boss-HP (`BOSS_HP_BY_LEVEL`, `scaledHp`) / Referenz-DPS (40 x Schadens-Faktor x 0,9 x 1,5). Seit AP-170 sind die HP so gesetzt, dass die Dauer in der Mitte des Bands liegt (Abschnitt „Bosse nach Zielzeit (AP-170)“). **Ankuendigungs-Anteil** = Summe (Anzahl x Warnzeit) der Angriffe des Levels innerhalb der Kampfdauer / Kampfdauer; ein Angriff erscheint zuerst nach seiner Abklingzeit, danach alle Abklingzeit plus Warnzeit; Opt-in-Angriffe (Riesenzank, Herzenswaage) zaehlen nicht, Zusatzangriffe ab Index 2 im Batch. **Pet-Anteil** = Pet-DPS / (Pet-DPS + Laser-DPS), das Pet trifft den Boss immer (Capybara: eine Aura-Wirkung, ein Ziel).

**Baender** (`BALANCE_BANDS`, Test-Datei in Klammern):

| Groesse | Band | Test |
|---|---|---|
| Referenz-Druck je Level | 0,75 bis 1,8 | balanceModel |
| Level 40 | Maximum, 1,7 bis 1,8 | balanceModel |
| Schritt im Batch | hoechstens +12 % | balanceModel |
| Batch-Anfang | unter dem Ende des vorigen Batches (Saegezahn) | balanceModel |
| Gold je Minute | hoechstens 10 % Unterschied zwischen 180-s- und 300-s-Level desselben Batches | balanceModel |
| Boss-Dauer | Batch-Anfang 20 bis 28 s, Batch-Ende 30 bis 38 s (dazwischen linear nach Index im Batch), Level 40: 40 bis 50 s | balanceBoss |
| Ankuendigungs-Anteil | hoechstens 0,40 | balanceBoss |
| Jeder Angriff des Levels | erscheint bei der unteren Bandgrenze der Boss-Dauer mindestens einmal | balanceBoss |
| Pet-Anteil (3 Power-ups) | 20 bis 40 % | balancePets |

**Bekannte Ausreisser (`KNOWN_OUT_OF_BAND`).** Jeder Test hat eine Liste mit Level, Ist-Wert und zustaendigem Paket und prueft, dass **genau** diese Level ausserhalb liegen: ein neuer Ausreisser schlaegt fehl, ein behobener auch (dann den Eintrag streichen). Stand nach AP-168, AP-169 und AP-170: **Druck** und Level 40 (1,80) liegen im Band, keine Eintraege. **Boss-Dauer** und **Ankuendigungs-Anteil** haben keine Eintraege mehr (AP-170). Noch offen, alles Nutzerentscheidungen, kein Band wurde gelockert:
  - **Schritt im Batch:** Level 23 mit +15,13 % gegen das Band 1,15 (Q-82); Level 21 bis 30 sind nach Q-78 (a) unveraendert.
  - **Gold je Minute:** Level 3 (+13,1 %, 180 s zu 300 s) und Level 4 (+11,1 % gegen Level 3) (Q-83).
  - **Pet-Anteil:** Biene Level 0 bis 6 ueber 0,40 (0,40 bis 0,45), Pinguin Level 31 bis 40 knapp unter 0,20 (0,18 bis 0,20) (Q-84).
  - **Kapybara-Aura:** im Band (0,21 bis 0,39 gegen ein Ziel), trifft aber jeden Gegner im Radius und ist gegen Gruppen etwa 3,2-fach staerker; das Ziel-Cap 8 aus PE-211 ist nicht gesetzt (Q-85, Beobachtung H-38).

**Tabelle der 41 Level** (gerechnet, nicht gemessen; Stufe = Schaden und Feuerrate je Spur, Stufe L+H = Leben und Drehtempo je Spur; Pet-Anteil: Biene / Pinguin / Capybara mit Doppelschuss):

| Level | Stufe Schaden | Stufe Leben | Referenz-Druck | Gold je Minute | Boss-Dauer s | Ankuendigung | Pet-Anteil |
|---|---|---|---|---|---|---|---|
| 0 | 0,0 | 0,0 | 0,76 | 1,9 | 24,1 | 0,25 | 0,45 / 0,35 / 0,39 |
| 1 | 0,2 | 0,1 | 0,92 | 2,1 | 26,5 | 0,23 | 0,44 / 0,35 / 0,39 |
| 2 | 0,4 | 0,2 | 1,12 | 2,3 | 29,0 | 0,35 | 0,44 / 0,34 / 0,38 |
| 3 | 0,7 | 0,3 | 1,35 | 2,6 | 31,6 | 0,37 | 0,43 / 0,34 / 0,38 |
| 4 | 1,1 | 0,5 | 1,64 | 2,9 | 34,0 | 0,38 | 0,42 / 0,33 / 0,37 |
| 5 | 1,4 | 0,7 | 1,62 | 9,0 | 24,0 | 0,23 | 0,42 / 0,32 / 0,36 |
| 6 | 2,1 | 1,1 | 1,59 | 9,3 | 26,5 | 0,28 | 0,40 / 0,31 / 0,35 |
| 7 | 2,6 | 1,4 | 1,62 | 9,7 | 29,0 | 0,34 | 0,39 / 0,30 / 0,34 |
| 8 | 3,1 | 1,7 | 1,67 | 10,1 | 31,5 | 0,34 | 0,38 / 0,29 / 0,33 |
| 9 | 3,7 | 2,2 | 1,68 | 10,6 | 34,0 | 0,37 | 0,37 / 0,28 / 0,32 |
| 10 | 4,3 | 2,6 | 1,29 | 15,7 | 24,0 | 0,15 | 0,36 / 0,28 / 0,31 |
| 11 | 4,9 | 3,1 | 1,29 | 15,9 | 25,0 | 0,14 | 0,35 / 0,27 / 0,30 |
| 12 | 5,4 | 3,5 | 1,33 | 16,1 | 26,0 | 0,14 | 0,35 / 0,26 / 0,30 |
| 13 | 5,9 | 3,9 | 1,34 | 16,3 | 27,0 | 0,13 | 0,34 / 0,25 / 0,29 |
| 14 | 6,3 | 4,2 | 1,38 | 16,5 | 28,0 | 0,13 | 0,33 / 0,25 / 0,29 |
| 15 | 6,6 | 4,5 | 1,43 | 16,7 | 29,0 | 0,17 | 0,33 / 0,25 / 0,28 |
| 16 | 7,0 | 4,8 | 1,47 | 17,1 | 30,0 | 0,16 | 0,32 / 0,24 / 0,28 |
| 17 | 7,4 | 5,2 | 1,51 | 17,3 | 31,0 | 0,15 | 0,32 / 0,24 / 0,27 |
| 18 | 7,8 | 5,6 | 1,54 | 17,6 | 32,0 | 0,15 | 0,31 / 0,23 / 0,27 |
| 19 | 8,2 | 5,9 | 1,55 | 17,8 | 33,0 | 0,15 | 0,31 / 0,23 / 0,26 |
| 20 | 8,5 | 6,2 | 1,61 | 18,0 | 34,0 | 0,14 | 0,31 / 0,23 / 0,26 |
| 21 | 8,8 | 6,5 | 0,93 | 33,6 | 24,0 | 0,20 | 0,30 / 0,22 / 0,26 |
| 22 | 9,1 | 6,8 | 1,02 | 35,4 | 26,5 | 0,27 | 0,30 / 0,22 / 0,25 |
| 23 | 9,4 | 7,1 | 1,18 | 37,1 | 29,0 | 0,35 | 0,30 / 0,22 / 0,25 |
| 24 | 9,7 | 7,3 | 1,31 | 38,8 | 31,5 | 0,32 | 0,29 / 0,22 / 0,25 |
| 25 | 10,1 | 7,7 | 1,45 | 40,7 | 34,0 | 0,37 | 0,29 / 0,21 / 0,24 |
| 26 | 10,5 | 8,1 | 1,15 | 53,0 | 24,0 | 0,19 | 0,28 / 0,21 / 0,24 |
| 27 | 10,8 | 8,4 | 1,30 | 55,3 | 26,5 | 0,22 | 0,28 / 0,21 / 0,24 |
| 28 | 11,1 | 8,6 | 1,46 | 57,8 | 29,0 | 0,28 | 0,28 / 0,20 / 0,24 |
| 29 | 11,3 | 8,9 | 1,64 | 60,1 | 31,5 | 0,33 | 0,28 / 0,20 / 0,23 |
| 30 | 11,7 | 9,2 | 1,80 | 62,6 | 34,0 | 0,31 | 0,27 / 0,20 / 0,23 |
| 31 | 12,1 | 9,6 | 1,30 | 66,2 | 24,0 | 0,25 | 0,27 / 0,20 / 0,23 |
| 32 | 12,2 | 9,8 | 1,35 | 68,9 | 25,1 | 0,24 | 0,27 / 0,20 / 0,23 |
| 33 | 12,4 | 10,0 | 1,41 | 71,6 | 26,2 | 0,29 | 0,27 / 0,19 / 0,22 |
| 34 | 12,6 | 10,2 | 1,47 | 74,4 | 27,3 | 0,27 | 0,26 / 0,19 / 0,22 |
| 35 | 12,8 | 10,4 | 1,52 | 77,2 | 28,4 | 0,26 | 0,26 / 0,19 / 0,22 |
| 36 | 13,0 | 10,5 | 1,58 | 80,0 | 29,6 | 0,31 | 0,26 / 0,19 / 0,22 |
| 37 | 13,3 | 10,8 | 1,63 | 82,9 | 30,7 | 0,34 | 0,26 / 0,19 / 0,22 |
| 38 | 13,6 | 11,1 | 1,70 | 86,0 | 31,8 | 0,38 | 0,26 / 0,19 / 0,22 |
| 39 | 13,9 | 11,4 | 1,74 | 89,1 | 32,9 | 0,36 | 0,25 / 0,19 / 0,21 |
| 40 | 14,1 | 11,6 | 1,80 | 92,3 | 45,0 | 0,33 | 0,25 / 0,18 / 0,21 |

**Vergleich mit RS-05.** Referenz-Druck und Upgrade-Stufen stimmten vor AP-168 mit RS-05 auf wenige Prozent ueberein; die Boss-Zahlen aus RS-05 galten fuer die alten Boss-HP. Seit AP-168 (Kurve) und AP-170 (Boss-HP) gelten die Tabellen in diesem Abschnitt. Unterschiede in der Lesart:

- **Boss-Dauer:** RS-05 nennt "5 bis 16 s ab Level 21 mit Doppelschuss" fuer Doppelschuss Stufe 1 und 2 (Faktor 2 und 3). Das Modell rechnet mit dem Mittel 1,5; die Boss-HP aus AP-170 sind darauf ausgelegt (Dauer in der Bandmitte). Mit vollem Doppelschuss (Faktor 2 bis 3) sind die Kaempfe entsprechend kuerzer, ohne Doppelschuss um den Faktor 1,5 laenger (Tabelle unten).
- **Biene:** mit Doppelschuss im Mittel 1,5 etwa 25 bis 45 % (nur Level 0 bis 6 ueber dem Band), ohne Doppelschuss etwa 34 bis 55 % (RS-05: 55 bis 60 % um Level 20).
- **Ankuendigungs-Anteil:** hier mit endlicher Kampfdauer und Wiederholzeit (Abklingzeit plus Warnzeit) gerechnet, nicht als Warnzeit durch Abklingzeit wie in RS-05.
- **Schritt im Batch:** das Band haengt seit PE-225 am Abschnitt (Level 0 bis 4 hoechstens +22 %, Level 21 bis 30 hoechstens +15 %, sonst +12 %); Level 23 (+15,13 %) bleibt der einzige Ausreisser (Q-82).
- **Gold je Minute:** ueber Batch-Grenzen springt der Wert (Level 4 zu 5 etwa dreifach, Level 20 zu 21 etwa 1,9-fach, weil 300-s- zu 180-s-Level), das ist gewollt; das Band gilt nur fuer Nachbarn innerhalb eines Batches mit anderer Laenge.

Tests: `tests/logic/balanceModel.test.ts` (Kurve, Saegezahn, Gold), `tests/logic/balanceBoss.test.ts` (Boss-Dauer, Ankuendigung, Angriffe), `tests/logic/balancePets.test.ts` (Pet-Anteil). Die Baender aus AP-127 in `tests/logic/balance.test.ts` bleiben unveraendert gueltig.

## Bosse nach Zielzeit (AP-170)

AP-170 (PE-208, RS-05.3, PE-210): Die Boss-HP folgen nicht mehr „+15 % je Index“ (PE-33, PE-154), sondern der Zielzeit. **HP je Level = Zielzeit x Referenz-DPS** (`balanceModel.referenceDps`, ohne Pet, Doppelschuss im Mittel 1,5), die Zielzeit ist die Mitte des Bands (Batch-Anfang 24 s, Batch-Ende 34 s, dazwischen linear, Level 40: 45 s), auf 10 HP gerundet. Der Schaden-Schritt +10 % je Index bleibt.

**Umsetzung:** eine Tabelle `BOSS_HP_BY_LEVEL` (41 Werte) in `src/config/bosses.ts`. Sie ist einfacher als `baseHp` plus fester Schritt, weil die Referenz-DPS ungleichmaessig waechst (Upgrades, Sprung am Batch-Anfang) und ein fester Schritt das Band nicht trifft. `baseHp` jedes Bosses ist die HP seines ersten Levels; `variantForLevel` leitet `hpMultiplier` = Tabellenwert / `baseHp` ab, `scaledHp` bleibt unveraendert. Kein Vertrag und keine Boss-Entity geaendert. Aendert sich die Referenzspielerin (Gold, Upgrades, Waffe), muss die Tabelle neu gerechnet werden; `balanceBoss.test.ts` schlaegt dann fehl.

**Abklingzeiten:** Mit den laengeren Kaempfen lagen Baummonster, Waldgeist, Sand-Wurm und Pharao ueber 0,40 Ankuendigungs-Anteil. Die schnellen Angriffe haben jetzt laengere Abklingzeiten (Warnzeiten, Schaden und Kreise unveraendert, der Test `bosses.test.ts` vergleicht):

| Angriff | Abklingzeit vorher | nachher |
|---|---|---|
| `rootThrust` (Baummonster) | 3,5 s | 6 s |
| `orbFan` (Waldgeist) | 3,5 s | 6,5 s |
| `spikeVolley` (Sand-Wurm) | 4 s | 7 s |
| `goldCurse` (Pharao) | 4,5 s | 8 s |

Die Richtwerte aus dem Plan (5 / 5 / 5,5 / 6 s) reichten nach der HP-Aenderung nicht: der Sand-Wurm liegt nach laengeren Kaempfen wieder darueber (Hinweis aus dem Review von AP-167). Hoechster Anteil jetzt 0,38. Jeder Angriff des Levels (auch Zusatzangriffe und Opt-in) erscheint bei der Zielzeit mindestens einmal (Test `balanceBoss`).

**Tabelle Level -> HP -> Dauer** (Referenzspielerin ohne Pet; „mit Doppelschuss“ = Mittel 1,5 wie im Modell, „ohne“ = kein Doppelschuss, Faktor 1; bei vollem Doppelschuss Stufe 2 (Faktor 3) dauert der Kampf nur die Haelfte der Zeit „mit Doppelschuss“):

| Level | Boss-HP | Dauer mit Doppelschuss s | Dauer ohne Doppelschuss s | Ankuendigung |
|---|---|---|---|---|
| 0 | 1300 | 24,1 | 36,1 | 0,25 |
| 1 | 1490 | 26,5 | 39,8 | 0,23 |
| 2 | 1700 | 29,0 | 43,5 | 0,35 |
| 3 | 1940 | 31,6 | 47,4 | 0,37 |
| 4 | 2260 | 34,0 | 51,1 | 0,38 |
| 5 | 1700 | 24,0 | 36,0 | 0,23 |
| 6 | 2090 | 26,5 | 39,7 | 0,28 |
| 7 | 2480 | 29,0 | 43,5 | 0,34 |
| 8 | 2900 | 31,5 | 47,2 | 0,34 |
| 9 | 3460 | 34,0 | 51,0 | 0,37 |
| 10 | 2650 | 24,0 | 36,1 | 0,15 |
| 11 | 3010 | 25,0 | 37,5 | 0,14 |
| 12 | 3340 | 26,0 | 39,0 | 0,14 |
| 13 | 3680 | 27,0 | 40,5 | 0,13 |
| 14 | 4000 | 28,0 | 42,0 | 0,13 |
| 15 | 4320 | 29,0 | 43,5 | 0,17 |
| 16 | 4660 | 30,0 | 45,0 | 0,16 |
| 17 | 5070 | 31,0 | 46,5 | 0,15 |
| 18 | 5490 | 32,0 | 48,0 | 0,15 |
| 19 | 5900 | 33,0 | 49,5 | 0,15 |
| 20 | 6290 | 34,0 | 51,0 | 0,14 |
| 21 | 4590 | 24,0 | 36,0 | 0,20 |
| 22 | 5240 | 26,5 | 39,8 | 0,27 |
| 23 | 5890 | 29,0 | 43,5 | 0,35 |
| 24 | 6590 | 31,5 | 47,2 | 0,32 |
| 25 | 7440 | 34,0 | 51,0 | 0,37 |
| 26 | 5440 | 24,0 | 36,0 | 0,19 |
| 27 | 6180 | 26,5 | 39,7 | 0,22 |
| 28 | 6950 | 29,0 | 43,5 | 0,28 |
| 29 | 7710 | 31,5 | 47,3 | 0,33 |
| 30 | 8630 | 34,0 | 51,0 | 0,31 |
| 31 | 6310 | 24,0 | 36,0 | 0,25 |
| 32 | 6710 | 25,1 | 37,7 | 0,24 |
| 33 | 7130 | 26,2 | 39,4 | 0,29 |
| 34 | 7560 | 27,3 | 41,0 | 0,27 |
| 35 | 8010 | 28,4 | 42,7 | 0,26 |
| 36 | 8470 | 29,6 | 44,3 | 0,31 |
| 37 | 8990 | 30,7 | 46,0 | 0,34 |
| 38 | 9540 | 31,8 | 47,7 | 0,38 |
| 39 | 10110 | 32,9 | 49,3 | 0,36 |
| 40 | 14130 | 45,0 | 67,5 | 0,33 |

**Ohne Doppelschuss** dauert der laengste Kampf 67,5 s (Level 40), sonst bis 51,1 s; die Erwartung bis etwa 70 s (RI-41) ist eingehalten (Test `balanceBoss`). Mit einem Pet verkuerzt sich die Dauer um den Pet-Anteil (Tabelle oben). Die Quicktimes aus M9 kommen damit je Kampf mehrmals zum Zug (RS-05.3, PE-210).


## Nachjustieren: Beispiele

- Level 0 zu schwer: in `levels.ts` den Faktor von Level 0 (`COUNT_RAMP`) senken oder in `scaling.ts` `hp` von Level 0 senken; der Test verlangt mindestens 1,4-mal den Druck vor AP-127.
- Ruckeln am iPhone (`?fps=1`): `MAX_ENEMIES_CAP` in `levels.ts` senken, der HP-Aufschlag gleicht aus (siehe Abschnitt M7).
- Rundenstart zu hektisch oder zu leer: `OPENING_RADIUS_FACTOR` (Abstand der Eroeffnungswelle, 0,65) oder den Anteil in `openingCount` (15 %, 3 bis 8) in `spawn.ts` aendern.
  Dann stimmt eventuell der Abstand zu Level 1 nicht mehr, der Test sagt es dir.
- Items zu stark: `perStack` oder `maxStacks` in `items.ts` senken, bei Dauerfeuer `durationMs`.
- Mehr Items: `dropChance` in `items.ts` erhoehen.
- Handtest-Ziel (M2-DEP): Level 0 gut schaffbar, Level 20 nur mit Items.

## Wellen-Rhythmus (M12)

AP-175 (RS-01.1, RS-01.2, RS-01.4, RS-01.6, PE-216 bis PE-221, PE-227). Der `SpawnDirector` in `src/logic/spawn.ts` liest Zyklus, Mindestbelegung und Rollen-Caps aus `src/config/waves.ts` (`WAVE_PLANS`, `ROLE_CAPS`, `ELITE_RULES`), nicht aus `LevelDef`. Die Formkonstanten der Kurve und des Budgets stehen in `spawn.ts`.

**Regel: Druck ueber Anzahl, Rhythmus und Eliten, nicht ueber HP.** Der Rhythmus verschiebt Spawns nur in der Zeit. Die Spawns je Runde bleiben die der linearen Grundrampe (Abstand x1,0 auf x0,6), das Gegner-Tempo bleibt je Level fest, `LEVEL_SCALING` bleibt unberuehrt. `balanceModel` rechnet das Mittel der Kurve (`pacingMean`, = 1) und den Elite-Anteil (`eliteShare`, bis AP-178 0) ein; Druck, Gold je Minute und Saegezahn aus M11 bleiben damit unveraendert.

**Zyklen.** Ein Zyklus ist Aufbau, Spitze (`PEAK_SEC` 6 s) und Atempause (`RELAX_SEC` 10 s). 3-Minuten-Level haben 3 Zyklen zu 49 s, 5-Minuten-Level 5 zu 53 s; der letzte endet an der Boss-Warnung (33 s vor Rundenende, Rest der Rundung geht in die letzte Atempause). Ab der Boss-Warnung laeuft die alte Grundrampe ohne Rhythmus, ohne Budget und ohne Mindestbelegung (Boss-Phase unveraendert).

| Phase | Rate (x Grundrampe) |
|---|---|
| Aufbau | steigt linear von `BUILD_FROM` 0,5 auf `BUILD_TO` 1,0, mal Normierung |
| Spitze | `PEAK_FACTOR` 2,0, mal Normierung |
| Atempause | `RELAX_RATE` 0,25 (fest) |
| Wachstum | Aufbau und Spitze je Zyklus +`GROWTH_PER_CYCLE` (10 %) |

Die Normierung (`pacingCurve`, je Level einmal) macht die Spawns bis zur Boss-Warnung gleich denen der Grundrampe; wirksam liegt die Spitze bei etwa 2,1- bis 2,9-mal, der Aufbau bei etwa 0,5- bis 1,5-mal der Grundrampe. Test: Spawns je Minute aller 41 Level innerhalb ±5 %.

**Mindestbelegung.** `minAlive` = 30 % von `maxEnemies`, hoechstens 60 (`waves.ts`). Liegt die Zahl lebender Gegner darunter, kommt hoechstens ein Gegner je `FILL_INTERVAL_MS` (250 ms), auch in der Atempause; `maxEnemies` gilt immer. Diese Spawns werden aus dem Fahrplan vorgezogen (hoechstens `minAlive` im Voraus), sie kommen also nur zusaetzlich, wenn die Spielerin schneller toetet, als der Fahrplan liefert.

**Bedrohungsbudget.** Jeder Gegner kostet `threatCost` (1 schnell, 2 Baum, 3 Schuetze, Aura, Tank). Einnahme je Sekunde = `BUDGET_MARGIN` (1,6) x mittlere Kosten des Pools / aktueller Spawn-Abstand: sie waechst ueber die Runde und mit dem Level. Ausserhalb der Spitze bleiben `PEAK_RESERVE_SEC` (8 s) Einnahmen gespart, die Spitze darf sie ausgeben; das Konto haelt hoechstens `BANK_SEC` (30 s). Gezogen wird weiter aus dem Beutel (AP-166), aber nur Bezahlbares unter dem Rollen-Cap; uebersprungene Marken bleiben im Beutel. Fehlt Budget, wartet der Spawn (hoechstens `MAX_BACKLOG` 10 stauen sich).

**Rollen-Caps.** Hoechstens 3 Schuetzen, 4 Aura-Gegner, 6 Tanks gleichzeitig (`ROLE_CAPS`); Nahkampf und schnelle Gegner ohne Grenze. Der Director zaehlt seine Gegner je Rolle. Meldet die Szene jeden Abgang mit `noteRemoved`, ist die Zaehlung genau; sonst verteilt er den Rueckgang von `aliveCount` gleichmaessig auf die Rollen (Schaetzung). Ist nur noch der gesperrte Typ der Abwechslungsregel frei, weicht die Regel dem Cap.

**Bekannte Wirkung der Caps.** In Level 0 bis 2 sind Wildschwein und Baer zusammen 44 % des Pools. Ab etwa 14 lebenden Gegnern ist der Tank-Cap (6) voll, der Baum kommt dann haeufiger (Simulation: bei 20 bis 35 lebenden Gegnern 72 bis 80 % statt 56 %). In dichten Leveln begrenzen die Caps Schuetzen und Aura-Gegner (z. B. Hexe, Geist, Mumie, Archaeologe) ebenso; das Modell rechnet weiter mit den Pool-Anteilen. Bei wenig lebenden Gegnern (Level 0, schnelle Spielerin) bleiben die Anteile aus AP-166 innerhalb ±2 Prozentpunkten.

**Eliten (Auswahl, wirksam ab AP-178).** Nur bei `ELITE_RULES.enabled` ab `fromLevel`: ein bezahlbarer regulaerer Spawn wird mit 15 % (Spitze) bzw. 3 % (sonst) zur Elite, kostet `costMul`-fach und nur, solange Eliten hoechstens `maxShare` der Lebenden sind. Der Director setzt `SpawnRequest.elite`; Werte und Darstellung folgen in AP-178.
