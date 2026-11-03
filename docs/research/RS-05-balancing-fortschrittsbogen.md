# RS-05 – Balancing-Update: Fortschrittsbogen über Level 0 bis 40

**Auftrag (Nutzer am 2026-11-02):** Ein großes Balancing-Update mit stimmigem Fortschrittsbogen über alle 41 Level und 6 Maps recherchieren: Kurve und Spitzen, Boss-Zeiten und Quicktime-Mischung, Wirtschaft, Pet-Stärke, Einsteiger-Fairness, Lesbarkeit der Quicktime-Kreise. Jeder Vorschlag mit Größe, Dateien und Risiken.
**Projektbezug:** Alle Werte nur in `src/config` (§4 Regel 2), Logik ohne Phaser und mit Vitest getestet; `tests/logic/balance.test.ts` sichert die Kurve; höchstens 250 Gegner (AP-127); 60 fps am iPhone (§5); keine Telemetrie (R2); Fotosensitivität (§5, PE-200); kein Konter-Schaden bei der Abwehr (PE-158); Diamanten-Knappheit 53 zu 60 bleibt (PE-172). Laufende Fixes: AP-164 (Pet greift den Boss an, PE-205), AP-165 (Kreise im Clutter, PE-206).
**Entscheidungen des Nutzers für diese Recherche (2026-11-02):** (1a) Das Spiel soll mit **realistisch erspielten** Upgrades fair bleiben, also wieder ein Druck-Band. (2b) Dynamische Fairness **verdeckt**. (3) Diamanten-Knappheit ist kein Problem und bleibt. Bekannt und gut: Ei-Schlüpfzeit 30 bis 60 s.
**Kriterien:** passt zu Stack und Architektur, bleibt testbar, keine Mehrlast am iPhone, keine Daten nach außen, Kurve steigt über das Spiel und sinkt an Batch-Grenzen kurz ab (Sägezahn), Boss-Inhalte aus M9 bleiben sichtbar.

## Kurzantwort

Bis Level 30 ist die Kurve mit einer realistisch rechnenden Spielerin stimmig (Referenz-Druck etwa 0,8 bis 1,8), mit zwei Ausreißern: **Level 4** (2,1, Spitze für Einsteiger) und **Level 31 bis 40** (steigt bis 4,0). Die Ursache für die Oase ist eine **Doppelzählung**: `M5_HP` steigt in Level 21 bis 40 schon je Level um etwa 7,5 %, seit AP-128 kommt die Gegnerstufe (+8 % je Level im Batch) obendrauf. **Bosse** sterben ab der Wüste mit Doppelschuss in 5 bis 16 s, die Quicktimes aus M9 kommen dann kaum zum Zug; gleichzeitig verbringt man bei 4 von 6 Bossen etwa die Hälfte des Kampfes in Ankündigungen. **Pets** werden durch Power-ups 4,8-mal stärker (Schaden *und* Rate je 1,3-fach), die Biene kann so mehr Schaden machen als die Spielerin. Die **Wirtschaft** ist im Kern gesund (Gold je Minute bei 3- und 5-min-Leveln gleich, kein Farm-Vorteil). Für die **Lesbarkeit** empfehlen die Barrierefreiheits-Richtlinien eine Rangfolge der Effekte, Abdunkeln des Hintergrunds und Kontrast von mindestens 3:1 für Spielobjekte.

## Ergebnisse

### 0. Rechenweg: Referenzspielerin

Die bisherige Annahme in `balancing.md` („Stufe 10 bei Level 21, Stufe 15 bei Level 40“) ist optimistisch und zählt nur die Schadens-Spuren. Für 1a rechne ich mit einer **Referenzspielerin**:

- Gold: jedes Level einmal gewonnen, ab Level 10 zusätzlich eine Niederlage je Level (halbes Gold); Gold je Runde aus der Tabelle „M7 (AP-127)“.
- Verteilung: je 35 % auf Feuerrate und Schaden, 30 % auf Leben und Drehtempo.
- Schadens-Faktor = (1 + 0,1 · Stufe)², also Feuerrate mal Schaden.
- Referenz-Druck = Druck (neu, Tabelle AP-127) durch Schadens-Faktor. Items (Doppelschuss, Dauerfeuer) und Trefferquote (geschätzt 70 bis 90 %) gleichen sich grob aus; das ist eine Annahme (schwach belegt) und wird im Handtest geprüft.

| Level | 0 | 1 | 2 | 3 | **4** | 5 | 9 | 10 | 15 | 20 | 21 | 25 | 26 | 30 | 31 | 35 | **40** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Stufe je Schadens-Spur | 0 | 0,2 | 0,4 | 0,7 | 1,1 | 1,4 | 3,7 | 4,3 | 6,6 | 8,5 | 8,8 | 10,1 | 10,5 | 11,7 | 12,1 | 12,8 | 14,1 |
| Referenz-Druck heute | 0,77 | 1,02 | 1,34 | 1,67 | **2,12** | 1,62 | 1,68 | 1,29 | 1,43 | 1,61 | 0,93 | 1,45 | 1,15 | 1,80 | 1,44 | 2,37 | **3,99** |

Lesart: Level 5 bis 30 liegen in einem Sägezahn zwischen 0,9 und 1,8, jeder Batch fängt niedriger an, als der vorige endet. Ausreißer sind Level 3/4 und die ganze Oase (Level 33 bis 40 über 1,8).

### 1. Schwierigkeitskurve, Spitzen, Dichte, HP und Schaden

- **Sägezahn statt Rampe:** Flow-Modelle beschreiben, dass Herausforderung mit dem Können steigen soll, ohne dauerhaft darüber zu liegen; Chen leitet daraus Anpassung über Spielerentscheidungen ab [Q5]. Dass Kurven in Wellen mit kurzen Erholungsphasen nach Spitzen (oft Bossen) gebaut werden, ist gängige Praxis, aber nur in Blogs belegt (schwach belegt) [Q15]. Das Projekt hat diese Form schon: Die Gegnerstufe beginnt in jedem Batch bei 0.
- **Level 4 (Wald-Finale):** Im Wald steigen drei Dinge zugleich: Gegnerzahl-Faktor 1,5 → 2,5 (+11 bis +17 % je Level), Gegnerstufe +8 % HP je Level und `hp` 0,44 → 0,60. Der Referenz-Druck springt von 0,77 auf 2,12, bei kaum Upgrades (Stufe 1). Das ist die steilste Stelle des Spiels und trifft Einsteiger.
- **Level 21 bis 40 (Doppelzählung):** In Level 5 bis 20 ist `hp` innerhalb eines Batches flach (0,70 bzw. 0,81), die Stufe trägt den Anstieg. In Level 21 bis 40 steigt `M5_HP` je Level um etwa 7,5 % (so in AP-105 für die Zeit vor den Stufen eingestellt), dazu die Stufe. In der Oase (10 Level, Stufe bis 9, +72 %) ergibt das je Level etwa +15 % Gegner-HP, die Upgrades wachsen nur etwa +2 % je Level. Mit flachem `hp` je Batch läge Level 40 bei 2,28 statt 3,99; Wüste und Pyramiden lägen bei 0,93 bis 1,41.
- **Dichte:** Die Obergrenze 250 greift ab Level 15; der HP-Aufschlag (`CAP_HP_BONUS`) hält den Druck dann über zähere Gegner. Das ist fürs iPhone richtig und braucht keine Änderung. Mehr Dichte ist kein sinnvoller Hebel mehr.
- **Schaden:** Ein Einzeltreffer bleibt nach `balancing.md` unter etwa 17 % der Spielerin-HP (Level 20). Kein Befund.

### 2. Boss-Zeiten und Mischung aus Schadensfenstern und Quicktimes

Boss-HP heute = `baseHp` · (1 + 0,15 · Index im Batch). Laser-DPS der Referenzspielerin = 40 · Schadens-Faktor · 0,9 (großes Ziel). Ohne Pet:

| Level | Boss-HP | Dauer ohne Doppelschuss | mit Stufe 1 | mit Stufe 2 |
|---|---|---|---|---|
| 0 / 4 | 1 000 / 1 600 | 28 / 36 s | 14 / 18 s | 9 / 12 s |
| 9 / 20 | 1 920 / 4 000 | 28 / 32 s | 14 / 16 s | 9 / 11 s |
| 21 / 25 | 2 000 / 3 200 | 16 / 22 s | 8 / 11 s | 5 / 7 s |
| 26 / 30 | 2 600 / 4 160 | 17 / 25 s | 9 / 12 s | 6 / 8 s |
| 31 / 40 | 3 400 / 7 989 | 19 / 38 s | 10 / 19 s | 6 / 13 s |

- Die Boss-HP wachsen über das Spiel nur etwa ×8, die Spielerin-DPS etwa ×6 plus Rüstung und Pet. Ab Level 21 sind Batch-Start-Bosse mit Doppelschuss in 5 bis 10 s besiegt. Zusatzangriffe mit 12 bis 14 s Abklingzeit (Riesenzank, Herzenswaage, Sandsturm) erscheinen dann oft gar nicht.
- **Nach AP-164** greift auch das Pet den Boss an. Die Biene mit 3 Power-ups macht heute etwa so viel Schaden wie die Spielerin (Abschnitt 4), die Kämpfe würden also noch einmal deutlich kürzer.
- **Anteil Ankündigung an der Kampfzeit** (Summe Telegraph durch Abklingzeit): Baummonster 0,51, Waldgeist 0,61, Riesen-Stein 0,32, Sand-Wurm 0,60, Wächter-Hund 0,39, Pharao 0,51. Bei vier Bossen ist also etwa die Hälfte des Kampfes Quicktime.
- Vergleich (schwach belegt, Fan-Wiki): In Brotato dauert die Boss-Welle 90 s, normale Wellen 20 bis 60 s [Q16]. Für Kampflänge und Schadensfenster fand ich keine belastbare Primärquelle mit Zahlen; Fachartikel betonen Spannung und Entspannung über Phasen [Q15]. Die Zielwerte unten sind deshalb aus dem Projekt abgeleitet, nicht aus Quellen.
- Ein echtes **Schadensfenster nach gelungener Abwehr** (Boss taumelt, nimmt mehr Schaden) wäre Konter-Schaden im weiten Sinn und widerspricht PE-158. Ich schlage es deshalb **nicht** vor; Schadensfenster entstehen hier nur durch Zeit ohne Ankündigung.

### 3. Wirtschaft: Gold, Diamanten, Preise, Upgrade-Kurven

- Preise wachsen exponentiell (×1,4 je Stufe), die Wirkung linear (+10 % je Stufe, über zwei Spuren multipliziert). Das ist das klassische Muster „Kosten exponentiell, Ertrag linear oder polynomiell“; es bremst den Fortschritt planbar [Q14].
- **Kein Farm-Vorteil:** Gold je Minute ist bei 3- und 5-min-Leveln fast gleich (Level 23: 37/min, Level 24: 39/min; Level 35: 77/min, Level 36: 80/min). Wiederholen lohnt sich am meisten im höchsten Level, das ist erwünscht.
- **Upgrade-Stand:** Die Referenzspielerin erreicht bis Level 40 Stufe 14 auf den Schadens-Spuren, nicht 15. Stufe 15 auf allen vier Spuren (15 456 Gold) bleibt ein Ziel für Wiederholungen nach Level 40 (etwa 20 Siege in Level 40). Das passt.
- **Diamanten:** bleiben (Nutzerentscheidung). Der Shop gibt bis Level 20 23 Diamanten, also Ei plus 6 Rüstungsteile möglich. Rüstung zählt im Referenz-Druck nicht mit.
- **Rüstung, feste Zahlen (RI-32):** Dornen 10, Brand 5/s, Explosion 15 sind fest. In Level 0 bis 4 töten Brand (15 Schaden) und Explosion einen Baum mit 22 bis 30 HP fast allein, in Level 40 (Sphinx etwa 450 HP) sind sie bedeutungslos. Pets lösen das bereits mit „Anteil am Laserschaden“ (`petStats`); dasselbe Muster passt für die Rüstung.

### 4. Pet-Stärke und Ei-Rhythmus

- `petStats` (`src/logic/pets.ts`) multipliziert je Power-up den **Schaden** und die **Rate** mit 1,3. Nach 3 Power-ups ist das 1,3⁶ ≈ 4,8-fach.
- Biene mit 3 Power-ups: 2 Bienen · 2,5 Stiche/s · 0,4 · 4,8 ≈ 9,7 Laserschaden/s. Die Spielerin schießt bei Feuerrate-Stufe 8 etwa 7,4 Schüsse/s, trifft etwa 90 % beim Boss. Die Biene macht damit etwa **55 bis 60 %** des Gesamtschadens, sie trifft immer und ist unverwundbar.
- Pinguin: 1,2 / 0,9 s · 4,8 ≈ 6,4 (plus Verlangsamung und Flächenradius) ≈ 45 bis 50 %. Capybara: 0,5 · 4,8 ≈ 2,4 je Gegner in der Aura; in dichten Wellen sehr stark, gegen den Boss (ein Ziel) schwach.
- Mit nur dem Schaden als Power-up-Faktor (1,3³ = 2,2) läge die Biene bei etwa 40 % ohne und etwa 25 % mit Doppelschuss, der Pinguin bei etwa 30 %. Das ist spürbar, ohne der Spielerin die Rolle zu nehmen.
- Ei-Rhythmus: bleibt (Nutzerurteil). Hinweis: Volle Power-ups kommen bei 87 % der erwarteten Kills, also kurz vor dem Boss. Das Pet ist im Bosskampf am stärksten; Boss-HP und Pet-Stärke müssen deshalb zusammen eingestellt werden.

### 5. Einsteiger-Fairness, verdeckte Anpassung und Einfache Abwehr

- **Belege für verdeckte Anpassung:** Hamlet (Half-Life) passte die Schwierigkeit zur Laufzeit an und wollte dabei nur so wenig eingreifen, dass das Spiel stabil und vorhersehbar bleibt [Q1]. In einer Studie mit verdeckt angepasstem Zeitlimit berichtete die angepasste Gruppe höhere Immersion [Q2]. Spieler wählen lieber selbst, das Erleben unterschied sich bei automatischer Anpassung aber nicht deutlich (40 Teilnehmende) [Q4].
- **Gegenbefund:** Wer erfährt, dass ein Spiel sich anpasst, fühlt sich stärker eingebunden, auch wenn es sich gar nicht anpasst [Q3]. Verdeckt ist also nicht zwingend besser. Es ist aber auch nicht schädlich, solange es nicht auffällt. Die Nutzerentscheidung 2b ist damit vertretbar.
- **Praxis:** Resident Evil 4 hatte ein verdecktes, nie offiziell dokumentiertes Rang-System [Q6]. Laut Activision gaben die Crash-Bandicoot-Remakes nach mehreren Fehlversuchen zusätzliche Hilfen [Q7] (beides Sekundärquellen, schwach belegt).
- **Folgerung für das Projekt:** kleine Schritte, nur nach Niederlagen im selben Level, Belohnung unverändert (sonst fällt es auf), Untergrenze, damit ein Level nie leichter wird als der Anfang des Batches. Die Zeitfenster der Abwehr bleiben unangetastet. Die Einfache Abwehr ist der sichtbare, manuelle Weg dafür (F-37), so bleibt Können bei den Quicktimes erkennbar.

### 6. Sichtbarkeit: Effektdichte und Quicktime-Kreise

- **Rangfolge:** Riot ordnet Effekte nach Bedeutung. Das Wichtigste bekommt die meiste Aufmerksamkeit, Lärm soll minimal sein, kosmetische Varianten dürfen nie unklarer sein als das Original [Q8]. Für 360shooter wäre die Reihenfolge: Abwehr-Kreise > Boss-Angriff mit Trefferfläche > Spielerin > Gegner und Geschosse > Pet, Rüstungs- und Item-Effekte > Münzen, Partikel, Hintergrund.
- **Abdunkeln:** osu! dunkelt den ganzen Hintergrund einstellbar ab, damit die Kreise lesbar bleiben; dunkle Kreisfarben leiden bei hohem Abdunkeln [Q13]. Barrierefreiheits-Richtlinien empfehlen, Hintergrundbewegung abschaltbar zu machen [Q12] und bewegte Inhalte pausierbar oder abschaltbar zu machen; das Gameplay selbst ist davon ausgenommen [Q9].
- **Kontrast:** Spielwichtige grafische Objekte brauchen mindestens 3:1 gegen die angrenzenden Farben; bei Verläufen zählt die Stelle mit dem schwächsten Kontrast [Q11]. Xbox verlangt 4,5:1 für normal große, spielwichtige Elemente und 3:1 für große, dazu Umrisse (hell und dunkel) und abdunkelbare Hintergründe [Q10]. Ein Kreis mit 40 px Durchmesser in einer 360 px hohen Arena ist am iPhone eher „normal groß“, also besser 4,5:1.
- **Abgrenzung zu AP-165:** AP-165 regelt Zeichenreihenfolge und Kontrast über vorhandene Tokens. Was fehlt: eine **Regel für die Effektdichte während der Abwehr** (Hintergrund und Effekte niedriger Rangstufe zurücknehmen) und der Prüfmaßstab für den Kontrast gegen den schwächsten Hintergrund. Das ergänzt AP-165, ersetzt es nicht.

### 7. Zu den Ideen des Nutzers

- **Zentrale Balancing-Tabelle:** Eine einzige Datei für alle Werte würde Arbeitspakete, die heute getrennte Dateien besitzen (§8), zusammenstoßen lassen. Empfehlung: Werte bleiben in ihren Dateien. Neu ist nur eine Datei mit **Zielwerten und Annahmen der Referenzspielerin**, an der sich die Tests messen (RS-05.1).
- **Simulationstest:** Ja, aber analytisch und deterministisch (wie `balance.test.ts`), nicht zufällig. Er rechnet je Level Referenz-Druck, Boss-Dauer, Gold je Minute, Pet-Anteil und Ankündigungs-Anteil und meldet Ausreißer (RS-05.1).
- **Dynamische Fairness:** verdeckt, siehe RS-05.6.
- **Effekt-Dichte-Regel:** siehe RS-05.7.

## Vorschläge an den Planner

### RS-05.1 – Referenzmodell und Ziel-Bänder als Test
- **Vorschlag:** Neue reine Logik `src/logic/balanceModel.ts` (ohne Phaser) und `src/config/balanceTargets.ts` mit den Annahmen der Referenzspielerin (Abschnitt 0: Gold aller Siege plus eine Niederlage je Level ab 10, 35/35/30-Verteilung, Trefferquote 0,9 beim Boss) und den Bändern. Test `tests/logic/balanceModel.test.ts` prüft für alle 41 Level: Referenz-Druck 0,75 bis 1,8; Level 40 ist der höchste Wert (1,7 bis 1,8); Schritt innerhalb eines Batches höchstens +12 %; jeder Batch beginnt unter dem Ende des vorigen; Gold je Minute weicht höchstens 10 % von den Nachbarleveln ab; Boss-Dauer und Pet-Anteil in den Bändern aus RS-05.3 und RS-05.4. Die alten Bänder aus AP-127 bleiben, wo sie nicht widersprechen. `docs/balancing.md` bekommt die Tabelle der Referenzspielerin.
- **Begründung:** Ergebnisse 0, 1, 3; die heutige Annahme (Stufe 10 bis 15) ist optimistisch, seit AP-127 prüft kein Test mehr die Fairness ab Level 21.
- **Plan-Bezug:** neues Paket (vor RS-05.2 bis RS-05.5); §4 „Grundregeln“ unverändert.
- **Größe:** M
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein (neues Modul in `src/logic`, neue Konfigurationsdatei)
- **Risiken:** Annahmen der Referenzspielerin (Trefferquote, Items) sind geschätzt; nach H-36/H-38 nachjustieren.
- **Status:** übernommen (freigegeben 2026-11-02, im Plan M11)

### RS-05.2 – Kurve glätten: Wald-Finale und Doppelzählung ab Level 21
- **Vorschlag:** (a) **Level 1 bis 4:** Gegnerzahl-Faktor 1,5 / 1,6 / 1,75 / 1,9 / 2,0 (statt bis 2,5), Stufen-HP im Wald +5 % statt +8 % je Stufe (ab Level 5 wieder 2,5 bzw. +8 %). Referenz-Druck dann etwa 0,77 / 0,91 / 1,11 / 1,31 / 1,54. `xp` und `coin` passen sich über den Faktor von selbst an. (b) **Level 31 bis 40:** `M5_HP` so setzen, dass der Referenz-Druck linear von 1,30 auf 1,80 steigt: etwa 1,250 / 1,209 / 1,186 / 1,156 / 1,138 / 1,122 / 1,112 / 1,106 / 1,098 / 1,093 (heute 1,385 bis 2,422), die Stufe trägt den Anstieg wie in Level 5 bis 20. (c) Level 21 bis 30 bleiben (0,93 bis 1,80), optional `hp` je Batch flach (dann 0,93 bis 1,41).
- **Begründung:** Ergebnisse 0 und 1 (Spitze Level 4: 2,12; Oase bis 3,99 durch Doppelzählung `M5_HP` + `TIER_RULES`).
- **Plan-Bezug:** §2 F-25 („danach steigt der Faktor bis 2,5“: erreicht jetzt Level 5 statt 4, Wortlaut prüfen), `levels.ts` (`ENEMY_COUNT_FACTOR`), `tiers.ts` (Stufe je Batch), `scaling.ts` (`M5_HP`), `balance.test.ts` (Bänder ab AP-127 anpassen), `docs/balancing.md`.
- **Größe:** M
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein
- **Risiken:** Oase fühlt sich „weicher“ an, als der Nutzer es nach M7 gewohnt ist (gewollt laut 1a); Tests aus AP-127 („Druck mindestens 2,3-mal alt“) widersprechen und müssen geändert werden; `TIER_RULES` kennt heute vermutlich keinen Wert je Batch (Coder prüft).
- **Status:** übernommen (freigegeben 2026-11-02, im Plan M11)

### RS-05.3 – Boss-HP an die erwartbare DPS koppeln, Ankündigungs-Anteil begrenzen
- **Vorschlag:** (a) Boss-HP je Level = Zielzeit · Referenz-DPS (Laser der Referenzspielerin · 0,9 · 1,5 für Doppelschuss im Mittel, plus Pet-Anteil nach RS-05.4). Zielzeit: Batch-Start etwa 20 bis 28 s, Batch-Ende 30 bis 38 s, Level 40 etwa 45 s. Richtwerte ohne Pet: Level 0 1 080, 4 1 990, 9 3 250, 20 6 460, 21 4 780, 25 7 650, 30 9 640, 31 7 360, 40 14 120 (heute 1 000 bis 7 989; ab Level 21 etwa ×2,2 bis ×2,4). Umsetzung als `baseHp` je Boss plus eigener Schritt je Index oder als Tabelle je Level. (b) Ankündigungs-Anteil je Boss höchstens 0,40: Abklingzeit der schnellen Angriffe verlängern (z. B. `rootThrust` 3,5 → 5 s, `orbFan` 3,5 → 5 s, `spikeVolley` 4 → 5,5 s, `goldCurse` 4,5 → 6 s); Telegraph-Zeiten (≥ 1,2 s, PE-157) bleiben. (c) Test: Boss-Dauer der Referenzspielerin im Zielband, jeder Angriff des Levels erscheint bei Zielzeit mindestens einmal.
- **Begründung:** Ergebnis 2 (Kämpfe ab Level 21 5 bis 16 s mit Doppelschuss, Zusatzangriffe aus M9 erscheinen selten; 0,5 bis 0,6 Ankündigungs-Anteil). Kein Schadensfenster per Konter (PE-158).
- **Plan-Bezug:** `src/config/bosses.ts`, `src/logic/boss.ts` (Formel), `tests/logic/boss*.test.ts`, `docs/balancing.md`, `docs/gegner-und-maps.md`; **nach AP-164**, weil das Pet dann mitzählt.
- **Größe:** M
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein
- **Risiken:** Ohne Doppelschuss dauern späte Kämpfe bis etwa 70 s (Timer läuft weiter, PE-18), das kann zäh wirken. RS-05.6 fängt Niederlagen ab. Werte nach H-38 nachjustieren (RI-40 „nicht zu leicht“).
- **Status:** übernommen (freigegeben 2026-11-02, im Plan M11)

### RS-05.4 – Pet-Power-ups nur auf den Schaden, Pet-Anteil begrenzen
- **Vorschlag:** `PET_RULES.powerUpSpeedMul` 1,3 → 1,0 (oder beide Faktoren 1,15), so dass 3 Power-ups etwa 2,2-fach statt 4,8-fach ergeben. Ziel-Band im Test (RS-05.1): Anteil des Pets am Gesamtschaden der Referenzspielerin mit 3 Power-ups 20 bis 40 % gegen ein Ziel (Boss). Capybara-Aura gegen viele Gegner zusätzlich auf höchstens N Ziele je Tick begrenzen (Startwert 8), wenn der Test sie als Ausreißer meldet.
- **Begründung:** Ergebnis 4 (Biene heute etwa 55 bis 60 % des Schadens, unverwundbar, am stärksten im Bosskampf).
- **Plan-Bezug:** `src/config/pets.ts`, `src/logic/pets.ts`, `tests/logic/pets*.test.ts`, `docs/balancing.md` (PE-170 ändern).
- **Größe:** S
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein
- **Risiken:** Pets fühlen sich schwächer an als im ersten Handtest; ändert nicht den Ei-Rhythmus. Mit RS-05.3 zusammen einstellen.
- **Status:** übernommen (freigegeben 2026-11-02, im Plan M11)

### RS-05.5 – Rüstungs-Effekte relativ zum Laserschaden
- **Vorschlag:** Dornen, Brand und Explosion als Anteil am aktuellen Laserschaden statt fester Zahlen: Dornen 1,0 ·, Brand 0,5 · je Sekunde, Explosion 1,5 · Laserschaden. Bei Grundwaffe (10 Schaden) entspricht das genau den heutigen Werten 10 / 5 / 15, später wachsen sie mit den Upgrades. Feuerring-Item (20/s) unverändert.
- **Begründung:** Ergebnis 3 (feste Zahlen zu stark in Level 0 bis 4, bedeutungslos ab etwa Level 25; RI-32), gleiches Muster wie bei den Pets.
- **Plan-Bezug:** `src/config/gear.ts`, Logik der Rüstungs-Effekte (`src/logic/`), Tests; `docs/balancing.md` (PE-169).
- **Größe:** S
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein
- **Risiken:** Höllen-Set wird spät deutlich stärker; Brand und Explosion zählen nicht im Referenz-Druck (bewusst Bonus).
- **Status:** übernommen (freigegeben 2026-11-02, im Plan M11)

### RS-05.6 – Verdeckter „Rückenwind“ nach Niederlagen
- **Vorschlag:** Neues optionales Feld im Spielstand v3 (`assist`: Stufe 0 bis 3 je Level-ID). Nach der 2. Niederlage in Folge im selben Level +1 Stufe, nach jeder weiteren Niederlage +1, höchstens 3; ein Sieg setzt das Level auf 0. Je Stufe: Gegner-HP ·0,92, Spawn-Abstand ·1,06, Boss-HP ·0,90, Boss-Schaden ·0,90 (Stufe 3: HP 0,78, Boss 0,73). Untergrenze: der Referenz-Druck fällt nie unter den des ersten Levels im Batch. Gold, Erfahrung, Diamanten und die Abwehr-Zeitfenster bleiben unverändert, nichts wird angezeigt. Abbruch über das Pausemenü (F-30) zählt nicht als Niederlage. „Fortschritt zurücksetzen“ löscht das Feld. Reine Funktion in `src/logic/assist.ts`, angewendet beim Rundenstart.
- **Begründung:** Ergebnis 5 (Hamlet [Q1], verdeckte Anpassung erhöht Immersion [Q2], kein Nachteil automatischer Anpassung [Q4]); Nutzerentscheidung 2b; fängt das Risiko aus RS-05.3 ab.
- **Plan-Bezug:** §2 neue Funktion (F-Eintrag), §4 Datenmodell (SaveGame-Feld), neues Paket. Da Was und Warum schon geklärt sind, direkt über den Planner möglich; alternativ zuerst über den Product Owner ins Backlog.
- **Größe:** M
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** Datenmodell: neues optionales SaveGame-Feld (nur lokal, keine personenbezogenen Daten)
- **Risiken:** Bemerkt der Nutzer die Anpassung, kann sie sich wie „geschenkt“ anfühlen [Q3 zeigt eher das Gegenteil]; Handtester messen mit `?level` andere Werte als nach Niederlagen (Debug-Anzeige der Stufe nur mit `?fps=1` empfehlenswert).
- **Status:** übernommen (freigegeben 2026-11-02, im Plan M11)

### RS-05.7 – Quicktime-Fokus: Effektdichte-Regel während der Abwehr
- **Vorschlag:** Ergänzung zu AP-165. Solange ein Abwehr-Kreis aktiv ist (Ankündigung bis Auflösung): (a) Map-Hintergrund und Boss-Arena-Deko auf etwa 60 bis 70 % Helligkeit abdunkeln (Token für Abdunkelung und Übergang ≤ 120 ms, mit „Bewegung reduzieren“ ohne Übergang); (b) Effekte der unteren Rangstufen (Pet, Rüstung, Feuerring, Münzen, Partikel) auf etwa 40 % Deckkraft und ohne neue Partikel-Emissionen im Ring um die Spielerin bis etwa 110 px (Kreis-Abstand 56 + Ringstart 2,5 · 20); (c) Kontrastregel im Design-System: Kreis und Ring mindestens 4,5:1 gegen die **schwächste** angrenzende Hintergrundfarbe, Umriss hell und dunkel; (d) „EFFEKTE REDUZIEREN“ (M10) senkt diese Effekte zusätzlich dauerhaft in der Runde. Rangfolge der Effekte als reine Funktion mit Test (Tiefe und Deckkraft je Rangstufe).
- **Begründung:** Ergebnis 6 (Rangfolge [Q8], Abdunkeln [Q13][Q12], Kontrast [Q10][Q11], abschaltbare Bewegung [Q9]); Nutzerrückmeldung zum Clutter.
- **Plan-Bezug:** nach AP-165 (dessen Diagnose zeigt, welche Effekte stören); Designer-Nachtrag für Token und Rangfolge; `ParryOverlay.ts`, Effekt-Klassen der Pets und Rüstung, `GameScene.ts` (Abdunkel-Ebene), `theme.ts` über Theme-Sync.
- **Größe:** M
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** Architektur: neuer Ablauf „Fokus-Zustand“ zwischen Abwehr und Effekten (Event oder Abfrage); Design: neue Tokens
- **Risiken:** Abdunkeln selbst ist ein Helligkeitswechsel. Er bleibt weich und großflächig unter der Grenze von 3 Blitzen/s (§5), ist aber im Handtest zu prüfen. Mehr Zeichenaufrufe am iPhone sind nicht zu erwarten (Deckkraft statt neuer Objekte).
- **Status:** übernommen (freigegeben 2026-11-02, im Plan M11)

## Vertrauen und Lücken

- **Eigene Rechnung statt Messung:** Referenz-Druck, Boss-Dauer und Pet-Anteil sind analytisch aus `balancing.md` und dem Code (Stand `dev` 4ff26a4) gerechnet, nicht gemessen. Trefferquote (0,9 Boss), Item-Faktor (1,5) und Gold-Verteilung (35/35/30) sind Annahmen. Die Gold-Werte ab Level 21 stammen aus der Tabelle AP-127; Abweichungen ±2 % sind möglich.
- **Kurven-Bänder (0,75 bis 1,8, Schritt ≤ 12 %):** aus dem Projekt abgeleitet (Level 5 bis 30 liegen heute schon so), nicht aus einer Quelle. Für Sägezahn-Kurven und Boss-Längen fand ich nur Blogs und ein Fan-Wiki (schwach belegt).
- **DDA-Studien:** Die Volltexte von Hunicke 2005, Denisova 2015 und Smeddinck 2016 konnte ich nicht lesen (PDF nicht auslesbar, ACM gesperrt); die Aussagen stützen sich auf die Abstracts. Die Studien sind klein (z. B. 40 Teilnehmende) und nicht mit Shootern dieser Art gemacht. Denisova 2019 [Q3] widerspricht dem Gedanken „verdeckt ist besser“ leicht. Der Nutzer hat sich trotzdem bewusst für verdeckt entschieden (2b).
- **Clutter-Ursache:** Welcher Effekt die Kreise tatsächlich verdeckt, zeigt erst die Diagnose in AP-165. RS-05.7 ist so gebaut, dass es unabhängig davon wirkt.
- **Vom Nutzer zu prüfen:** ob die Oase nach RS-05.2 noch fordernd genug ist (1a war die Vorgabe), und ob sich Bosskämpfe von 30 bis 45 s gut anfühlen. Am besten im Handtest H-38 mit `?level` 4, 20, 30, 40.
- **Nebenbefund:** RS-01.1 bis .6 haben den Status `freigegeben`, die IDs kommen im Plan aber nicht vor. Vermutlich sind sie unter anderen Namen eingeflossen (AP-91, AP-95). Der Planner sollte das prüfen.

## Quellen

- [Q1] Hunicke, Chapman: AI for Dynamic Difficulty Adjustment in Games (Hamlet), Northwestern University, https://users.cs.northwestern.edu/~hunicke/pubs/Hamlet.pdf, 2004; dazu Hunicke: The Case for Dynamic Difficulty Adjustment in Games, ACE 2005; Abruf 2026-11-02 (nur Abstract/Projektseite gelesen) – Primärquelle
- [Q2] Denisova, Cairns: Adaptation in Digital Games: The Effect of Challenge Adjustment on Player Performance and Experience, CHI PLAY 2015, https://cronfa.swan.ac.uk/Record/cronfa39565, Abruf 2026-11-02 (Abstract) – Primärquelle
- [Q3] Denisova, Cairns: Player Experience and Deceptive Expectations of Difficulty Adaptation in Digital Games, Entertainment Computing 2019, https://eprints.whiterose.ac.uk/id/eprint/139704/, Abruf 2026-11-02 – Primärquelle
- [Q4] Smeddinck u. a.: How to Present Game Difficulty Choices? Exploring the Impact on Player Experience, CHI 2016, https://research.tue.nl/en/publications/how-to-present-game-difficulty-choices-exploring-the-impact-on-pl/, Abruf 2026-11-02 (Abstract) – Primärquelle
- [Q5] Chen: Flow in Games (and Everything Else), Communications of the ACM 50(4), 2007, https://khoury.northeastern.edu/~lieber/courses/csu670/f08/materials/p31-chen-flow-in-games.pdf, Abruf 2026-11-02 (nur Zusammenfassungen) – Primärquelle
- [Q6] Engadget: Resident Evil 4 secretly adjusted its difficulty for you, https://www.engadget.com/2015-06-03-resident-evil-4-difficulty.html, 2015-06-03 – Sekundärquelle (schwach)
- [Q7] Activision-Aussage zur Schwierigkeit der N. Sane Trilogy, wiedergegeben in https://cogconnected.com/2017/07/crash-bandicoot-difficulty-vv/, 2017 – Sekundärquelle (schwach)
- [Q8] Riot Games: Clarity in League, https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/, 2021-03-12 – Primärquelle
- [Q9] Microsoft: Xbox Accessibility Guideline 117 (Visual distractions and motion settings), https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117, Stand 2026-06-17 – Primärquelle
- [Q10] Microsoft: Xbox Accessibility Guideline 102 (Contrast), https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102, Stand 2026-06-17 – Primärquelle
- [Q11] W3C: Understanding SC 1.4.11 Non-text Contrast (WCAG 2.2), https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html, Abruf 2026-11-02 – Primärquelle
- [Q12] Game Accessibility Guidelines: Provide an option to turn off / hide background movement, https://gameaccessibilityguidelines.com/provide-an-option-to-turn-off-hide-background-movement/, Abruf 2026-11-02 – Primärquelle (Richtlinien-Sammlung)
- [Q13] osu! wiki: Visual settings (Background dim), https://osu.ppy.sh/wiki/Client/Interface/Visual_settings, Abruf 2026-11-02 – Primärquelle (Hersteller-Wiki)
- [Q14] Pecorella: The Math of Idle Games, Part I, Game Developer (Kongregate), https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i, 2016-10-13 – Primärquelle (Fachartikel)
- [Q15] Fachartikel und Blogs zu Sägezahn-Kurven und Boss-Pacing, z. B. https://reverttosaved.com/2012/08/02/bashing-your-head-against-the-difficulty-wall/ und https://www.gamedeveloper.com/design/boss-battle-design-and-structure – Sekundärquelle (schwach)
- [Q16] Brotato Wiki: Waves, https://brotato.wiki.spellsandguns.com/Waves, Abruf 2026-11-02 – Fan-Wiki (schwach)
- [Q17] Projekt: `docs/balancing.md`, `src/config/{levels,scaling,bosses,pets,shop,upgrades,parry}.ts`, `src/logic/pets.ts` (`petStats`), Plan §9.2 H-36/H-38, PE-194, PE-205, PE-206; Stand `dev` 4ff26a4 – Projektdaten

## Entscheidungen
- Nutzer am 2026-11-02: Rückfragen beantwortet: 1a (Fairness mit realistisch erspielten Upgrades, Druck-Band), 2b (Rückenwind verdeckt), Diamanten-Knappheit bleibt.
- Nutzer am 2026-11-02: RS-05.1 bis RS-05.7 freigegeben
