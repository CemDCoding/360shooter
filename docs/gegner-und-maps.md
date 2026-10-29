# Gegner und Maps – Übersicht

Stand: 2026-10-29, aus dem Code gelesen (`src/config/enemies.ts`, `levels.ts`, `maps.ts`, `scaling.ts`, `bosses.ts`). Zahlen ändern nur dort, nicht in dieser Datei. Erklärung der Werte: `docs/balancing.md`.

Kurzbegriffe: **Batch** = Spielwelt mit eigener Map. **Level** = einzelne Runde (0 bis 20). Eine **Map** gehört zu genau einem Batch.

---

## Teil 1: Maps

Es gibt drei Maps, jede gehört zu einem Batch. Die Spielerin steht in der Mitte, die Arena ist 640 × 360 oder breiter (bis 800, je nach Bildschirm).

| Map (Batch) | Level | Anzahl Level | Boden-Token | Deko-Dichte | Effekt | Partikel | Vignette | Tileset |
|---|---|---|---|---|---|---|---|---|
| **Wald** (`forest`) | 0 bis 4 | 5 | `biome.forest-ground` | 12 % | keiner | 0 | 0,35 | `tiles-forest` |
| **Wald bei Nacht** (`forestNight`) | 5 bis 9 | 5 | `biome.night-ground` | 14 % | Glühwürmchen (`game.firefly`) | 24 | 0,60 | `tiles-forest-night` |
| **Elfenwald** (`elfForest`) | 10 bis 20 | 11 | `biome.elf-ground` | 18 % | Sporen (`game.spore`) | 30 | 0,45 | `tiles-elf-forest` |

Hinweise: Tileset-Frame 0 = Boden, weitere Frames = Dekoration. Die Partikelzahl ist auf höchstens 40 begrenzt. Vignette = Randabdunklung (0 bis 1).

### Welche Gegner spawnen auf welcher Map

| Map | Normale Gegner im Spawn-Pool | Boss (am Rundenende) |
|---|---|---|
| **Wald** (Level 0 bis 4) | Verfluchter Baum | Verwurzeltes Baummonster |
| **Wald bei Nacht** (Level 5 bis 9) | Verfluchter Baum, Waldhexe, Zombie-Eichhörnchen | Waldgeist |
| **Elfenwald** (Level 10 bis 20) | Verfluchter Baum, Waldhexe, Zombie-Eichhörnchen, Waldgeist-Wesen | Riesen-Stein |

Der Spawn-Pool hängt am Level, nicht an der Map: Ab Level 5 kommen Waldhexe und Zombie-Eichhörnchen dazu, ab Level 10 das Waldgeist-Wesen. Das fällt mit den Map-Grenzen zusammen.

Spawn-Gewichte (je höher, desto häufiger; Anteil am Pool):

| Level | Verfluchter Baum | Waldhexe | Zombie-Eichhörnchen | Waldgeist-Wesen |
|---|---|---|---|---|
| 0 bis 4 | 10 (100 %) | – | – | – |
| 5 bis 9 | 10 (43,5 %) | 5 (21,7 %) | 8 (34,8 %) | – |
| 10 bis 20 | 10 (37,0 %) | 5 (18,5 %) | 8 (29,6 %) | 4 (14,8 %) |

### Level-Tabelle

Dauer: 180 s oder 300 s. Der Spawn-Abstand gilt zu Beginn der Runde und sinkt im Lauf der Runde auf 60 % (also mehr Gegner). `Max.` ist die Obergrenze gleichzeitig lebender Gegner.

| Level | Map | Dauer | Spawn-Abstand (ms) | Max. Gegner | Boss |
|---|---|---|---|---|---|
| 0 | Wald | 180 s | 1500 | 25 | Baummonster |
| 1 | Wald | 180 s | 1450 | 28 | Baummonster |
| 2 | Wald | 180 s | 1400 | 31 | Baummonster |
| 3 | Wald | 300 s | 1360 | 34 | Baummonster |
| 4 | Wald | 300 s | 1330 | 37 | Baummonster |
| 5 | Wald bei Nacht | 180 s | 870 | 52 | Waldgeist |
| 6 | Wald bei Nacht | 180 s | 840 | 55 | Waldgeist |
| 7 | Wald bei Nacht | 180 s | 810 | 57 | Waldgeist |
| 8 | Wald bei Nacht | 300 s | 770 | 60 | Waldgeist |
| 9 | Wald bei Nacht | 300 s | 740 | 62 | Waldgeist |
| 10 | Elfenwald | 180 s | 615 | 78 | Riesen-Stein |
| 11 | Elfenwald | 180 s | 610 | 83 | Riesen-Stein |
| 12 | Elfenwald | 180 s | 600 | 88 | Riesen-Stein |
| 13 | Elfenwald | 180 s | 590 | 94 | Riesen-Stein |
| 14 | Elfenwald | 180 s | 585 | 99 | Riesen-Stein |
| 15 | Elfenwald | 180 s | 575 | 104 | Riesen-Stein |
| 16 | Elfenwald | 300 s | 560 | 109 | Riesen-Stein |
| 17 | Elfenwald | 300 s | 555 | 114 | Riesen-Stein |
| 18 | Elfenwald | 300 s | 545 | 120 | Riesen-Stein |
| 19 | Elfenwald | 300 s | 540 | 125 | Riesen-Stein |
| 20 | Elfenwald | 300 s | 530 | 130 | Riesen-Stein |

Der Riesen-Stein ist für Spielerlevel 6 nicht freigeschaltet. Zum Testen `?level=10` oder `?level=18` verwenden (PE-79).

---

## Teil 2: Gegner

Alle Basiswerte gelten **vor** der Level-Skalierung (siehe unten). Schaden und Geschwindigkeit sind in Spieleinheiten, Geschwindigkeit in Pixel pro Sekunde.

### 2.1 Normale Gegner

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
| Besonderheit | Verschwindet von selbst nach 30 Schaden durch Kontakt (3 s Kontakt, AP-60). | Schuss: 8 Schaden, Geschwindigkeit 120, alle 2000 ms, hält 140 px Abstand. | Schnell, sehr wenig HP. | Aura: Radius 48 px, 12 Schaden pro Sekunde; kein Kontaktschaden. |
| Erscheint ab Level | 0 | 5 | 5 | 10 |
| Erscheint auf Map | Wald, Wald bei Nacht, Elfenwald | Wald bei Nacht, Elfenwald | Wald bei Nacht, Elfenwald | Elfenwald |

### 2.2 Level-Skalierung der normalen Gegner

Je Level werden HP, XP, Münz-Drop und Kontaktschaden mit Faktoren multipliziert. Seit AP-91 und AP-95 gibt es dafür mehr, aber schwächere Gegner. Druck, Gold und Erfahrung je Runde bleiben gleich. Die Aura des Waldgeist-Wesens und der Schaden der Hexen-Schüsse werden nicht von diesen Faktoren erfasst.

| Level | HP | XP | Münze | Kontakt |
|---|---|---|---|---|
| 0 | 0,46 | 0,462 | 0,462 | 0,46 |
| 1 | 0,48 | 0,488 | 0,488 | 0,49 |
| 2 | 0,52 | 0,512 | 0,512 | 0,51 |
| 3 | 0,56 | 0,570 | 0,570 | 0,57 |
| 4 | 0,62 | 0,621 | 0,621 | 0,62 |
| 5 | 0,77 | 0,771 | 0,771 | 0,77 |
| 6 | 0,77 | 0,769 | 0,769 | 0,77 |
| 7 | 0,77 | 0,773 | 0,773 | 0,77 |
| 8 | 0,77 | 0,770 | 0,770 | 0,77 |
| 9 | 0,77 | 0,771 | 0,771 | 0,77 |
| 10 | 0,77 | 0,774 | 0,774 | 0,77 |
| 11 | 0,77 | 0,776 | 0,776 | 0,77 |
| 12 | 0,77 | 0,774 | 0,774 | 0,77 |
| 13 | 0,77 | 0,771 | 0,771 | 0,77 |
| 14 | 0,77 | 0,775 | 0,775 | 0,77 |
| 15 | 0,77 | 0,771 | 0,771 | 0,77 |
| 16 | 0,77 | 0,770 | 0,770 | 0,77 |
| 17 | 0,77 | 0,772 | 0,772 | 0,77 |
| 18 | 0,77 | 0,770 | 0,770 | 0,77 |
| 19 | 0,77 | 0,774 | 0,774 | 0,77 |
| 20 | 0,77 | 0,770 | 0,770 | 0,77 |

Beispiel: Ein Verfluchter Baum hat auf Level 0 etwa 50 × 0,46 = 23 HP und auf Level 20 etwa 50 × 0,77 = 38,5 HP.

### 2.3 Bosse

Pro Batch gibt es einen Boss. Die anderen Level des Batches nutzen ihn als Variante: **HP +15 % und Schaden +10 % pro Level-Index im Batch** (Index 0 ist das erste Level des Batches). Ab dem **3. Level des Batches (Index 2)** kommt ein zusätzlicher Angriff dazu (in der Tabelle als „Zusatz“ markiert).

**Ablauf:** Die Warnung „Boss kommt!“ erscheint 33 s vor Rundenende, der Boss selbst 30 s vor Rundenende. Solange er lebt, ist die Spawnrate der normalen Gegner halbiert. Jeder Angriff wird mindestens 700 ms vorher angekündigt, und die Spielerin hat mindestens 1000 ms Reaktionszeit.

Wird der Boss besiegt, endet die Runde sofort mit Sieg, auch vor 0:00. Lebt er am Timerende, läuft die Runde als „BOSS!“ weiter bis Sieg oder Niederlage.

| | Verwurzeltes Baummonster | Waldgeist | Riesen-Stein |
|---|---|---|---|
| ID | `rootMonster` | `forestGhost` | `giantStone` |
| Sprite | `boss-root-monster` | `boss-forest-ghost` | `boss-giant-stone` |
| Map / Level | Wald, 0 bis 4 | Wald bei Nacht, 5 bis 9 | Elfenwald, 10 bis 20 |
| Basis-HP | 500 | 600 | 800 |
| Basis-Schaden | 10 | 8 | 12 |
| HP am letzten Level im Batch | 500 × (1 + 0,15 × 4) = 800 | 600 × (1 + 0,15 × 4) = 960 | 800 × (1 + 0,15 × 10) = 2000 |

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

**Feineinstellung der Bosse:**

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
