# RS-01 – Wellen-Design: Spawn-Verhalten und Gegnerstärke

**Auftrag (Nutzer am 2026-10-28):** Wie lässt sich das Wellen-Design (Spawn-Verhalten und Stärke der Gegner, nicht die Optik) verbessern, damit der Gameplay-Loop möglichst spannend wird? Zeitrahmen 20 Minuten.
**Projektbezug:** 360°-Survival-Shooter. Die Spielerin steht fest in der Mitte und schießt automatisch, Runden dauern 3 oder 5 min, in den letzten 30 s kommt der Boss (F-05, PE-76). Level 0–20, vier Gegnertypen (Baum, Hexe, Eichhörnchen, Spirit). `SpawnDirector` (`src/logic/spawn.ts`) heute: eine Eröffnungswelle, danach ein gleichmäßiger Zufallsstrom auf dem Ring, das Intervall sinkt linear auf 60 %, Cap `maxEnemies`, fester Gewichtspool je Level. Offen sind B5 („Level 0–4 große Lücken“) und AP-90/AP-91 (Skalierung von HP, Erfahrung und Drop, noch nicht gebaut). Grenzen aus §2: keine neuen Level über 20, keine neuen Waffen. Neue Gegnertypen sind nicht geplant.
**Kriterien:** (a) passt in `SpawnDirector` und `LevelDef` und bleibt datengetrieben, (b) braucht keine neuen Gegnertypen oder Assets, (c) ist als reine Logik testbar (RNG injizierbar), (d) fair bei 360° (Gefahr kommt aus allen Richtungen und muss lesbar sein), (e) verträgt sich mit Boss-Phase und AP-90/AP-91.

## Kurzantwort
Ein gleichmäßig dichter werdender Strom ermüdet. Spannung entsteht durch **Rhythmus**: Aufbau, Spitze, kurze Atempause. Genau das ist der Kern des L4D-AI-Directors, der dabei die Häufigkeit ändert und nicht die Stärke [Q1]. Vampire Survivors zeigt dasselbe in Datenform: Die Mindestzahl an Gegnern schwankt Minute für Minute stark, dazu kommen feste Ereignisse wie Schwärme und Ringe [Q3]. Für 360shooter heißt das: (1) eine **Mindestbelegung**, damit es keine leeren Phasen gibt (löst B5), (2) eine **Phasenkurve** statt der linearen Rampe, (3) **angekündigte Ereignisse** wie Schwarm, Ring und Zange, (4) die Mischung über ein **Bedrohungsbudget** mit Obergrenzen je Rolle, (5) Stärke über **Elite-Varianten** bestehender Gegner und eine einfache Skalierung je Level.

## Ergebnisse

### 1. Wie steuern bekannte Spiele die Spannungskurve?
- **Left 4 Dead (Valve, 2009):** Der Director misst je Spielerin eine „Intensität“. Sie steigt durch erlittenen Schaden und durch Gegner, die nahe sterben, und sinkt mit der Zeit, aber nicht, solange noch gekämpft wird. Daraus ergeben sich vier Phasen: *Build Up* bis zur Schwelle, *Sustain Peak* 3–5 s, *Peak Fade* bis die Intensität gesunken ist, *Relax* 30–45 s mit minimaler Population. Die Begründung: Pausenloser Kampf ermüdet, lange Leerlaufzeiten langweilen. Wichtig ist, dass nur die **Frequenz** angepasst wird, nicht die **Amplitude** (Stärke). Bosse sind ausgenommen [Q1].
- **Vampire Survivors, Mad Forest:** Jede Minute ist eine Welle mit Gegnertypen, einer Mindestzahl und einem Intervall. Die Mindestzahlen der ersten zehn Minuten lauten 15, 30, 50, 40, 30, 10, 20, 80, 100, 30, 10, die Kurve ist also klar sägezahnförmig und nicht monoton. Bei Minute 5 und 10 fällt sie bewusst ab, gleichzeitig gibt es ein Ring-Ereignis („Flower Wall“) [Q3] (Fan-Wiki aus Spieldaten, schwach belegt).
- **Risk of Rain 2:** Ein „schneller“ und ein „langsamer“ Director verdienen gleich viele Credits. Der langsame wartet 22,5–30 s und gibt dann gesammelt aus. So entstehen neben dem Grundrauschen größere Spitzen [Q2] (Community-Wiki, schwach belegt).
- **Bezug zum Projekt:** Heute sinkt das Intervall linear von ×1,0 auf ×0,6. Es gibt weder Spitzen noch Pausen. Die Runde hat mit dem Boss in den letzten 30 s schon einen festen Höhepunkt, davor fehlt die Dramaturgie.

### 2. Wie entstehen Mischung und Formationen?
- **Budget statt reinem Zufallsgewicht (RoR2):** Jeder Gegner hat Kosten, die Elite-Stufe kostet das 6-fache (Stufe 2: das 36-fache). Credits fließen pro Sekunde zu, mit `0,75 × (1 + 0,4 × coeff)` bei einer Spielerin. Ein Director mit vielen Credits verwirft „zu billige“ Gegner, damit Spitzen schwerer werden statt nur voller [Q2] (schwach belegt).
- **Mindestbelegung (VS):** Liegen weniger Gegner als das Minimum auf dem Feld, wird sofort aufgefüllt. Es gibt also kein „Loch“, wenn die Spielerin schnell aufräumt [Q3] (schwach belegt).
- **Ereignisse (VS, Brotato):** Schwärme ziehen geradlinig über die Karte, ein Ring aus Gegnern schließt sich um die Spielerin. Sie kommen zu festen Sekunden einer Welle und sind damit lernbar [Q3]. Brotato setzt zusätzlich zeitlich gezielte Spawns ein, z. B. ein Sondergegner mit fester Chance nach 25 s, und Spezialwellen (Horde 40 % / Elite 60 %) erst ab Welle 11 [Q4][Q5] (schwach belegt).
- **Rollen und Gleichzeitigkeit (DOOM 2016):** Angriffe brauchen ein „Token“ aus einem begrenzten Pool je Angriffsart. Die Zahl der Tokens hängt vom Schwierigkeitsgrad ab und begrenzt, wie viele Gegner gleichzeitig angreifen. Rollen (Fernkampf hält Abstand, Nahkampf stürmt) erzeugen verschiedene Arten von Druck, und gut lesbare Archetypen helfen bei der Priorisierung („Combat Chess“) [Q6].
- **Bezug zum Projekt:** Die vier Typen sind schon klare Rollen: Baum = Tank, Eichhörnchen = Schwarm/Tempo, Hexe = Fernkampf, Spirit = Zonen-Druck. Ein Cap je Rolle (z. B. höchstens 3 Hexen gleichzeitig) übernimmt die Token-Idee ohne KI-Umbau. Weil die Gefahr bei 360° aus allen Richtungen kommt, sind Formationen aus **einem Sektor** (Schwarm) oder **zwei gegenüberliegenden** (Zange) mit Drehgeschwindigkeit als Engpass ein starker, projekttypischer Spannungshebel. Das ist eigene Ableitung, ohne Quelle.

### 3. Wie steigt die Gegnerstärke?
- **Brotato:** `HP = Basis + (Welle − 1) × HP je Welle` (linear), Schaden genauso, die **Geschwindigkeit bleibt konstant** (außer im Endlos-Modus). Hohe Schwierigkeit: +40 % HP. Eliten beim ersten Auftreten nur mit 75 % HP [Q5] (schwach belegt).
- **RoR2:** Elite-Stufe 1 hat 3–5× HP und 2× Schaden, Stufe 2 18× HP und 6× Schaden, freigeschaltet über das Budget [Q2] (schwach belegt).
- **L4D:** Die Pacing-Steuerung ändert die Stärke ausdrücklich nicht [Q1].
- **Bezug zum Projekt:** AP-90 bringt die Skalierungsfaktoren je Level (HP, Erfahrung, Drop). Mehr HP allein verlängert nur die Zeit pro Kill. Gegen die Upgrades (Schaden, Feuerrate) ist das nötig, spannend wird es dadurch nicht. Mehr Abwechslung bringen **Elite-Varianten** derselben Gegner (mehr HP, etwas größer, bessere Beute) und eine Geschwindigkeit, die konstant bleibt, damit die Gegner lesbar bleiben.

### 4. Anpassung an die Spielerin (DDA)
- Hunicke 2005 und das System Hamlet (Half-Life) regeln den Nachschub an Gegnern und Ressourcen nach dem Zustand der Spielerin. Die Motivation: Zu leicht ist langweilig, zu schwer frustriert [Q7] (nur Abstract und bibliografische Angaben gelesen, der Volltext ließ sich nicht lesen, schwach belegt). Chen 2006 („Flow in Games“) will die Schwierigkeit in einer persönlichen „Flow-Zone“ halten [Q8] (nur Sekundärquellen).
- **Bezug zum Projekt:** Die L4D-Variante passt am besten. Sie steuert über die Frequenz: Geht es der Spielerin schlecht, wird die nächste Atempause länger, die Gegner werden aber nie schwächer [Q1]. So bleibt die Balance (`docs/balancing.md`, Fairness-Tests) prüfbar.

## Vorschläge an den Planner

### RS-01.1 – Mindestbelegung gegen leere Phasen
- **Vorschlag:** `LevelDef` erhält `minAlive`. Liegt `aliveCount` darunter, spawnt der Director sofort nach, höchstens z. B. 1 Gegner je 250 ms, bis `minAlive` erreicht ist. Den regulären Takt gibt es weiter. Werte je Level in `src/config/levels.ts`, Test mit injiziertem RNG.
- **Begründung:** Das VS-Muster [Q3] löst direkt B5 („Level 0–4 große Lücken“), ohne dass die Spitzen härter werden.
- **Plan-Bezug:** Abnahmekriterium für AP-91 (B5 Zahlen) oder ein kleines eigenes Paket davor. `spawn.ts` gehört laut §8 AP-91 nicht, deshalb ist ein Eigentumseintrag nötig.
- **Größe:** S
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** Architektur: Vertrag `LevelDef` additiv erweitert
- **Status:** freigegeben (2026-10-28)

### RS-01.2 – Spannungskurve in Phasen statt linearer Rampe
- **Vorschlag:** Der Director arbeitet in Zyklen: *Aufbau* (Intervall sinkt), *Spitze* (5–8 s, höchste Rate, oft mit Ereignis aus RS-01.3), *Atempause* (8–12 s, Rate etwa 25 %, nur Mindestbelegung). Bei 3 min etwa 3 Zyklen, bei 5 min etwa 5. Jeder Zyklus liegt etwas höher als der vorige, der letzte endet in der Boss-Warnung (33 s). Die Kurve ist pro Level als Daten beschrieben (z. B. `pacing: { cycleSec, peakSec, relaxSec, relaxRate }`). Die lineare Rampe bleibt als Grundtrend.
- **Begründung:** Valve begründet Spitzen und Täler mit Ermüdung und Langeweile und regelt über die Frequenz [Q1]. VS fährt eine Sägezahnkurve [Q3]. RoR2 baut durch Ansparen Spitzen auf [Q2].
- **Plan-Bezug:** §4 (`LevelDef`, `SpawnDirector`), neues Paket nach AP-91.
- **Größe:** M
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** Architektur: Vertrag `LevelDef`, Logik `SpawnDirector`; Balance-Tests (Druck-Bänder) neu einstellen
- **Status:** freigegeben (2026-10-28)

### RS-01.3 – Angekündigte Spawn-Ereignisse (Schwarm, Ring, Zange)
- **Vorschlag:** Drei datengetriebene Ereignisse für Spitzen: **Schwarm** (8–15 Eichhörnchen aus einem Sektor von etwa 30°), **Ring** (Bäume gleichmäßig auf dem ganzen Ring, ähnlich der Eröffnungswelle), **Zange** (zwei Gruppen aus gegenüberliegenden Sektoren, prüft die Drehgeschwindigkeit). Jedes Ereignis kündigt sich etwa 1 s vorher an, mit Richtungsmarker am Rand und Ton. Ereignisse liegen zeitlich fest je Level und sind dadurch lernbar. Neue Ereignisarten erst ab bestimmten Leveln.
- **Begründung:** Feste, lernbare Ereignisse bei VS [Q3] und gezielte Spawns bei Brotato [Q4]. Bei 360° ist Lesbarkeit eine Frage der Fairness (Kriterium d).
- **Plan-Bezug:** neues Paket (Logik plus Szene). Der Randmarker braucht den Designer.
- **Größe:** M
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** Architektur: `SpawnRequest` um Gruppe und Ankündigung erweitert; Design: Ankündigungs-Marker und Ton
- **Status:** freigegeben (2026-10-28)

### RS-01.4 – Mischung über Bedrohungsbudget und Rollen-Caps
- **Vorschlag:** Jeder Gegnertyp erhält `threatCost` (z. B. Eichhörnchen 1, Baum 2, Spirit 3, Hexe 3). Das Budget wächst pro Sekunde und je Level. Der Director wählt per Gewicht, aber nur, was bezahlbar ist. Je Rolle gibt es eine Höchstzahl gleichzeitig (z. B. Hexen ≤ 3, Spirits ≤ 4). In der Spitze darf er angespartes Budget ausgeben.
- **Begründung:** Der Credit-Director von RoR2 [Q2] und die Angriffs-Tokens von DOOM [Q6]. Damit lässt sich verhindern, dass zufällig fünf Hexen gleichzeitig schießen, und schwere Spitzen werden planbar.
- **Plan-Bezug:** §4 (`EnemyDef` + `LevelDef`), neues Paket. Lässt sich mit RS-01.2 zusammenlegen.
- **Größe:** M
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** Architektur: Verträge `EnemyDef`/`LevelDef`, Spawn-Logik
- **Status:** freigegeben (2026-10-28)

### RS-01.5 – Elite-Varianten bestehender Gegner
- **Vorschlag:** Eine Elite-Stufe für die vier Gegner: HP ×3, Schaden ×1,5, gleiche Geschwindigkeit, etwas größer bzw. getönt, garantierter Münz- oder Item-Drop. Eliten erscheinen ab Level 3 vereinzelt (ab Batch „Nacht“ öfter), bevorzugt in Spitzen, und kosten im Budget das 6-fache. Die Faktoren stehen in `src/config/scaling.ts` aus AP-90.
- **Begründung:** Elite-Stufen mit HP- und Schadensfaktoren bei RoR2 [Q2], Elite-Wellen und Abschwächung beim ersten Auftreten bei Brotato [Q4][Q5]. So gibt es Abwechslung ohne neue Gegnertypen (Kriterium b).
- **Plan-Bezug:** neues Paket nach AP-90/AP-91. Die Optik ist eine Designer-Frage.
- **Größe:** M
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** Architektur: Elite-Flag am Gegner; Design: Elite-Darstellung (Tönung/Größe); Ökonomie: Gold-Tempo (Q-51)
- **Status:** freigegeben (2026-10-28)

### RS-01.6 – Regel für die Stärke-Skalierung in AP-91
- **Vorschlag:** In AP-91 gelten drei Regeln: (1) HP steigt linear je Level innerhalb eines Batches und springt beim Batch-Wechsel, (2) die Geschwindigkeit bleibt fest, (3) Druck entsteht vor allem über Anzahl, Rhythmus und Eliten, nicht über HP. Prüfgröße: Die Zeit pro Kill bei Upgrade-Stufe „erwartet“ bleibt je Gegnertyp in einem Band.
- **Begründung:** lineare HP- und Schadensformel bei konstanter Geschwindigkeit in Brotato [Q5], „Frequenz statt Amplitude“ bei L4D [Q1].
- **Plan-Bezug:** Abnahmekriterium für AP-91, Ergänzung in `docs/balancing.md`.
- **Größe:** S
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein
- **Status:** freigegeben (2026-10-28)

### RS-01.7 – Sanfte Anpassung über die Atempause (optional)
- **Vorschlag:** Liegt die HP der Spielerin länger als 5 s unter 30 %, verlängert sich die nächste Atempause aus RS-01.2 (z. B. ×1,5). Ist sie über einen ganzen Zyklus hinweg ohne Schaden geblieben, wird die Pause kürzer. Gegnerwerte ändern sich nie, der Boss ist ausgenommen.
- **Begründung:** Intensität und Relax-Phase bei L4D [Q1], DDA-Motivation bei Hunicke [Q7] (schwach belegt).
- **Plan-Bezug:** Erweiterung des Pakets aus RS-01.2. Empfehlung: erst nach einem Handtest von RS-01.2 entscheiden.
- **Größe:** S
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein (nur der Spawn-Director liest die HP)
- **Status:** verworfen (2026-10-28)

## Vertrauen und Lücken
- **Gut belegt:** Die Pacing-Phasen und das Prinzip „Frequenz statt Amplitude“ kommen aus Valves eigenen Vortragsfolien (Booth, AIIDE 2009). Gelesen habe ich sie über einen Spiegel [Q1], weil Valves Original-URL 404 lieferte und das Valve-Developer-Wiki 403. Die Inhalte sind konsistent mit mehreren Erwähnungen. Die Angriffs-Tokens von DOOM kommen aus einem Fachartikel über einen GDC-Vortrag [Q6].
- **Schwach belegt:** Die Zahlen zu RoR2, Vampire Survivors und Brotato stammen aus Community-Wikis, die aus Spieldaten gepflegt werden. Für die Prinzipien sind sie verlässlich, die genauen Werte können je Version abweichen. Primärquellen der Entwickler habe ich in 20 Minuten nicht gefunden.
- **Nicht gelesen:** Hunicke 2005 (PDF nicht lesbar) und Chens Thesis (nur Sekundärquellen).
- **Eigene Ableitung ohne Quelle:** Zange und Drehgeschwindigkeit als Engpass, die konkreten Zahlen in RS-01.2 bis RS-01.5 (Startwerte, im Handtest einzustellen) und die Rollen-Zuordnung der vier Gegner.
- **Vom Nutzer zu prüfen:** Ob Ankündigungs-Marker (RS-01.3) und Elite-Optik (RS-01.5) zum Design passen, das wäre ein Designer-Auftrag. Außerdem, ob Eliten das Gold-Tempo (Q-51) sprengen.

## Quellen
- [Q1] The AI Systems of Left 4 Dead, Michael Booth (Valve), AIIDE 2009, Spiegel: https://www.readkong.com/page/the-ai-systems-of-left-4-dead-michael-booth-valve-9664541, Stand 2009, abgerufen 2026-10-28 – Primärquelle (Folien des Entwicklers, über Spiegel)
- [Q2] Directors, Risk of Rain 2 Wiki, https://riskofrain2.wiki.gg/wiki/Directors, abgerufen 2026-10-28 – Sekundärquelle (Community-Wiki)
- [Q3] Mad Forest (Abschnitt Waves), Vampire Survivors Wiki, https://vampire.survivors.wiki/w/Mad_Forest, abgerufen 2026-10-28 – Sekundärquelle (Community-Wiki)
- [Q4] Waves, Brotato Wiki, https://brotato.wiki.spellsandguns.com/Waves, abgerufen 2026-10-28 – Sekundärquelle (Community-Wiki)
- [Q5] Enemies, Brotato Wiki, https://brotato.wiki.spellsandguns.com/Enemies, abgerufen 2026-10-28 – Sekundärquelle (Community-Wiki)
- [Q6] Cyber Demons: The AI of DOOM (2016), Game Developer, https://www.gamedeveloper.com/design/cyber-demons-the-ai-of-doom-2016-, abgerufen 2026-10-28 – Sekundärquelle (Fachartikel über einen GDC-Vortrag)
- [Q7] R. Hunicke, The Case for Dynamic Difficulty Adjustment in Games, ACE 2005, DOI 10.1145/1178477.1178573; Hunicke & Chapman, AI for Dynamic Difficulty Adjustment in Games (Hamlet), https://users.cs.northwestern.edu/~hunicke/pubs/Hamlet.pdf, abgerufen 2026-10-28 – Primärquelle (nur Abstract und bibliografische Angaben gelesen)
- [Q8] Flow (video game) / J. Chen, Flow in Games (USC, 2006), https://en.wikipedia.org/wiki/Flow_(video_game), abgerufen 2026-10-28 – Sekundärquelle (Lexikon)

## Entscheidungen
- Nutzer am 2026-10-28: RS-01.1, RS-01.2, RS-01.3, RS-01.4, RS-01.5 und RS-01.6 freigegeben
- Nutzer am 2026-10-28: RS-01.7 verworfen
