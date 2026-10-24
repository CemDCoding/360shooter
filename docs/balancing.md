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
  (jetzt 4 Schuesse/s mal 10 Schaden = 40 pro Sekunde). Unter 1 reicht die Grundwaffe rechnerisch,
  ueber 1 braucht man Items. Mit allen Items auf Stufe 5 ist der Schaden rund 4,5-mal so hoch (180 pro Sekunde).
  In der Praxis trifft man nicht immer, deshalb ist Level 0 mit 0,27 bewusst weit unter 1.
- **Schaden ohne Abschuss/Min**: Schaden pro Minute an der Astronautin, wenn sie gar nichts trifft und
  alle Gegner ungestoert ankommen. Sie ist nur zum Vergleichen der Level gedacht (die Zahl waechst mit
  der Rundendauer, daher sind 5-Minuten-Level hoeher). Annahme: Gegner starten 380 px vom Zentrum.

## Tabelle aller Level

| Level | Batch | Minuten | Spawn-Abstand (ms) | Max. Gegner | Spawns/Min | Gegner-HP/Min | Druck | Schaden ohne Abschuss/Min |
|---|---|---|---|---|---|---|---|---|
| 0 | forest | 3 | 3570 | 25 | 21 | 640 | 0,27 | 10312 |
| 1 | forest | 3 | 3130 | 28 | 24 | 730 | 0,30 | 11635 |
| 2 | forest | 3 | 2780 | 31 | 27 | 820 | 0,34 | 12967 |
| 3 | forest | 5 | 2450 | 34 | 31 | 936 | 0,39 | 16725 |
| 4 | forest | 5 | 2190 | 37 | 35 | 1044 | 0,43 | 18289 |
| 5 | forestNight | 3 | 1330 | 40 | 57 | 1157 | 0,48 | 13307 |
| 6 | forestNight | 3 | 1270 | 42 | 60 | 1210 | 0,50 | 13969 |
| 7 | forestNight | 3 | 1210 | 44 | 63 | 1271 | 0,53 | 14642 |
| 8 | forestNight | 5 | 1160 | 46 | 66 | 1331 | 0,55 | 16836 |
| 9 | forestNight | 5 | 1100 | 48 | 70 | 1404 | 0,59 | 17588 |
| 10 | elfForest | 3 | 930 | 60 | 82 | 1531 | 0,64 | 22091 |
| 11 | elfForest | 3 | 900 | 64 | 85 | 1587 | 0,66 | 23430 |
| 12 | elfForest | 3 | 860 | 68 | 89 | 1661 | 0,69 | 24827 |
| 13 | elfForest | 3 | 830 | 72 | 92 | 1717 | 0,72 | 26182 |
| 14 | elfForest | 3 | 800 | 76 | 96 | 1786 | 0,74 | 27546 |
| 15 | elfForest | 3 | 770 | 80 | 99 | 1854 | 0,77 | 28924 |
| 16 | elfForest | 5 | 740 | 84 | 103 | 1930 | 0,80 | 33651 |
| 17 | elfForest | 5 | 710 | 88 | 108 | 2012 | 0,84 | 35235 |
| 18 | elfForest | 5 | 680 | 92 | 113 | 2102 | 0,88 | 36834 |
| 19 | elfForest | 5 | 650 | 96 | 118 | 2199 | 0,92 | 38449 |
| 20 | elfForest | 5 | 620 | 100 | 123 | 2303 | 0,96 | 40082 |

## Was die Tests sichern

- Der Druck steigt mit jedem Level, auch ueber Batch-Grenzen (Spawns/Min ebenso).
- Die Spruenge 4 zu 5 (hoechstens +12 %) und 9 zu 10 (hoechstens +10 %) sind spuerbar (mindestens 8 %)
  und groesser als jeder normale Schritt im neuen Batch.
- Ab Level 5 waechst der Druck je Level um hoechstens 10 %.
- 5-Minuten-Level sind in ihrem Batch fordernder als die 3-Minuten-Level.
- Level 0 hat Druck von hoechstens 0,4. Level 20 liegt ueber 0,8 und
  bleibt mit einem Teil der Items schaffbar.

## Aenderung nach dem Handtest (AP-23)

Im Handtest kippte das Spiel ab Level 5, Level 12 war zu schwer. Deshalb:

- Die Laserpistole schiesst jetzt 4 statt 3 Mal pro Sekunde. Das gilt in allen Level, also sind auch Level 0-4 etwas leichter.
- Das Zombie-Eichhoernchen laeuft langsamer (Tempo 80 statt 110). Es kommt erst ab Level 5 vor.
- Der Verfluchte Baum bleibt unveraendert.
- Level 0-4 behalten ihre Spawn-Werte (Abstand und Max. Gegner).
- Level 5-20 haben weniger und gleichmaessiger wachsende Gegnermengen: Sprung von Level 4 auf 5 etwa +11 %,
  danach hoechstens +10 % je Level. Alt: Abstand Level 5 = 1200 ms, Level 12 = 660 ms, Level 20 = 500 ms. Neu: 1330, 860, 620 ms.
- Die Druck-Werte sind nicht mit den Werten aus AP-15 vergleichbar, weil die Grundwaffe jetzt 40 statt 30 Schaden pro Sekunde macht.

## Nachjustieren: Beispiele

- Level 0 zu schwer: in `levels.ts` den ersten Eintrag von `SPAWN_INTERVAL_MS` erhoehen (z. B. 4000).
  Dann stimmt eventuell der Abstand zu Level 1 nicht mehr, der Test sagt es dir.
- Items zu stark: `perStack` in `items.ts` senken.
- Mehr Items: `dropChance` in `items.ts` erhoehen.
- Handtest-Ziel (M2-DEP): Level 0 gut schaffbar, Level 20 nur mit Items.
