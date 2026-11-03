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

Der Spawn-Pool hängt am **Batch** (`POOL_OF_BATCH` in `levels.ts`), alle Level eines Batches haben denselben Pool. **Ausnahme Level 0 bis 2** (AP-166, PE-207): Sie haben einen eigenen, gemischteren Pool (`POOL_OVERRIDE_LEVELS_0_2`, `MIX_LAST_LEVEL` in `levels.ts`) und eine Abwechslungsregel beim Ziehen (höchstens 3 gleiche Typen in Folge, jeder Typ in der Eröffnungswelle, spätestens beim 8. Spawn; siehe `docs/balancing.md`). Level 3 und 4 behalten den Pool des Waldes.

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
| Wald, Level 0 bis 2 (AP-166) | Verfluchter Baum 112 (56 %), Wildschwein 44 (22 %), Bär 44 (22 %) – Summe 200 |
| Wald, Level 3 und 4 | Verfluchter Baum 178 (89,0 %), Wildschwein 11 (5,5 %), Bär 11 (5,5 %) – Summe 200 |
| Wald bei Nacht (5 bis 9) | Verfluchter Baum 120 (34,8 %), Waldhexe 60 (17,4 %), Zombie-Eichhörnchen 96 (27,8 %), Wildschwein 17 (4,9 %), Bär 17 (4,9 %), Fee 35 (10,1 %) – Summe 345 |
| Elfenwald (10 bis 20) | Verfluchter Baum 80 (35,1 %), Waldhexe 40 (17,5 %), Zombie-Eichhörnchen 64 (28,1 %), Waldgeist-Wesen 32 (14,0 %), Fee 12 (5,3 %) – Summe 228 |
| Wüste (21 bis 25) | Sandwurm 10 (38,5 %), Armadillo 2 (7,7 %), Kamel 4 (15,4 %), Schlange 10 (38,5 %) – Summe 26 |
| Pyramiden (26 bis 30) | Mumie 3 (11,5 %), Sandwurm 14 (53,8 %), Archäologe 8 (30,8 %), Sphinx 1 (3,8 %) – Summe 26 |
| Pyramiden-Oase (31 bis 40) | Mumie 4 (15,4 %), Schlange 14 (53,8 %), Archäologe 6 (23,1 %), Sphinx 2 (7,7 %) – Summe 26 |

### Level-Tabelle

Dauer: 180 s oder 300 s (die erste Hälfte eines Batches, aufgerundet, dauert 180 s). Der Spawn-Abstand gilt zu Beginn der Runde und sinkt im Lauf der Runde auf 60 % (also mehr Gegner). `Max.` ist die Obergrenze gleichzeitig lebender Gegner (höchstens 250, AP-127). Seit AP-127 (M7) kommen etwa 2,5-mal so viele Gegner: Der Spawn-Abstand ist der frühere Wert geteilt durch den Gegnerzahl-Faktor (Level 0 1,5, Level 1 1,64, Level 2 1,72, Level 3 1,94, Level 4 2,15, ab Level 5 2,5; Level 1 bis 4 seit AP-168 flacher), `Max.` der frühere Wert mal Faktor. Ab Level 15 greift die Obergrenze 250, dort haben die Gegner dafür mehr HP (siehe 2.2). Ab Level 21 sinkt der Spawn-Abstand nur noch um 2 ms je Level (210 auf 172 ms). Stärker werden die Gegner selbst (siehe 2.2).

| Level | Map | Dauer | Spawn-Abstand (ms) | Max. Gegner | Boss |
|---|---|---|---|---|---|
| 0 | Wald | 180 s | 1000 | 38 | Baummonster |
| 1 | Wald | 180 s | 884 | 46 | Baummonster |
| 2 | Wald | 180 s | 814 | 53 | Baummonster |
| 3 | Wald | 300 s | 701 | 66 | Baummonster |
| 4 | Wald | 300 s | 619 | 80 | Baummonster |
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

**Gegnerstufen (AP-128, PE-161):** Zusätzlich zur Tabelle bekommt jeder normale Gegner je Level-Index im Batch (Stufe) +8 % HP (im Wald, Level 0 bis 4, seit AP-168 +5 %) und +5 % Kontaktschaden (ohne Deckel) und wird um 3 % je Stufe größer (höchstens +15 %). Stufe 0 ist das erste Level eines Batches; Level 4 und 9 haben Stufe 4 (Level 4 im Wald +20 % HP, Level 9 +32 % HP), Level 20 Stufe 10 (+80 % HP, +50 % Schaden), Level 40 Stufe 9 (+72 % HP). Werte in `src/config/tiers.ts`, Druck je Level in `docs/balancing.md`.

Ab Level 21 (AP-105) bleibt die Gegnerzahl fast gleich, dafür werden die Gegner selbst stärker: Die HP-Kurve wächst bis Level 30 um etwa 7,5 % je Level (der Sprung an einer Batch-Grenze beträgt etwa 9,5 %). In Level 31 bis 40 fällt `hp` seit AP-168 von 1,25 auf 1,093, weil die Gegnerstufe den Anstieg schon trägt (Tabelle zeigt den Wert mit HP-Aufschlag). XP und Münzen steigen um 0,05 je Level ab 1,2, damit eine Upgrade-Spur bis etwa Level 35 die Stufe 15 erreicht. Der Kontaktschaden wächst wie die angenommenen Lebenspunkte der Spielerin (ab AP-113 mit dem Ausgleichsfaktor 2 für den Einmaltreffer).

| Level | HP | XP | Münze | Kontakt |
|---|---|---|---|---|
| 0 | 0,36 | 0,262 | 0,308 | 0,89 |
| 1 | 0,38 | 0,253 | 0,2976 | 0,95 |
| 2 | 0,42 | 0,2529 | 0,2977 | 0,99 |
| 3 | 0,54 | 0,2814 | 0,2938 | 1,14 |
| 4 | 0,6 | 0,2767 | 0,2888 | 1,24 |
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
| 31 | 1,765 | 0,9602 | 0,9602 | 1,743 |
| 32 | 1,717 | 0,994 | 0,994 | 1,763 |
| 33 | 1,698 | 1,031 | 1,031 | 1,783 |
| 34 | 1,665 | 1,0656 | 1,0656 | 1,803 |
| 35 | 1,652 | 1,1035 | 1,1035 | 1,824 |
| 36 | 1,638 | 1,1388 | 1,1388 | 1,844 |
| 37 | 1,637 | 1,1776 | 1,1776 | 1,864 |
| 38 | 1,637 | 1,2136 | 1,2136 | 1,884 |
| 39 | 1,638 | 1,2533 | 1,2533 | 1,905 |
| 40 | 1,64 | 1,29 | 1,29 | 1,925 |

Beispiele (mit Stufe, gerundet wie im Spiel): Ein Verfluchter Baum hat auf Level 0 50 × 0,36 = 18 HP und auf Level 20 50 × 1,053 × 1,8 = 95 HP. Eine Sphinx hat auf Level 26 160 × 1,433 = 229 HP und auf Level 40 160 × 1,64 × 1,72 = 451 HP (vor AP-168: 1000 HP). Ein Armadillo hat auf Level 21 90 × 1,057 = 95 HP.

### 2.3 Bosse

Pro Batch gibt es einen Boss, insgesamt sechs. Seit AP-126 (PE-154) haben alle Bosse die doppelte Basis-HP; die Gegnerstufen (2.2) gelten nicht für Bosse. Die anderen Level des Batches nutzen ihn als Variante: **Schaden +10 % pro Level-Index im Batch** (Index 0 ist das erste Level des Batches). Die **HP stehen seit AP-170 je Level in einer Tabelle** (`BOSS_HP_BY_LEVEL` in `src/config/bosses.ts`) und folgen der Zielzeit: HP = Zielzeit × Referenz-DPS (Mitte des Bands, Batch-Anfang 24 s, Batch-Ende 34 s, Level 40 45 s; Herleitung und Tabelle Level → HP → Dauer in `docs/balancing.md`, Abschnitt „Bosse nach Zielzeit (AP-170)“). Ab dem **3. Level des Batches (Index 2)** kommt ein zusätzlicher Angriff dazu (in der Tabelle als „Zusatz“ markiert).

**Ablauf:** Die Warnung „Boss kommt!“ erscheint 33 s vor Rundenende, der Boss selbst 30 s vor Rundenende. Beim Boss-Auftritt verschwinden alle normalen Gegner und ihre Geschosse sofort, ohne Münze und XP (PE-137). Im Boss-Kampf spawnt kein normaler Gegner nach, solange der Boss lebt (Q-58). Jeder Angriff wird mindestens 700 ms vorher angekündigt, und die Spielerin hat mindestens 1000 ms Reaktionszeit.

Wird der Boss besiegt, endet die Runde sofort mit Sieg, auch vor 0:00. Lebt er am Timerende, läuft die Runde als „BOSS!“ weiter bis Sieg oder Niederlage.

**Wald-Bosse**

| | Verwurzeltes Baummonster | Waldgeist | Riesen-Stein |
|---|---|---|---|
| ID | `rootMonster` | `forestGhost` | `giantStone` |
| Sprite | `boss-root-monster` | `boss-forest-ghost` | `boss-giant-stone` |
| Map / Level | Wald, 0 bis 4 | Wald bei Nacht, 5 bis 9 | Elfenwald, 10 bis 20 |
| Basis-HP (HP des ersten Levels, AP-170) | 1300 | 1700 | 2650 |
| Basis-Schaden | 10 | 8 | 12 |
| HP am letzten Level im Batch (AP-170) | 2260 (Level 4) | 3460 (Level 9) | 6290 (Level 20) |

**Wüsten-Bosse (AP-100, AP-103, AP-104)**

| | Riesen-Sand-Wurm | Antiker Wächter-Hund | Pharao |
|---|---|---|---|
| ID | `giantSandWorm` | `guardianDog` | `pharaoh` |
| Sprite | `boss-sand-worm` (Kopf), `boss-sand-worm-body` (Glieder) | `boss-guardian-dog` | `boss-pharaoh`, `boss-pharaoh-orb` (Goldkugel) |
| Map / Level | Wüste, 21 bis 25 | Pyramiden, 26 bis 30 | Pyramiden-Oase, 31 bis 40 |
| Basis-HP (HP des ersten Levels, AP-170) | 4590 | 5440 | 6310 |
| Basis-Schaden | 12 | 14 | 14 |
| HP am letzten Level im Batch (AP-170) | 7440 (Level 25) | 8630 (Level 30) | 14 130 (Level 40; Level 39: 10 110) |

**Angriffe:** (Abklingzeiten der schnellen Angriffe seit AP-170 verlängert, damit die Ankündigungen höchstens 40 % des Kampfes einnehmen; Ankündigungszeiten, Schaden und Kreise unverändert)

| Boss | Angriff | Wirkung | Abklingzeit | Ankündigung | Schaden | Zusatz |
|---|---|---|---|---|---|---|
| Baummonster | `rootThrust` | Wurzeln brechen unter der Spielerin aus der Erde. | 6000 ms | 1200 ms | 15 | nein |
| Baummonster | `forestCall` | Ruft 3 bis 5 verfluchte Bäume. | 10 000 ms | 1200 ms | 0 | nein |
| Baummonster | `rootRing` | Ring aus Wurzeln mit einer sichtbaren Lücke. | 9000 ms | 1500 ms | 15 | ja |
| Waldgeist | `orbFan` | Fächer aus Geisterkugeln. | 6500 ms | 1800 ms | 10 | nein |
| Waldgeist | `fade` | Wird halb durchsichtig und kurz unverwundbar. | 9000 ms | 1000 ms | 0 | nein |
| Waldgeist | `decoys` | Teilt sich kurz in 2 Attrappen. | 12 000 ms | 1200 ms | 8 | ja |
| Riesen-Stein | `roll` | Rollt entlang einer Warnlinie zur Mitte und springt zurück. | 6000 ms | 1200 ms | 20 | nein |
| Sand-Wurm | `burrow` | Taucht ab (unverwundbar); beim Eingraben bleibt nur der abgedimmte Kopf sichtbar, die Körperglieder sind ausgeblendet und ohne Hitbox (PE-138). Eine Sandspur wandert zur Spielerin, der Wurm bricht neben ihr im angekündigten Kreis aus. Der Sandhügel am Ende der Spur schwächt den Ausbruch, wenn man ihn beschießt. | 7000 ms | 1200 ms | 18 | nein |
| Sand-Wurm | `spikeVolley` | Fächer aus Hautstacheln (abschießbar wie die Geisterkugeln). | 7000 ms | 1200 ms | 10 | nein |
| Sand-Wurm | `coil` | Der Körper umkreist die Spielerin als Ring mit Lücke und drückt zu. Nur der Kopf ist verwundbar. | 12 000 ms | 1500 ms | 15 | ja |
| Wächter-Hund | `runeShield` | Unverwundbar, bis 3 schwebende Runen abgeschossen sind. | 14 000 ms | 1000 ms | 0 | nein |
| Wächter-Hund | `guardBark` | Schallwellen-Ring mit Lücke. | 5000 ms | 1200 ms | 15 | nein |
| Wächter-Hund | `summonMummies` | Ruft 3 Mumien. | 12 000 ms | 1200 ms | 0 | ja |
| Pharao | `goldCurse` | Spirale aus Goldkugeln. | 8000 ms | 1800 ms | 10 | nein |
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

**Abwehr je Angriff (M9, PE-190):** Jeder Angriff mit Abwehr kündigt sich mit Kreisen an. Zeitfenster (±80 ms perfekt, ±160 ms gut), Schaden und Abklingzeit bleiben, nur die Art der Aufgabe wechselt. Bei mehr Kreisen sinkt der Schadensanteil je Kreis. Die Angriffe `quarrel` und `heartScale` sind eigene Zusatzangriffe (je 15 Schaden), die ein Boss erst nutzt, wenn seine Klasse sie freischaltet (`optIn`).

| Boss | Angriff | Märchen | Abwehr (Kreise, Symbol) |
|---|---|---|---|
| Baummonster | `rootThrust` | Dornröschen: Dornenknospe | 1 Halt-Kreis `rose`, 1 Tipp-Kreis `rose` |
| Baummonster | `rootRing` | Dornröschen: Dornenhecke | 2 Tipp-Kreise `rose`, 1 Trugkreis `spindle` |
| Waldgeist | `orbFan` | Hänsel und Gretel: Mondkiesel | Kieselspur: 2 Kreise `pebble` in Reihenfolge |
| Waldgeist | `decoys` | Erlkönigs Töchter (8 Schaden) | 1 echter Tipp-Kreis `ghost`, 2 Trugkreise `mist` |
| Riesen-Stein | `roll` | Morgenlicht | 1 Halt-Kreis `sun`, 2 Tipp-Kreise |
| Riesen-Stein | `quarrel` | Riesenzank (Zusatz, 15 Schaden) | 2 Zieh-Kreise `pebble` |
| Sand-Wurm | `burrow` | unverändert | 3 Tipp-Kreise (Seite der Sandspur) |
| Sand-Wurm | `coil` | Fessel der Göttinnen | 2 Zieh-Kreise `rope` |
| Wächter-Hund | `guardBark` | Schlaflied | 3 Takt-Kreise `head` im festen Takt |
| Wächter-Hund | `heartScale` | Herzenswaage (Zusatz, 15 Schaden) | 2 Wahlrunden je ein richtiger Kreis (`heart` oder `feather`) |
| Pharao | `goldCurse` | Rätsel der Sphinx | 1 aus 3 Wahl-Kreisen (`legs4`, `legs2`, `legs3`), der richtige wechselt je Angriff |
| Pharao | `sandstorm` | Sandsturm | 1 Tipp-Kreis, 1 Trugkreis `sand` |

`spikeVolley`, `forestCall`, `fade`, `runeShield`, `summonMummies` und `sarcophagus` haben keine Abwehr oder bleiben unverändert.

**Quicktime-Bausteine und Einfache Abwehr (M9):**

| Baustein | Aufgabe |
|---|---|
| Tipp | Genau im Moment des Aufpralls antippen. |
| Halt | Drücken, wenn der Ring schließt, halten, bis die Knospe aufgeht, dann loslassen. |
| Trugkreis | Nicht antippen. Er ist nur an Symbol und Umriss (kein Ring, welliger oder besonderer Rand) zu erkennen, nie nur an der Farbe. Antippen zählt als Fehler. |
| Kieselspur | Aufleuchtende Kreise merken (Nummern-Fähnchen, Ton) und in dieser Reihenfolge antippen. |
| Zug | Den Kreis auf das angezeigte Ziel ziehen. |
| Wahl | Aus mehreren Kreisen den richtigen antippen. |
| Takt | Mehrere Kreise im festen Takt antippen. |

Märchensymbole:

| Symbol | Bedeutung |
|---|---|
| Rose (`rose`) | Dornröschen: Dornenknospe und Dornenhecke |
| Spindel (`spindle`) | Trugkreis in der Dornenhecke, nicht antippen |
| Kiesel (`pebble`) | Hänsel und Gretel (Kieselspur); beim Riesenzank der Stein zum Ziehen |
| Geist (`ghost`) | der echte Waldgeist, antippen |
| Nebel (`mist`) | Trugbilder der Erlkönigs Töchter, nicht antippen |
| Sonne (`sun`) | Morgenlicht des Riesen-Steins (Halt) |
| Seil (`rope`) | Fessel der Göttinnen (ziehen) |
| Kopf (`head`) | Schlaflied des Wächter-Hundes (Takt) |
| Herz (`heart`) und Feder (`feather`) | Herzenswaage: das richtige der beiden wählen |
| Beine (`legs4`, `legs2`, `legs3`) | Rätsel der Sphinx: vier, zwei, drei Beine, eines ist richtig |
| Sand (`sand`) | Trugkreis im Sandsturm, nicht antippen |

**Einfache Abwehr:** Im Pausemenü gibt es den Schalter „EINFACHE ABWEHR“ (Kästchen leer = aus, gefüllt mit Haken = an; die Hinweiszeile lautet „ALLE ABWEHREN: EIN TIPP“). Ist er an, ist jeder Kreis ein normaler Tipp-Kreis mit seinem Symbol: kein Halte-Ring, keine Ziel-Klammern oder Linie, keine Fähnchen oder Taktpunkte, keine Hinweistafel und keine Trugkreise. Welche Wahl-Kreise erscheinen, regelt weiter die Logik. Der Schalter wird im Spielstand gespeichert (Feld `easyParry`, alter Spielstand ohne Feld = aus), gilt ab dem nächsten Angriff und wird mit „Fortschritt zurücksetzen“ ausgeschaltet. Im Menü bedienbar mit Tippen, Klick oder Enter; die Reihenfolge des Fokus ist WEITER, HAUPTMENÜ, EINFACHE ABWEHR, EFFEKTE REDUZIEREN (Pfeiltasten oder Tab wechseln).

**Quicktime: Fokus (M11):** Solange ein Abwehr-Kreis aktiv ist, treten Boden und Nebeneffekte zurück, damit die Kreise im Gewimmel lesbar bleiben.
- **Ablauf:** Der Fokus geht mit der Ankündigung (Telegraph) des ersten Kreises an und nach der Rückmeldung des letzten Kreises aus. Kommt der nächste Kreis innerhalb von 600 ms (`focus-hold`), bleibt er an. Er wechselt höchstens einmal pro Sekunde. Boss-Tod und Rundenende beenden ihn sofort; in der Pause steht er still.
- **Abdunkeln:** Eine einzige Tinten-Ebene (`focus-dim`, 35 %) liegt nur über Boden-Kacheln und Map-Deko; der Boden hat dann etwa 65 % Helligkeit. Gegner, Boss, Boss-Angriffe, Astronautin und HUD bleiben voll hell. Der Übergang dauert 120 ms in 3 Stufen, mit „Bewegung reduzieren“ (System-Einstellung) geschieht er sofort. Kein Blitz.
- **Effekt-Rangfolge:** Rang 0 bis 3 (Kreise und Rückmeldung, HUD, Boss-Angriffe, gegnerische Geschosse, Astronautin mit Waffe und Rüstung am Körper, Gegner, Boss, liegende Items) bleiben bei 100 %. Rang 4 (Pet mit Aura und Geschossen, Block-Ring, Feuerring und Glut-Ring, Münzen, eigene Laser, Explosionen der Lava-Stiefel) fällt im Fokus bis 110 px um die Astronautin auf 40 %, weiter weg auf 70 %; dort entstehen im Fokus keine neuen Explosionen. Mit „EFFEKTE REDUZIEREN“ bleibt Rang 4 immer auf 25 %, auch ohne Fokus (wirkt nach dem Schließen des Pausemenüs).
- **Kontrast:** Kreis, Annäherungsring, Trugkreis-Rand, Ziel-Klammern und Halte-Ring haben innen und außen je 1 px Tintenlinie, immer. Ein Test prüft auf allen 6 Böden: Kreisrand gegen Tinte mindestens 12:1, gegen den Boden im Fokus mindestens 4,5:1, ohne Fokus mindestens 4,2:1.
- Zeiten, Größen und Wertung der Kreise ändern sich durch den Fokus nicht.

**Boss-Finisher (M10):** Nach jedem Boss-Sieg läuft vor dem Ergebnis eine kurze Sequenz („BEZWUNGEN!“).
- **Stufen je Batch:** Jeder Batch hat eine eigene Stufe 1 bis 6 (Dauer 2,0 / 2,5 / 3,0 / 3,5 / 4,0 / 4,0 s); sie gilt für alle Boss-Siege des Batches außer dem Finale.
- **Finale:** Die letzten Level der Batches (4, 9, 20, 25, 30, 40) haben eine eigene Sequenz mit dem Namen des Schlussschlags (WURZELBRECHER, MONDSCHNITT, STERNENHAMMER, SONNENSPEER, GRABESLICHT, LETZTER STERN).
- **Überspringen:** Eine Sequenz lässt sich überspringen, sobald sie einmal vollständig gesehen wurde (Feld `seenFinishers` im Spielstand), und frühestens 400 ms nach dem Start.
- **Effekte reduzieren:** Der Schalter „EFFEKTE REDUZIEREN“ im Pausemenü (Hinweiszeile „OHNE BLITZ UND WACKELN“, Kästchen leer = aus, gefüllt mit Haken = an) entfernt Zwischenbild, Blitz und Wackeln aus der Sequenz und kürzt die Haltezeiten der Bilder. Er steht im Spielstand (Feld `reduceEffects`, alter Spielstand ohne Feld = aus), wirkt ab dem nächsten Boss-Sieg und wird mit „Fortschritt zurücksetzen“ ausgeschaltet.
- **Blitz-Grenze:** In jedem Zeitfenster von 1000 ms beginnen höchstens 3 Blitze oder Zwischenbilder (WCAG 2.3.1); ein Test prüft das für alle Sequenzen, normal und reduziert.
- **Debug:** `?finisher=n` (n = 0 bis 40, ungültig ergibt Level 0) spielt die Sequenz des Levels n direkt ab; es hat Vorrang vor `?level`.

### Ereignisse und Wellen-Rhythmus

**Rhythmus (M12):** Eine Runde läuft in Zyklen aus Aufbau, Spitze (6 s) und Entspannung (10 s, ein Viertel der Spawn-Rate); 3-Minuten-Runden haben 3 Zyklen, 5-Minuten-Runden 5. Jeder Zyklus ist etwas dichter als der vorige, der letzte endet mit der Boss-Warnung. Über die ganze Runde bleiben die Spawns pro Minute die der bisherigen Rampe (± 5 %). Eine Mindestbesetzung (30 % von `maxEnemies`, höchstens 60) hält das Feld auch in der Entspannung belebt.

**Ereignisse:** Ab dem zweiten Zyklus kommt je Zyklus ein Ereignis, eine Sekunde nach Beginn der Spitze. Die Arten wechseln sich ab (die neueste zuerst):

| Ereignis | ab Level | Gegner | Form | Rand-Marker |
|---|---|---|---|---|
| Ring | 0 | 8 | rundum, gleichmäßig verteilt | Punktreihe entlang des ganzen Marker-Rahmens, Wort **RING** oben mittig |
| Schwarm | 5 | 12 | dichte Gruppe in einem 60°-Sektor | Keil am Rand in Richtung der Gruppe, Wort **SCHWARM** |
| Zange | 10 | 10 | zwei Gruppen von gegenüberliegenden Seiten (je 50°) | Doppelpfeil an beiden gegenüberliegenden Rändern, Wort **ZANGE** |

- **Ankündigung:** Jedes Ereignis wird 1 s vorher angekündigt: Marker am Bildrand (immer innerhalb des sicheren Bereichs, nie unter Notch oder Home-Leiste) und ein eigener Warnton je Art (`sfx-event-ring`, `sfx-event-swarm`, `sfx-event-pincer`). Unter dem Wort zählen 3 Punkte die Sekunde herunter. Ankündigung und Spawn fallen nie in denselben Frame.
- **Ruhig:** Kein Blinken, kein Pulsieren, kein Blitz. Der Marker gleitet beim Erscheinen 4 px nach innen (150 ms in 3 Stufen, mit „Bewegung reduzieren“ sofort) und steht dann still. Er verschwindet mit dem Spawn der Gruppe, beim Rundenende und mit der Boss-Warnung; in der Pause steht er still.
- **Zählung:** Ereignis-Gegner zählen gegen die normalen Spawns (die Runde wird dadurch nicht voller) und nie über `maxEnemies`; was keinen Platz hat, entfällt. Die Gegnerart kommt aus dem Pool des Levels (mit Rollen-Grenzen und Bedrohungs-Budget). In der Boss-Phase gibt es keine Ereignisse.

### Eliten

Ab Level 3 (`ELITE_RULES.fromLevel`) wird vereinzelt ein regulärer Spawn zur Elite (15 % in der Spitze, 3 % sonst, höchstens 10 % der Lebenden). Die Chance wird je Level skaliert, damit der Druck in den Bändern bleibt: Level 3 bis 5 nur sehr selten, Level 38 und 39 gemindert, Level 30 und 40 ohne Eliten (siehe `docs/balancing.md`). Eine Elite ist ein bestehender Gegner mit **3-facher Lebenskraft**, **1,5-fachem Schaden** (Kontakt, Geist-Aura, Hexen-Blitz), **gleichem Tempo** und **1,25-facher Größe** (auf die Stufengröße). Kennzeichnung (Brief H-43, nur Tokens, keine neuen Gegner-Sprites): 1 px eisblau-weißer Umriss (`color.game.elite-edge`, 4 Silhouetten-Kopien hinter dem Körper) und eine Krone (`elite-crown`, 9×7, nicht skaliert, nicht getönt) 2 px über der Oberkante. Die warme Glut-Tönung der Stufe bleibt auf dem Körper, die Elite bleibt dadurch von Glut-Stufe 3 unterscheidbar (kalter Rand und Krone). Eine Elite lässt **immer einen Gegenstand** fallen; die Münz-Chance bleibt wie bei regulären Gegnern. Beim Recyceln im Pool werden Umriss, Krone und Größe zurückgesetzt.

---

## Quellen

- Gegnerwerte: `src/config/enemies.ts`
- Level, Spawn-Pools, Maps-Zuordnung: `src/config/levels.ts`
- Map-Darstellung: `src/config/maps.ts`
- Skalierung: `src/config/scaling.ts`
- Bosse: `src/config/bosses.ts`
- Begründungen der Zahlen: `docs/balancing.md`
- Sprite-Schlüssel und Größen: `docs/guides/grafik-austauschen.md`
