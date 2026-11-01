# Gegner und Maps – Übersicht

Stand: 2026-11-01 (Gegnerzahlen, Skalierung, Stufen und Boss-HP nach AP-126 bis AP-128 und AP-127), aus dem Code gelesen (`src/config/enemies.ts`, `levels.ts`, `maps.ts`, `scaling.ts`, `tiers.ts`, `bosses.ts`). Zahlen ändern nur dort, nicht in dieser Datei. Erklärung der Werte: `docs/balancing.md`.

Diamanten (M8): Der erste Sieg eines Levels gibt 1 Diamant, das letzte Level jeder Map (Level 4, 9, 20, 25, 30, 40) gibt 3. Zahlen und Shop: `docs/balancing.md`, Abschnitt „Diamanten, Shop, Ruestung, Pets“.

Kurzbegriffe: **Batch** = Spielwelt mit eigener Map. **Level** = einzelne Runde (0 bis 40). Eine **Map** gehört zu genau einem Batch. Es gibt sechs Batches, 14 normale Gegner und sechs Bosse.

---

## Teil 1: Maps

Es gibt sechs Maps, jede gehört zu einem Batch. Die Spielerin steht in der Mitte, die Arena ist 640 × 360 oder breiter (bis 800, je nach Bildschirm).

| Map (Batch) | Level | Anzahl Level | Boden-Token | Deko-Dichte | Effekt | Partikel | Vignette | Tileset |
|---|---|---|---|---|---|---|---|---|
| **Wald** (`forest`) | 0 bis 4 | 5 | `biome.forest-ground` | 12 % | keiner | 0 | 0,35 | `tiles-forest` |
| **Wald bei Nacht** (`forestNight`) | 5 bis 9 | 5 | `biome.night-ground` | 14 % | Glühwürmchen (`game.firefly`) | 24 | 0,60 | `tiles-forest-night` |
| **Elfenwald** (`elfForest`) | 10 bis 20 | 11 | `biome.elf-ground` | 18 % | Sporen (`game.spore`) | 30 | 0,45 | `tiles-elf-forest` |
| **Wüste** (`desert`) | 21 bis 25 | 5 | `biome.desert-ground` (#755428) | 14 % | Sand (`game.sand`) | 28 | 0,40 | `tiles-desert` |
| **Pyramiden** (`pyramids`) | 26 bis 30 | 5 | `biome.pyramid-ground` (#5e3424) | 18 % | Glut (`game.ember`) | 26 | 0,55 | `tiles-pyramids` |
| **Pyramiden-Oase** (`oasis`) | 31 bis 40 | 10 | `biome.oasis-ground` (#1c4a3c) | 20 % | Staubkörner (`game.oasis-mote`) | 26 | 0,45 | `tiles-oasis` |

Hinweise: Tileset-Frame 0 = Boden, weitere Frames = Dekoration. Die Partikelzahl ist auf höchstens 40 begrenzt (`MAX_MAP_PARTICLES`). Vignette = Randabdunklung (0 bis 1). Bei den Maps Wüste, Pyramiden und Oase tragen die Kacheln die helle und die dunkle Bodenfarbe (`biome.*-ground-hi` und `-lo`), die Boden-Farbe der Map ist der mittlere Ton.

**Bewegungsreduzierung:** Seit AP-111 wirkt `prefers-reduced-motion` auf die Partikel aller sechs Maps, auch auf die alten (Wald bei Nacht, Elfenwald). Bei eingeschalteter Einstellung stehen die Partikel still (`MapBackground`, keine Bewegung). Auch der Sandsturm des Pharaos schaltet dann ohne Ausblenden um.

### Welche Gegner spawnen auf welcher Map

Der Spawn-Pool hängt am **Batch** (`POOL_OF_BATCH` in `levels.ts`), alle Level eines Batches haben denselben Pool.

| Map | Normale Gegner im Spawn-Pool | Boss (am Rundenende) |
|---|---|---|
| **Wald** (Level 0 bis 4) | Verfluchter Baum, Wildschwein, Bär | Verwurzeltes Baummonster |
| **Wald bei Nacht** (Level 5 bis 9) | Verfluchter Baum, Waldhexe, Zombie-Eichhörnchen, Wildschwein, Bär, Fee | Waldgeist |
| **Elfenwald** (Level 10 bis 20) | Verfluchter Baum, Waldhexe, Zombie-Eichhörnchen, Waldgeist-Wesen, Fee | Riesen-Stein |
| **Wüste** (Level 21 bis 25) | Sandwurm, Armadillo, Kamel, Schlange | Riesen-Sand-Wurm |
| **Pyramiden** (Level 26 bis 30) | Mumie, Sandwurm, Archäologe, Sphinx | Antiker Wächter-Hund |
| **Pyramiden-Oase** (Level 31 bis 40) | Mumie, Schlange, Archäologe, Sphinx | Pharao |

Spawn-Gewichte (je höher, desto häufiger; Anteil am Pool). Die Gewichte sind je Batch fest. Wildschwein, Bär und Fee kommen seit AP-113 (PE-136) deutlich häufiger vor (mindestens doppelt so hoch wie vorher), Skalierung und Basiswerte gleichen den Druck aus, damit Level 0 bis 20 nicht schwerer werden (PE-125). In Wüste, Pyramiden und Oase sind die Pools so gewichtet, dass die wirksamen mittleren Lebenspunkte je Pool fast gleich sind, die Tanks sind selten.

| Batch (Level) | Gewichte (Summe) und Anteil |
|---|---|
| Wald (0 bis 4) | Verfluchter Baum 178 (89,0 %), Wildschwein 11 (5,5 %), Bär 11 (5,5 %) – Summe 200 |
| Wald bei Nacht (5 bis 9) | Verfluchter Baum 120 (34,8 %), Waldhexe 60 (17,4 %), Zombie-Eichhörnchen 96 (27,8 %), Wildschwein 17 (4,9 %), Bär 17 (4,9 %), Fee 35 (10,1 %) – Summe 345 |
| Elfenwald (10 bis 20) | Verfluchter Baum 80 (35,1 %), Waldhexe 40 (17,5 %), Zombie-Eichhörnchen 64 (28,1 %), Waldgeist-Wesen 32 (14,0 %), Fee 12 (5,3 %) – Summe 228 |
| Wüste (21 bis 25) | Sandwurm 10 (38,5 %), Armadillo 2 (7,7 %), Kamel 4 (15,4 %), Schlange 10 (38,5 %) – Summe 26 |
| Pyramiden (26 bis 30) | Mumie 3 (11,5 %), Sandwurm 14 (53,8 %), Archäologe 8 (30,8 %), Sphinx 1 (3,8 %) – Summe 26 |
| Pyramiden-Oase (31 bis 40) | Mumie 4 (15,4 %), Schlange 14 (53,8 %), Archäologe 6 (23,1 %), Sphinx 2 (7,7 %) – Summe 26 |

### Level-Tabelle

Dauer: 180 s oder 300 s (die erste Hälfte eines Batches, aufgerundet, dauert 180 s). Der Spawn-Abstand gilt zu Beginn der Runde und sinkt im Lauf der Runde auf 60 % (also mehr Gegner). `Max.` ist die Obergrenze gleichzeitig lebender Gegner (höchstens 250, AP-127). Seit AP-127 (M7) kommen etwa 2,5-mal so viele Gegner: Der Spawn-Abstand ist der frühere Wert geteilt durch den Gegnerzahl-Faktor (Level 0 1,5, Level 1 1,75, Level 2 2,0, Level 3 2,25, ab Level 4 2,5), `Max.` der frühere Wert mal Faktor. Ab Level 15 greift die Obergrenze 250, dort haben die Gegner dafür mehr HP (siehe 2.2). Ab Level 21 sinkt der Spawn-Abstand nur noch um 2 ms je Level (210 auf 172 ms). Stärker werden die Gegner selbst (siehe 2.2).

| Level | Map | Dauer | Spawn-Abstand (ms) | Max. Gegner | Boss |
|---|---|---|---|---|---|
| 0 | Wald | 180 s | 1000 | 38 | Baummonster |
| 1 | Wald | 180 s | 829 | 49 | Baummonster |
| 2 | Wald | 180 s | 700 | 62 | Baummonster |
| 3 | Wald | 300 s | 604 | 77 | Baummonster |
| 4 | Wald | 300 s | 532 | 93 | Baummonster |
| 5 | Wald bei Nacht | 180 s | 348 | 130 | Waldgeist |
| 6 | Wald bei Nacht | 180 s | 336 | 138 | Waldgeist |
| 7 | Wald bei Nacht | 180 s | 324 | 143 | Waldgeist |
| 8 | Wald bei Nacht | 300 s | 308 | 150 | Waldgeist |
| 9 | Wald bei Nacht | 300 s | 296 | 155 | Waldgeist |
| 10 | Elfenwald | 180 s | 246 | 195 | Riesen-Stein |
| 11 | Elfenwald | 180 s | 244 | 208 | Riesen-Stein |
| 12 | Elfenwald | 180 s | 240 | 220 | Riesen-Stein |
| 13 | Elfenwald | 180 s | 236 | 235 | Riesen-Stein |
| 14 | Elfenwald | 180 s | 234 | 248 | Riesen-Stein |
| 15 | Elfenwald | 180 s | 230 | 250 | Riesen-Stein |
| 16 | Elfenwald | 300 s | 224 | 250 | Riesen-Stein |
| 17 | Elfenwald | 300 s | 222 | 250 | Riesen-Stein |
| 18 | Elfenwald | 300 s | 218 | 250 | Riesen-Stein |
| 19 | Elfenwald | 300 s | 216 | 250 | Riesen-Stein |
| 20 | Elfenwald | 300 s | 212 | 250 | Riesen-Stein |
| 21 | Wüste | 180 s | 210 | 250 | Sand-Wurm |
| 22 | Wüste | 180 s | 208 | 250 | Sand-Wurm |
| 23 | Wüste | 180 s | 206 | 250 | Sand-Wurm |
| 24 | Wüste | 300 s | 204 | 250 | Sand-Wurm |
| 25 | Wüste | 300 s | 202 | 250 | Sand-Wurm |
| 26 | Pyramiden | 180 s | 200 | 250 | Wächter-Hund |
| 27 | Pyramiden | 180 s | 198 | 250 | Wächter-Hund |
| 28 | Pyramiden | 180 s | 196 | 250 | Wächter-Hund |
| 29 | Pyramiden | 300 s | 194 | 250 | Wächter-Hund |
| 30 | Pyramiden | 300 s | 192 | 250 | Wächter-Hund |
| 31 | Pyramiden-Oase | 180 s | 190 | 250 | Pharao |
| 32 | Pyramiden-Oase | 180 s | 188 | 250 | Pharao |
| 33 | Pyramiden-Oase | 180 s | 186 | 250 | Pharao |
| 34 | Pyramiden-Oase | 180 s | 184 | 250 | Pharao |
| 35 | Pyramiden-Oase | 180 s | 182 | 250 | Pharao |
| 36 | Pyramiden-Oase | 300 s | 180 | 250 | Pharao |
| 37 | Pyramiden-Oase | 300 s | 178 | 250 | Pharao |
| 38 | Pyramiden-Oase | 300 s | 176 | 250 | Pharao |
| 39 | Pyramiden-Oase | 300 s | 174 | 250 | Pharao |
| 40 | Pyramiden-Oase | 300 s | 172 | 250 | Pharao |

Der Riesen-Stein ist für Spielerlevel 6 nicht freigeschaltet. Zum Testen `?level=10`, `?level=18` oder ein beliebiges Level bis `?level=40` verwenden (PE-79).

---

## Teil 2: Gegner

Alle Basiswerte gelten **vor** der Level-Skalierung (siehe 2.2). Schaden und Geschwindigkeit sind in Spieleinheiten, Geschwindigkeit in Pixel pro Sekunde.

### 2.1 Normale Gegner

Es gibt 14 normale Gegner in drei Gruppen. Die Tabellen zeigen je Gegner die Werte aus `ENEMIES`.

**Wald-Gegner (alt)**

| | Verfluchter Baum | Waldhexe | Zombie-Eichhörnchen | Waldgeist-Wesen |
|---|---|---|---|---|
| ID | `cursedTree` | `forestWitch` | `zombieSquirrel` | `forestSpirit` |
| Sprite-Schlüssel | `enemy-cursed-tree` | `enemy-forest-witch` | `enemy-zombie-squirrel` | `enemy-forest-spirit` |
| Verhalten | `chase` (läuft auf die Spielerin zu) | `shooter` (hält Abstand und schießt) | `chase` | `aura` (Schadensfeld um sich) |
| Lebenspunkte (HP) | 50 | 20 | 8 | 10 |
| Geschwindigkeit | 30 | 40 | 80 | 60 |
| Kontaktschaden | 10 | 5 | 5 | 0 |
| Erfahrung (XP) | 5 | 10 | 4 | 8 |
| Münzwert | 1 | 4 | 1 | 4 |
| Besonderheit | Trifft einmal (Kontakt-Gegner, siehe Regel unten) und verschwindet. | Schuss: 8 Schaden, Geschwindigkeit 120, alle 2000 ms, hält 140 px Abstand. | Schnell, sehr wenig HP. | Aura: Radius 48 px, 12 Schaden pro Sekunde, kein Kontaktschaden. |
| Pool (Map) | Wald, Wald bei Nacht, Elfenwald | Wald bei Nacht, Elfenwald | Wald bei Nacht, Elfenwald | Elfenwald |
| Erscheint ab Level | 0 | 5 | 5 | 10 |

**Wald-Gegner (neu, AP-105)**

| | Wildschwein | Bär | Fee |
|---|---|---|---|
| ID | `boar` | `bear` | `fairy` |
| Sprite-Schlüssel | `enemy-boar` | `enemy-bear` | `enemy-fairy` |
| Verhalten | `charge` (Ansturm) | `chase` | `chase` mit Zickzack |
| Lebenspunkte (HP) | 75 | 75 | 4 |
| Geschwindigkeit | 30 | 36 | 75 |
| Kontaktschaden | 10 | 12 | 15 |
| Erfahrung (XP) | 7 | 7 | 4 |
| Münzwert | 1 | 1 | 2 |
| Besonderheit | Ansturm (siehe unten): 800 ms Ankündigung, Sprint 150 px/s für 900 ms, Pause 3500 ms, voller Schaden. | Viel HP (Tank), langsam. | Sehr wenig HP, viel Kontaktschaden. Läuft im Zickzack (siehe unten). |
| Pool (Map) | Wald, Wald bei Nacht | Wald, Wald bei Nacht | Wald bei Nacht, Elfenwald |
| Erscheint ab Level | 0 | 0 | 5 |

**Wüsten-Gegner (AP-105, Maps Wüste, Pyramiden, Oase)**

| | Mumie | Sandwurm | Armadillo | Kamel |
|---|---|---|---|---|
| ID | `mummy` | `sandWorm` | `armadillo` | `camel` |
| Sprite-Schlüssel | `enemy-mummy` | `enemy-sand-worm` | `enemy-armadillo` | `enemy-camel` |
| Verhalten | `shooter` mit Wickel | `burrow` (Eingraben) | `charge` (Ansturm) | `shooter` |
| Lebenspunkte (HP) | 40 | 16 | 90 | 35 |
| Geschwindigkeit | 22 | 70 | 20 | 30 |
| Kontaktschaden | 15 | 8 | 10 | 6 |
| Erfahrung (XP) | 10 | 6 | 8 | 10 |
| Münzwert | 4 | 2 | 3 | 4 |
| Besonderheit | Wickel: Schuss `mummy-wrap`, 12 Schaden, Geschwindigkeit 100, alle 2600 ms, hält 150 px Abstand, bremst die Drehung der Spielerin. | Taucht ab und wieder auf (siehe Eingraben). | Rollt: Ansturm mit halbem Schaden (siehe unten). | Spucke `camel-spit`: 8 Schaden, Geschwindigkeit 110, alle 2200 ms, hält 160 px Abstand. Kündigt den Schuss 800 ms vorher mit Frame 3 an. |
| Pool (Map) | Pyramiden, Oase | Wüste, Pyramiden | Wüste | Wüste |

| | Schlange | Archäologe | Sphinx |
|---|---|---|---|
| ID | `snake` | `archaeologist` | `sphinx` |
| Sprite-Schlüssel | `enemy-snake` | `enemy-archaeologist` | `enemy-sphinx` |
| Verhalten | `chase` mit Gift | `shooter` | `chase` |
| Lebenspunkte (HP) | 10 | 20 | 160 |
| Geschwindigkeit | 85 | 40 | 18 |
| Kontaktschaden | 5 | 5 | 18 |
| Erfahrung (XP) | 5 | 10 | 15 |
| Münzwert | 2 | 4 | 5 |
| Besonderheit | Gift: 3 Schaden pro Sekunde für 3000 ms (siehe unten). | Wie die Waldhexe: Schuss 8 Schaden, Geschwindigkeit 120, alle 2000 ms, hält 140 px Abstand (Lichtstrahl der Lupe). | Tank, sehr langsam, viel Kontaktschaden. |
| Pool (Map) | Wüste, Oase | Pyramiden, Oase | Pyramiden, Oase |

Die Mumie, der Armadillo, das Kamel, der Archäologe, das Wildschwein, der Bär und die Sphinx haben eine feste Trefferbox: 32 px (Mumie, Armadillo, Kamel, Archäologe, Wildschwein, Bär), 24 px (Sandwurm, Schlange, Fee) und 48 px (Sphinx). Alle anderen nutzen die Rahmengröße ihres Sprites (`ENEMY_BODY_SIZE`).

**Die neuen Verhalten**

- **Ansturm** (`charge`, Wildschwein und Armadillo): Der Gegner läuft langsam auf die Spielerin zu. Ist er höchstens 120 px entfernt (`CHARGE_TRIGGER_DISTANCE`), bleibt er stehen und kündigt den Sprint an. Dann rennt er in gerader Linie in die angekündigte Richtung, danach folgt die Pause. Die Reaktionszeit beträgt Ankündigung plus Weg durch Sprintgeschwindigkeit, mindestens 1000 ms.

  | | Ankündigung | Sprint-Tempo | Sprint-Dauer | Pause | Schaden im Sprint |
  |---|---|---|---|---|---|
  | Wildschwein | 800 ms | 150 | 900 ms | 3500 ms | Faktor 1 (voll) |
  | Armadillo | 900 ms | 140 | 1200 ms | 3500 ms | Faktor 0,5 (rollt) |

- **Eingraben** (`burrow`, Sandwurm): 1800 ms unter der Erde (unverwundbar), danach 2500 ms über der Erde. Er taucht 90 px von der Spielerin auf, der Auftauchpunkt wird 800 ms vorher angekündigt. Abgetaucht ist nur der abgedimmte Kopf über dem Sandhügel zu sehen (PE-139).
- **Gift** (`onHit.poison`, Schlange): Ein Treffer vergiftet die Spielerin mit 3 Schaden pro Sekunde für 3000 ms.
- **Wickel** (`onHit.slow`, Mumie): Ein Treffer des Wickels bremst die Drehung der Spielerin auf den Faktor 0,5 für 2000 ms.
- **Zickzack** (`movement: 'zigzag'`, Fee): Die Fee läuft seitlich versetzt, Ausschlag 16 px, Periode 1400 ms (`ZIGZAG`).

**Regel Kontakt-Gegner (AP-112, AP-113, PE-135):** Verfolger, Ansturm und Eingraben (auch die Tanks) treffen **einmal** mit
0,5 s Kontaktschaden (`contactDamage` x `CONTACT_HIT_SECONDS` x `contact`) und verschwinden danach ohne Münze und Erfahrung. Ausnahmen:
Waldgeist (Aura), Schützen (Hexe, Mumie, Kamel, Archäologe) und Bosse. Weil der Treffer kürzer ist als der frühere Dauerkontakt (etwa 1 s), ist `contact` in
allen Leveln verdoppelt.

### 2.2 Level-Skalierung der normalen Gegner

Je Level werden HP, XP, Münz-Drop und Kontaktschaden mit Faktoren multipliziert (`LEVEL_SCALING`). Seit AP-91 und AP-95 gibt es in Level 0 bis 20 dafür mehr, aber schwächere Gegner. Die Aura des Waldgeist-Wesens und der Schaden der Hexen-Schüsse werden nicht von diesen Faktoren erfasst.

**Seit AP-127 (M7, mehr Gegner):** HP und Kontaktschaden je Gegner bleiben, XP und Münz-Drop sind durch den Gegnerzahl-Faktor geteilt, damit Gold und Erfahrung je Runde gleich bleiben. Ab Level 15 kommt ein HP-Aufschlag dazu (gewünschte durch mögliche gleichzeitige Gegner, Level 15 ×1,04 bis Level 40 ×1,5); XP und Münz-Drop steigen dort im selben Verhältnis. Die Tabelle zeigt die Werte mit Aufschlag.

**Gegnerstufen (AP-128, PE-161):** Zusätzlich zur Tabelle bekommt jeder normale Gegner je Level-Index im Batch (Stufe) +8 % HP und +5 % Kontaktschaden (ohne Deckel) und wird um 3 % je Stufe größer (höchstens +15 %). Stufe 0 ist das erste Level eines Batches; Level 4 und 9 haben Stufe 4, Level 20 Stufe 10 (+80 % HP, +50 % Schaden), Level 40 Stufe 9 (+72 % HP). Werte in `src/config/tiers.ts`, Druck je Level in `docs/balancing.md`.

Ab Level 21 (AP-105) bleibt die Gegnerzahl fast gleich, dafür werden die Gegner selbst stärker: Die HP-Kurve wächst um etwa 7,5 % je Level (der Sprung an einer Batch-Grenze beträgt etwa 9,5 %). XP und Münzen steigen um 0,05 je Level ab 1,2, damit eine Upgrade-Spur bis etwa Level 35 die Stufe 15 erreicht. Der Kontaktschaden wächst wie die angenommenen Lebenspunkte der Spielerin (ab AP-113 mit dem Ausgleichsfaktor 2 für den Einmaltreffer).

| Level | HP | XP | Münze | Kontakt |
|---|---|---|---|---|
| 0 | 0,44 | 0,2953 | 0,308 | 0,92 |
| 1 | 0,46 | 0,2669 | 0,2789 | 0,98 |
| 2 | 0,5 | 0,245 | 0,256 | 1,02 |
| 3 | 0,54 | 0,2427 | 0,2533 | 1,14 |
| 4 | 0,6 | 0,238 | 0,2484 | 1,24 |
| 5 | 0,714 | 0,3124 | 0,3124 | 1,54 |
| 6 | 0,71 | 0,3116 | 0,3116 | 1,54 |
| 7 | 0,7 | 0,3132 | 0,3132 | 1,54 |
| 8 | 0,7 | 0,312 | 0,312 | 1,54 |
| 9 | 0,7 | 0,3124 | 0,3124 | 1,54 |
| 10 | 0,81 | 0,3124 | 0,3124 | 1,54 |
| 11 | 0,81 | 0,3132 | 0,3132 | 1,54 |
| 12 | 0,81 | 0,3124 | 0,3124 | 1,54 |
| 13 | 0,81 | 0,3112 | 0,3112 | 1,54 |
| 14 | 0,81 | 0,3128 | 0,3128 | 1,54 |
| 15 | 0,842 | 0,3236 | 0,3236 | 1,54 |
| 16 | 0,885 | 0,3394 | 0,3394 | 1,54 |
| 17 | 0,923 | 0,3552 | 0,3552 | 1,54 |
| 18 | 0,972 | 0,373 | 0,373 | 1,54 |
| 19 | 1,014 | 0,3911 | 0,3911 | 1,54 |
| 20 | 1,053 | 0,404 | 0,404 | 1,54 |
| 21 | 1,057 | 0,6298 | 0,6298 | 1,540 |
| 22 | 1,122 | 0,66 | 0,66 | 1,560 |
| 23 | 1,221 | 0,6926 | 0,6926 | 1,581 |
| 24 | 1,319 | 0,7236 | 0,7236 | 1,601 |
| 25 | 1,41 | 0,7571 | 0,7571 | 1,621 |
| 26 | 1,433 | 0,7888 | 0,7888 | 1,641 |
| 27 | 1,539 | 0,8232 | 0,8232 | 1,662 |
| 28 | 1,644 | 0,8556 | 0,8556 | 1,682 |
| 29 | 1,78 | 0,8909 | 0,8909 | 1,702 |
| 30 | 1,882 | 0,924 | 0,924 | 1,722 |
| 31 | 1,956 | 0,9602 | 0,9602 | 1,743 |
| 32 | 2,09 | 0,994 | 0,994 | 1,763 |
| 33 | 2,238 | 1,031 | 1,031 | 1,783 |
| 34 | 2,395 | 1,0656 | 1,0656 | 1,803 |
| 35 | 2,573 | 1,1035 | 1,1035 | 1,824 |
| 36 | 2,761 | 1,1388 | 1,1388 | 1,844 |
| 37 | 2,976 | 1,1776 | 1,1776 | 1,864 |
| 38 | 3,178 | 1,2136 | 1,2136 | 1,884 |
| 39 | 3,39 | 1,2533 | 1,2533 | 1,905 |
| 40 | 3,633 | 1,29 | 1,29 | 1,925 |

Beispiele (mit Stufe, gerundet wie im Spiel): Ein Verfluchter Baum hat auf Level 0 50 × 0,44 = 22 HP und auf Level 20 50 × 1,053 × 1,8 = 95 HP. Eine Sphinx hat auf Level 26 160 × 1,433 = 229 HP und auf Level 40 160 × 3,633 × 1,72 = 1000 HP. Ein Armadillo hat auf Level 21 90 × 1,057 = 95 HP.

### 2.3 Bosse

Pro Batch gibt es einen Boss, insgesamt sechs. Seit AP-126 (PE-154) haben alle Bosse die doppelte Basis-HP; die Gegnerstufen (2.2) gelten nicht für Bosse. Die anderen Level des Batches nutzen ihn als Variante: **HP +15 % und Schaden +10 % pro Level-Index im Batch** (Index 0 ist das erste Level des Batches). Ab dem **3. Level des Batches (Index 2)** kommt ein zusätzlicher Angriff dazu (in der Tabelle als „Zusatz“ markiert).

**Ablauf:** Die Warnung „Boss kommt!“ erscheint 33 s vor Rundenende, der Boss selbst 30 s vor Rundenende. Beim Boss-Auftritt verschwinden alle normalen Gegner und ihre Geschosse sofort, ohne Münze und XP (PE-137). Im Boss-Kampf spawnt kein normaler Gegner nach, solange der Boss lebt (Q-58). Jeder Angriff wird mindestens 700 ms vorher angekündigt, und die Spielerin hat mindestens 1000 ms Reaktionszeit.

Wird der Boss besiegt, endet die Runde sofort mit Sieg, auch vor 0:00. Lebt er am Timerende, läuft die Runde als „BOSS!“ weiter bis Sieg oder Niederlage.

**Wald-Bosse**

| | Verwurzeltes Baummonster | Waldgeist | Riesen-Stein |
|---|---|---|---|
| ID | `rootMonster` | `forestGhost` | `giantStone` |
| Sprite | `boss-root-monster` | `boss-forest-ghost` | `boss-giant-stone` |
| Map / Level | Wald, 0 bis 4 | Wald bei Nacht, 5 bis 9 | Elfenwald, 10 bis 20 |
| Basis-HP (seit AP-126 doppelt, PE-154) | 1000 | 1200 | 1600 |
| Basis-Schaden | 10 | 8 | 12 |
| HP am letzten Level im Batch | 1000 × (1 + 0,15 × 4) = 1600 | 1200 × (1 + 0,15 × 4) = 1920 | 1600 × (1 + 0,15 × 10) = 4000 |

**Wüsten-Bosse (AP-100, AP-103, AP-104)**

| | Riesen-Sand-Wurm | Antiker Wächter-Hund | Pharao |
|---|---|---|---|
| ID | `giantSandWorm` | `guardianDog` | `pharaoh` |
| Sprite | `boss-sand-worm` (Kopf), `boss-sand-worm-body` (Glieder) | `boss-guardian-dog` | `boss-pharaoh`, `boss-pharaoh-orb` (Goldkugel) |
| Map / Level | Wüste, 21 bis 25 | Pyramiden, 26 bis 30 | Pyramiden-Oase, 31 bis 40 |
| Basis-HP (seit AP-126 doppelt, PE-154) | 2000 | 2600 | 3400 |
| Basis-Schaden | 12 | 14 | 14 |
| HP am letzten Level im Batch | 2000 × (1 + 0,15 × 4) = 3200 | 2600 × (1 + 0,15 × 4) = 4160 | 3400 × (1 + 0,15 × 9) = 7990 |

**Angriffe:**

| Boss | Angriff | Wirkung | Abklingzeit | Ankündigung | Schaden | Zusatz |
|---|---|---|---|---|---|---|
| Baummonster | `rootThrust` | Wurzeln brechen unter der Spielerin aus der Erde. | 3500 ms | 1000 ms | 15 | nein |
| Baummonster | `forestCall` | Ruft 3 bis 5 verfluchte Bäume. | 10 000 ms | 1200 ms | 0 | nein |
| Baummonster | `rootRing` | Ring aus Wurzeln mit einer sichtbaren Lücke. | 9000 ms | 1500 ms | 15 | ja |
| Waldgeist | `orbFan` | Fächer aus Geisterkugeln. | 3500 ms | 900 ms | 10 | nein |
| Waldgeist | `fade` | Wird halb durchsichtig und kurz unverwundbar. | 9000 ms | 1000 ms | 0 | nein |
| Waldgeist | `decoys` | Teilt sich kurz in 2 Attrappen. | 12 000 ms | 1000 ms | 0 | ja |
| Riesen-Stein | `roll` | Rollt entlang einer Warnlinie zur Mitte und springt zurück. | 6000 ms | 1200 ms | 20 | nein |
| Sand-Wurm | `burrow` | Taucht ab (unverwundbar); beim Eingraben bleibt nur der abgedimmte Kopf sichtbar, die Körperglieder sind ausgeblendet und ohne Hitbox (PE-138). Eine Sandspur wandert zur Spielerin, der Wurm bricht neben ihr im angekündigten Kreis aus. Der Sandhügel am Ende der Spur schwächt den Ausbruch, wenn man ihn beschießt. | 7000 ms | 1200 ms | 18 | nein |
| Sand-Wurm | `spikeVolley` | Fächer aus Hautstacheln (abschießbar wie die Geisterkugeln). | 4000 ms | 900 ms | 10 | nein |
| Sand-Wurm | `coil` | Der Körper umkreist die Spielerin als Ring mit Lücke und drückt zu. Nur der Kopf ist verwundbar. | 12 000 ms | 1500 ms | 15 | ja |
| Wächter-Hund | `runeShield` | Unverwundbar, bis 3 schwebende Runen abgeschossen sind. | 14 000 ms | 1000 ms | 0 | nein |
| Wächter-Hund | `guardBark` | Schallwellen-Ring mit Lücke. | 5000 ms | 1200 ms | 15 | nein |
| Wächter-Hund | `summonMummies` | Ruft 3 Mumien. | 12 000 ms | 1200 ms | 0 | ja |
| Pharao | `goldCurse` | Spirale aus Goldkugeln. | 4500 ms | 1000 ms | 10 | nein |
| Pharao | `sarcophagus` | Verschwindet und taucht an einem angekündigten Ort wieder auf. | 9000 ms | 1200 ms | 0 | nein |
| Pharao | `sandstorm` | Der Rand verdunkelt sich, Geschosse kommen von außen. | 14 000 ms | 1500 ms | 8 | ja |

**Feineinstellung der Bosse** (`BOSS_TUNING`):

- **Baummonster:**
  - Wurzelknospe: 6 Treffer, Trefferradius 36. Ohne Treffer richtet sie Schaden an, Laser schwächen sie.
  - Wurzel bleibt 600 ms stehen.
  - Ruf: 3 bis 5 Bäume im Abstand 56.
  - Ring: Radius 96, Dicke 20, 12 Wurzeln, Lücke etwa 70°, Geschwindigkeit 60, 25 % des Angriffsschadens je Wurzel.
- **Waldgeist:**
  - Kreisbahn mit Radius 110 und Winkelgeschwindigkeit 0,6 rad/s.
  - Fächer: 5 Kugeln, Streuwinkel 50°, Geschwindigkeit 90, Radius 4, Lebensdauer 4000 ms.
  - Fade: 2500 ms, Alpha 0,3.
  - Attrappen: 2 Stück für 5000 ms, Alpha 0,75.
- **Riesen-Stein:**
  - Bahn mit den Halbachsen 150 × 115.
  - Rollgeschwindigkeit 300, Rückweg 140.
  - Nach dem Aufprall 2000 ms verwundbar, Rüstungsfaktor 0,5.
  - Teilt sich bei 50 % HP, Splitter im Abstand 36.
  - Grundradius 28.
- **Riesen-Sand-Wurm:**
  - Bahn mit den Halbachsen 150 × 115, Winkelgeschwindigkeit 0,35 rad/s, Rückweg 140. Kopf 64 px, Körper aus 10 Gliedern im Abstand 22 (Größe 32, Trefferradius 10, Laser prallen ab).
  - Eingraben: Ausbruch 64 px neben der Spielerin, Kreisradius 60, Schaden einmalig während 300 ms, der Wurm bleibt 1200 ms oben. Sandhügel: Radius 16, 5 Treffer, danach ist der Ausbruch harmlos.
  - Stachelfächer: 5 Stacheln, Streuwinkel 60°, Tempo höchstens 90 (näher an der Spielerin langsamer, mindestens 30), Radius 4, Lebensdauer 4000 ms.
  - Ring: Radius 100, Lücke etwa 70°, Zudrücken mit 60, Glieder formen den Ring mit 260, 20 % des Angriffsschadens je Glied, Dicke 20. 6 Kopftreffer brechen den Ring, er bleibt geschlossen 200 ms.
- **Wächter-Hund:**
  - Bahn mit den Halbachsen 150 × 115, langsam (0,2 rad/s), Größe 64.
  - Runenschild: Radius 40, 3 Runen im Abstand 56 (Radius 8, 2 Treffer je Rune, Umlauf 1,2 rad/s). Der Schild endet nach höchstens 8000 ms auch ohne Treffer.
  - Bellen: Welle ab Radius 36, Dicke 12, Lücke etwa 70°, 12 Bögen mit je 1 Treffer (die Spielerin kann sich eine eigene Lücke schießen), Tempo höchstens 80, mindestens 30.
  - Mumien rufen: 3 Mumien, Warnkreise mit Radius 14 am Bildschirmrand.
- **Pharao:**
  - Schwebebahn 150 × 115, 0,25 rad/s, Größe 64. Höchstens 64 Goldkugeln gleichzeitig (Radius 4, Lebensdauer 6000 ms).
  - Goldfluch: 4 Arme, alle 200 ms eine Kugel je Arm während 1600 ms, Drehung 0,6 rad/s, Tempo höchstens 90 (mindestens 30), Warnlinie 72 lang.
  - Sarkophag: Warnring Radius 36, der Pharao erscheint spätestens 500 ms nach Ende der Warnung.
  - Sandsturm: 6000 ms, 5 Schüsse im Abstand 1100 ms, jeder Schuss 800 ms vorher durch eine Linie angekündigt, Tempo höchstens 110 (mindestens 40). Randverdunkelung in 4 Bändern à 16 px, ausblenden in 500 ms (mit `prefers-reduced-motion` ohne Ausblenden).
- Die Spielerin hat einen Trefferradius von 14 für die Fairness-Berechnung.
- Der Abstand zum Arenarand ist 16.

---

## Quellen

- Gegnerwerte: `src/config/enemies.ts`
- Level, Spawn-Pools, Maps-Zuordnung: `src/config/levels.ts`
- Map-Darstellung: `src/config/maps.ts`
- Skalierung: `src/config/scaling.ts`
- Bosse: `src/config/bosses.ts`
- Begründungen der Zahlen: `docs/balancing.md`
- Sprite-Schlüssel und Größen: `docs/guides/grafik-austauschen.md`
