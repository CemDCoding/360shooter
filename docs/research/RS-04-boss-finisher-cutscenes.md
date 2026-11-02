# RS-04 – Boss-Finisher: Zwischensequenzen im Anime-Stil

**Auftrag (Nutzer am 2026-11-02):** Nach jedem Boss-Sieg soll eine bildschirmfüllende Zwischensequenz im Stil von Anime-Fighting-Games (z. B. Naruto Shippuden Ultimate Ninja Storm) laufen, die pro Batch epischer wird; das letzte Level jedes Batches bekommt eine richtig animierte Sequenz, die das endgültige Besiegen des Bosses zeigt.
**Projektbezug:** Phaser 3.90.0, TypeScript, `type: Phaser.AUTO`, `pixelArt: true` (`src/main.ts`). 6 Batches mit je einem Boss, letzte Level 4, 9, 20, 25, 30, 40 (`MAP_FINAL_LEVELS`). Heute: `GameScene.onBossDefeated` spielt `sfx-boss-defeated`, sendet `boss-defeated`, ruft `round.bossDefeated()`, die Runde endet sofort mit Sieg (F-05, PE-76). Grenzen: keine neue Abhängigkeit (§3), nur eigene Assets (§5, R1), Spielwerte in `src/config`, Logik ohne Phaser (§4 Grundregel 1), Arena 640..900 × 360 randlos mit `SafeInsets` (§4), 60 fps auf iPhone (§5), keine externen Requests.
**Kriterien:** ohne neues Paket baubar; läuft auch ohne WebGL-FX; iPhone-tauglich; Pixel-Stil mit eigenen Assets; Werte in `config`, Ablauf testbar; volle Breite und Safe-Area; Fotosensitivität; kurzer Weg zum Ergebnis; Aufwand für den Designer realistisch.
**Antworten des Nutzers (2026-11-02):** (1b) Das letzte Level jedes Batches bekommt die große Sequenz. (2a) Bei jedem Boss-Sieg, kurz, nach dem ersten Ansehen per Tipp überspringbar. (3) Normale Level: hauptsächlich Effekte plus wenige Pixel-Bilder; letzte Level je Batch: weitgehend handanimiert. (4a) Schalter „Effekte reduzieren“ im Pausemenü.

## Kurzantwort

Die Vorbilder arbeiten mit einem kleinen, gut belegten Werkzeugkasten: kurzer Stillstand beim Treffer (Hitstop), Zeitlupe, Kamera-Zoom auf den Treffpunkt, eingefärbter Hintergrund, Wackeln, das abklingt, Impact Frames (kontrastreiche Einzelbilder), Porträt-Einblendungen und ein großer Schriftzug. Phaser 3.90 bringt dafür alles mit (Kamera-Effekte, `Timeline`, Tween-Ketten, Partikel), WebGL-FX nur als Zugabe, weil sie im Canvas-Modus fehlen. Empfohlen wird eine eigene Overlay-Szene mit einem datengetriebenen Baustein-Ablauf in 6 Eskalationsstufen (eine je Batch), für die letzten Level je Batch zusätzlich eine handgezeichnete Bildfolge pro Boss, mit Level 40 als Höhepunkt. Blitze müssen unter 3 pro Sekunde bleiben (WCAG 2.3.1), Überspringen und „Effekte reduzieren“ sind etablierte Barrierefreiheits-Empfehlungen.

## Ergebnisse

### 1. Welche Stilmittel machen Finisher-Sequenzen in Anime-Fighting-Games aus?

- **Hitstop:** Beim Treffer frieren Angreifer und Ziel gleich lange ein; stärkere Treffer frieren länger, aber mit Obergrenze. Das Ziel vibriert, die Vibration beginnt groß und klingt ab [Q1]. Sakurai empfiehlt, bei großen Momenten anzuhalten und Zeitlupe nur kurz einzusetzen, dann wieder normal weiterzulaufen, damit sie wirkt [Q2] (schwach belegt: Zusammenfassung des Videos über eine Sekundärquelle).
- **Studie:** Hitstop, zum Treffer passender Ton und Kameraführung beeinflussen das Treffergefühl am stärksten; fehlt eines davon, kann das Gefühl kippen [Q3].
- **Schlusstreffer-Zoom (Smash Ultimate):** Bei einem voraussichtlich spielentscheidenden Treffer verlangsamt sich die Zeit kurz, die Kamera zoomt auf den Treffpunkt, der Hintergrund wird einfarbig rot (bei der „Special Zoom“ blau mit Funken zum Treffpunkt), dazu ein fester Signalton und ein erschrockenes Gesicht des Getroffenen [Q4]. Frame-Zahlen nennt die Quelle nicht.
- **Ninja Storm:** Jede Figur hat ein „Ultimate Jutsu“. Trifft es, entscheidet im ersten Teil ein Eingabe-Duell (Tasten drücken, hämmern oder Stick drehen) über die Wirkung; der „Ultimate Impact“ zeigt eine Nahaufnahme des Gesichts beim schweren Treffer [Q5]. Genaue Kamera- und Schnittstruktur der Sequenzen war in Primärquellen nicht zu finden (Lücke).
- **Street Fighter 6:** Die stärkste Super wird bei wenig Leben (≤ 25 %) zur „Critical Art“ mit erweiterter Filmsequenz; der Gegner kann während der Sequenz nicht handeln [Q6] (schwach belegt, Wiki und News-Seiten).
- **Dragon Ball FighterZ:** „Dramatic Finishes“ sind eigene Filmsequenzen, die nur bei bestimmten Paarungen auf bestimmten Stages zum Rundenende laufen [Q7] (schwach belegt, Spieleführer). Übertragbar: Die besondere Sequenz ist an einen besonderen Moment gebunden, hier an das letzte Level des Batches.
- **Impact Frames:** Kurze, besonders gezeichnete Einzelbilder mit übertriebenen Posen und harten Kontrasten (oft Schwarz-Weiß oder invertiert), die einen Treffer betonen [Q8] (schwach belegt, keine wissenschaftliche Definition gefunden).

**Bewertung für das Projekt:** Alle genannten Mittel außer der handgezeichneten Bildfolge lassen sich aus vorhandenen Sprites, Formen und Text erzeugen. Das Eingabe-Duell aus Ninja Storm passt zur vorhandenen Quicktime-Mechanik (F-29, F-36), ist aber nicht beauftragt; siehe „Vertrauen und Lücken“.

### 2. Wie werden 6 Stufen sichtbar epischer, mit dem Batch-Finale als Spitze?

Aus 1. abgeleitet (eigene Bewertung, keine Quelle): Jede Stufe nimmt die Bausteine der vorigen mit und fügt ein bis zwei neue hinzu; die Dauer wächst langsam. Das letzte Level des Batches spielt dieselbe Stufe, ersetzt aber den Mittelteil durch eine handanimierte Bildfolge des jeweiligen Bosses.

| Stufe | Batch (Boss) | neue Bausteine | Dauer normal (Startwert) | Batch-Finale (Level) |
|---|---|---|---|---|
| 1 | Wald (Baummonster) | Hitstop, Zoom auf den Boss, abklingendes Wackeln, Schriftzug | ≈ 2 s | Level 4, ≈ 5 s |
| 2 | Wald bei Nacht (Waldgeist) | + Zeitlupe, Kinobalken | ≈ 2,5 s | Level 9, ≈ 6 s |
| 3 | Elfenwald (Riesen-Stein) | + Speedlines, einfarbiger Hintergrund (Smash-Prinzip) | ≈ 3 s | Level 20, ≈ 6 s |
| 4 | Wüste (Sand-Wurm) | + Impact Frame, Porträt-Einblendung (Augenstreifen der Astronautin) | ≈ 3,5 s | Level 25, ≈ 7 s |
| 5 | Pyramiden (Wächter-Hund) | + geteilte Manga-Panels, Partikelsturm beim Zerfall | ≈ 4 s | Level 30, ≈ 8 s |
| 6 | Pyramiden-Oase (Pharao) | alles, längster Zerfall | ≈ 4 s | **Level 40, ≈ 10–12 s, Finale des Spiels** |

Die Zahlen sind Startwerte für den Handtest, keine Quelle belegt eine „richtige“ Dauer.

### 3. Was bietet Phaser 3.90 ohne zusätzliches Paket, und was ist auf dem iPhone riskant?

- **Kamera:** eingebaute zeitgesteuerte Effekte Fade, Flash, Pan, Rotate, Shake, Zoom; mehrere Kameras pro Szene; `camera.ignore()` blendet Objekte für eine Kamera aus [Q9].
- **Ablauf:** `this.add.timeline([...])` (seit 3.60, `timeScale` seit 3.85) plant Aufrufe, Tweens, Sounds und Events zu festen Millisekunden; startet pausiert, `play()`, `pause()`, `stop()`, Ereignis `COMPLETE` [Q10]. Tween-Ketten (`this.tweens.chain`), `tweens.timeScale` global, Easings wie `Expo`, `Back` [Q11]. Das passt zum Ablauf als Datenliste (`at`, Baustein) in `src/config`.
- **Zeitlupe:** Der Szenen-Takt treibt Tweens, Sound und Sprite-Animationen; Timer und Tween-Manager haben je ein eigenes `timeScale` [Q12][Q11]. Eigene Spiellogik in `GameScene.update` muss die Zeitlupe selbst berücksichtigen (aus der Quelle nicht ableitbar, eigene Bewertung).
- **Szenen:** Eine pausierte Szene wird weiter gezeichnet, aber nicht aktualisiert; `launch()` startet eine zweite Szene parallel [Q13]. Damit kann die Spielszene stehen bleiben (keine Gegner bewegen sich, kein Schaden), während eine Overlay-Szene darüber die Sequenz zeigt. Ob Kamera-Effekte einer pausierten Szene weiterlaufen, sagt die Doku nicht; deshalb sollte das Overlay seine eigene Kamera und eigene Objekte (Boss- und Spielerin-Sprite als Kopie) nutzen.
- **FX (Bloom, Glow, Vignette, Shine, Wipe, Pixelate …):** seit 3.60, **nur WebGL**, im Canvas-Modus nicht verfügbar; Bloom und Blur werden mit mehr `steps` „exponentiell“ teurer [Q14]. Das Projekt läuft mit `Phaser.AUTO`, kann also auf Canvas zurückfallen. FX daher nur als optionale Zugabe, nie als tragender Effekt. Messwerte für iPhone fand ich nicht (Lücke); FPS-Prüfung mit `?fps=1` im Handtest.
- **Pixel-Art:** Mit `pixelArt: true` bleiben Kanten scharf; Zoomstufen in ganzen Zahlen vermeiden flimmernde Pixel (eigene Bewertung, nicht belegt).

### 4. Dauer, Überspringen, Fotosensitivität

- **Blitze (WCAG 2.3.1, Stufe A):** höchstens 3 allgemeine bzw. 3 rote Blitze pro Sekunde, oder die blitzende Fläche bleibt unter etwa 25 % eines 10°-Sichtfelds (Referenz 341 × 256 CSS-Pixel). Ein „Blitz“ ist ein Paar gegenläufiger Helligkeitswechsel um ≥ 10 % der Maximalhelligkeit, wobei der dunklere Zustand unter 0,80 liegt; satte Rottöne zählen gesondert [Q15]. Vollbild-Impact-Frames und Kamera-Flash sind auf dem Handy immer großflächig, müssen also unter die 3-pro-Sekunde-Grenze. Grundlage der Werte ist ITU-R BT.1702 [Q15]; die Harding-Prüfsoftware setzt dieselben Richtlinien um und gilt bei interaktiven Medien nur für typische Spielwege [Q16] (Sekundärquelle).
- **Überspringen:** Die Game Accessibility Guidelines empfehlen, Spielteile außerhalb der Kernmechanik per Einstellung oder Skip überspringbar zu machen, und eine Option, Hintergrundbewegung abzuschalten [Q17]. Kamerawackeln als abschaltbare Ablenkung führen die Xbox-Barrierefreiheitsrichtlinien (schwach belegt, nur über Suchergebnis gesehen).
- **Bewertung:** Die Wahl des Nutzers (2a, 4a) entspricht diesen Empfehlungen. Da die Runde schon gewonnen ist, verändert die Sequenz kein Ergebnis; sie darf aber den Weg zum Ergebnis nicht dauerhaft verlängern.

### 5. Was braucht der Designer, und wo endet „inspiriert von“?

- **Normale Level (Stufe 1–6):** Effekte aus Formen und vorhandenen Sprites. Neu nur wenige Bilder: Porträt-Streifen der Astronautin (z. B. Augenpartie, 1–2 Varianten), je Boss ein „getroffen“-Bild (vgl. erschrockenes Gesicht bei Smash [Q4]), ein Schriftzug-Stil (vorhandene Bitmap-Schrift, PE-64 Zeichensatz beachten).
- **Batch-Finale (Level 4, 9, 20, 25, 30, 40):** je Boss eine handgezeichnete Bildfolge (Finisher-Pose der Astronautin, Treffer, Zerfall des Bosses), Level 40 mit der längsten Folge. Die Sprite-Pipeline des Projekts (`sprites.js` → `npm run sprites:build`) kann sie aufnehmen; `build-sprites.test.ts` zählt Sprites fest (Lagebericht), das muss das Paket mitpflegen. Die Zahl der Bilder ist eine Aufwandsfrage für Designer und Planner.
- **Ton:** neue Platzhalter-Töne (z. B. Aufladen, Schlusstreffer, Signalton) über `generate-placeholders.mjs`, `LICENSES.md` und `.placeholders.json` (Befund aus M7: dort fehlte schon einmal ein Ton).
- **Urheberrecht (vom Nutzer zu prüfen, keine Rechtsberatung):** Geschützt sind persönliche geistige Schöpfungen, also die konkrete Gestaltung [Q18]; Spielideen, Techniken und Stil gelten in der Kommentar- und Kanzleiliteratur als frei, konkrete Figuren, Bilder, Musik und Texte dagegen als geschützt [Q19] (schwach belegt, Sekundärquellen). Für das Projekt heißt das: Stilmittel wie Speedlines, Impact Frames oder Cut-ins sind frei; keine Posen, Bilder, Töne, Namen oder Schriftzüge aus Naruto oder anderen Spielen nachbauen, eigene Namen für Angriffe und Schriftzüge verwenden. Wichtig vor einer Veröffentlichung (§5, Kommerzialisierung).

## Vorschläge an den Planner

### RS-04.1 – Finisher-Szene mit datengetriebenem Baustein-Ablauf
- **Vorschlag:** Neue Funktion F-38 „Boss-Finisher“. Nach `onBossDefeated` pausiert die Spielszene (Gegner, Geschosse, Timer, Schaden stehen; die Runde ist schon gewonnen), eine neue Overlay-Szene (Arbeitsname `FinisherScene`) läuft über die ganze Breite (randlos, Text und Skip-Hinweis innerhalb `SafeInsets`) und startet danach wie bisher den Ergebnis-Bildschirm. Der Ablauf ist eine Datenliste in `src/config/finishers.ts` (Baustein, Startzeit, Dauer, Stärke), Bausteine u. a. `hitstop`, `slowmo`, `zoom`, `shake` (abklingend), `letterbox`, `speedlines`, `bgColor`, `impactFrame`, `cutIn`, `panels`, `shatter`, `title`, `frames` (Bildfolge). Eine reine Funktion in `src/logic/finisher.ts` wählt aus `levelId` die Stufe (Batch-Index) und ob es ein Batch-Finale ist (`MAP_FINAL_LEVELS`) und liefert den fertigen Ablauf, getestet mit Vitest. Abspielen mit Phaser `Timeline`; Gold- und Erfahrungsgutschrift unverändert. WebGL-FX nur optional mit Rückfall auf Canvas.
- **Begründung:** Ergebnisse 1 und 3 [Q1]–[Q4], [Q9]–[Q14]; Grundregeln §4 (Logik ohne Phaser, Werte in `config`).
- **Plan-Bezug:** §2 neue Pflicht F-38 (ändert den Ablauf von F-05/PE-76: Sieg sofort, Ergebnis nach der Sequenz), §4 neue Szene und Vertrag, neues Paket.
- **Größe:** L
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** Architektur: neue Szene, neuer Vertrag (Finisher-Ablauf), Pause der Spielszene; keine neue Abhängigkeit
- **Status:** freigegeben (2026-11-02)

### RS-04.2 – Sechs Eskalationsstufen für normale Boss-Siege
- **Vorschlag:** Je Batch eine Stufe nach der Tabelle in Ergebnis 2: Stufe 1 Hitstop, Zoom, Wackeln, Schriftzug (≈ 2 s); jede Stufe fügt Bausteine hinzu (Zeitlupe, Kinobalken, Speedlines, Farbhintergrund, Impact Frame, Porträt-Einblendung, Panels, Partikel) bis Stufe 6 (≈ 4 s). Dauer und Stärke sind Startwerte in `config`, Abnahme im Handtest. Neue Bilder nur: Porträt-Streifen der Astronautin und je Boss ein Treffer-Bild.
- **Begründung:** Ergebnis 1 (Werkzeugkasten der Vorbilder), Ergebnis 2; Nutzerantwort 3 (überwiegend Effekte).
- **Plan-Bezug:** §2 F-38, neues Paket, Designer-Nachtrag (wenige Sprites, Tokens für Farben der Hintergründe und Kinobalken)
- **Größe:** M
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein
- **Status:** freigegeben (2026-11-02)

### RS-04.3 – Handanimierte Batch-Finale (Level 4, 9, 20, 25, 30, 40)
- **Vorschlag:** Im letzten Level jedes Batches ersetzt eine handgezeichnete Bildfolge pro Boss den Mittelteil der Stufen-Sequenz (Finisher-Pose der Astronautin, Schlusstreffer mit Impact Frame, endgültiger Zerfall des Bosses), ≈ 5–8 s. Level 40 (Pharao) ist das Finale des Spiels: längste Folge, alle Bausteine, ≈ 10–12 s. Gestaltung durch den Designer mit eigenem Brief (Bildzahl, Bildrate, Maße für 640..900 × 360), Einbau über die Sprite-Pipeline, neue Platzhalter-Töne mit Lizenzeintrag. Nur eigene Gestaltung, keine Motive, Posen, Namen oder Töne aus Naruto oder anderen Spielen.
- **Begründung:** Nutzerantworten 1b und 3; Ergebnis 1 (besondere Sequenz an besonderen Moment gebunden [Q7]), Ergebnis 5 [Q18][Q19].
- **Plan-Bezug:** §2 F-38, Designer-Nachtrag, [Mensch]-Schritt Freigabe der Bildfolgen, neue Pakete Asset-Sync und Einbau, §5 Asset-Lizenzen
- **Größe:** L
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** Recht: Abgrenzung zu fremden Werken (vom Nutzer zu prüfen); Aufwand Designer hoch
- **Status:** freigegeben (2026-11-02)

### RS-04.4 – Überspringen nach dem ersten Ansehen
- **Vorschlag:** Jede Sequenz-Variante (Stufe × normal/Finale) läuft beim ersten Mal ganz. Danach zeigt ein Hinweis „TIPPEN: WEITER“ (innerhalb `SafeInsets`), Tipp, Klick oder Taste springt direkt zum Ergebnis. Gemerkt in einem optionalen SaveGame-Feld (z. B. `seenFinishers`, Liste der Varianten-IDs) im Spielstand v3 ohne neue Version, „Fortschritt zurücksetzen“ löscht es. Der erste Tipp darf nicht aus einem Quicktime-Tipp des Bosskampfs stammen (kurze Sperre am Anfang).
- **Begründung:** Nutzerantwort 2a; Ergebnis 4 [Q17].
- **Plan-Bezug:** §2 F-38, §4 SaveGame-Feld, Abnahmekriterium im Einbau-Paket
- **Größe:** S
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** Datenmodell: neues optionales SaveGame-Feld (nur lokal, keine personenbezogenen Daten)
- **Status:** freigegeben (2026-11-02)

### RS-04.5 – „Effekte reduzieren“ und Blitz-Grenze als Test
- **Vorschlag:** Schalter „EFFEKTE REDUZIEREN“ im Pausemenü (wie „Einfache Abwehr“, Standard aus, im SaveGame, z. B. `reduceEffects`): ohne Impact Frames und Kamera-Flash, ohne Wackeln, Zeitlupe und Zoom bleiben. Unabhängig vom Schalter gilt für jeden Ablauf: höchstens 3 großflächige Helligkeitswechsel-Paare pro Sekunde, keine schnell blinkenden satten Rottöne. Ein Vitest prüft das für alle Abläufe aus `config` (gleitendes 1-s-Fenster über die Bausteine `impactFrame`/`flash`).
- **Begründung:** Nutzerantwort 4a; Ergebnis 4 [Q15][Q16][Q17].
- **Plan-Bezug:** §5 neue Regel (Fotosensitivität), §2 F-38, Abnahmekriterium; Pausemenü-Layout (`pauseLayout.ts`) berührt
- **Größe:** S
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** Datenmodell: neues optionales SaveGame-Feld; Sicherheit (Gesundheit): Blitz-Grenze
- **Status:** freigegeben (2026-11-02)

## Vertrauen und Lücken

- **Gut belegt:** Phaser-Funktionen (offizielle Doku, Stand 2026-11-02), WCAG-Grenzwerte (W3C), Hitstop-Prinzip (Sakurai-Kolumne in Übersetzung), Smash-Zoom (SmashWiki, Community-Wiki, aber detailliert).
- **Schwach belegt:** genaue Gestaltung der Ninja-Storm-, Street-Fighter- und DBFZ-Sequenzen (nur Wikis, News und Spieleführer; keine Entwickler-Primärquelle gefunden), Definition der Impact Frames, Urheberrechts-Abgrenzung (Sekundärliteratur). Dauerwerte in Ergebnis 2 sind eigene Startwerte.
- **Nicht gefunden:** Messwerte für Phaser-FX und Vollbild-Effekte auf iPhone-Safari. Das muss der Handtest mit `?fps=1` klären; besonders die Partikel in Stufe 5/6 und die Bildfolgen im Finale.
- **Offen für Planner und Nutzer:** (a) Soll im Batch-Finale ein kurzes Eingabe-Duell wie bei Ninja Storm [Q5] (z. B. ein Quicktime-Tipp, der den Schlusstreffer auslöst) dazukommen? Nicht beauftragt, wäre eine Erweiterung; ohne Einfluss auf das Ergebnis, sonst Fairness-Frage. (b) Wie viele Bilder je Batch-Finale (Aufwand Designer). (c) Gilt die Sequenz auch, wenn der Boss nach Ablauf des Timers besiegt wird (F-05)? Empfehlung: ja, gleiche Sequenz.
- **Vom Nutzer zu prüfen:** Urheberrecht (keine Rechtsberatung), vor einer Veröffentlichung auch Altersfreigabe und Fotosensitivitäts-Hinweis.
- **Keine verdächtigen Inhalte** in den gelesenen Quellen gefunden.

## Quellen

- [Q1] Thoughts on Hitstop: Sakurai's Famitsu Column Vol. 490 (Übersetzung), Source Gaming, https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/, Stand 2015-11-11 – Sekundärquelle (Übersetzung einer Primärquelle)
- [Q2] This Week in Sakurai: Fine-Tuning Hit Stop, Nintendo Wire, https://nintendowire.com/news/2022/12/12/this-week-in-sakurai-12-5-12-11-fine-tuning-hit-stop-and-cheating-the-system/, Stand 2022-12-12 – Sekundärquelle (Video „Masahiro Sakurai on Creating Games“)
- [Q3] Lin, Duan, Wen, Cai: What Features Influence Impact Feel? A Study of Impact Feedback in Action Games, IEEE GEM 2022, https://arxiv.org/abs/2208.06155, Stand 2022-08 – Primärquelle
- [Q4] Finish Zoom / Special Zoom, SmashWiki, https://www.ssbwiki.com/Finish_Zoom, Abruf 2026-11-02 – Sekundärquelle (Community-Wiki)
- [Q5] Naruto: Ultimate Ninja Storm, Wikipedia, https://en.wikipedia.org/wiki/Naruto:_Ultimate_Ninja_Storm, Abruf 2026-11-02 – Sekundärquelle
- [Q6] Street Fighter 6, Wikipedia, https://en.wikipedia.org/wiki/Street_Fighter_6, Abruf 2026-11-02 – Sekundärquelle
- [Q7] Dragon Ball FighterZ – How to Perform a Dramatic Finish, Prima Games, https://primagames.com/tips/dragon-ball-fighterz-how-perform-dramatic-finish, Abruf 2026-11-02 – Sekundärquelle
- [Q8] Impact Frames, Know Your Meme, https://knowyourmeme.com/memes/cultures/impact-frames, Abruf 2026-11-02 – Sekundärquelle (schwach)
- [Q9] Cameras, Phaser Docs, https://docs.phaser.io/phaser/concepts/cameras, Abruf 2026-11-02 – Primärquelle
- [Q10] Phaser.Time.Timeline, Phaser API Docs, https://docs.phaser.io/api-documentation/class/time-timeline, Abruf 2026-11-02 – Primärquelle
- [Q11] Tweens, Phaser Docs, https://docs.phaser.io/phaser/concepts/tweens, Abruf 2026-11-02 – Primärquelle
- [Q12] Time, Phaser Docs, https://docs.phaser.io/phaser/concepts/time, Abruf 2026-11-02 – Primärquelle
- [Q13] Scenes, Phaser Docs, https://docs.phaser.io/phaser/concepts/scenes, Abruf 2026-11-02 – Primärquelle
- [Q14] FX, Phaser Docs, https://docs.phaser.io/phaser/concepts/fx, Abruf 2026-11-02 – Primärquelle
- [Q15] Understanding SC 2.3.1 Three Flashes or Below Threshold, W3C WAI (WCAG 2.2), https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html, Abruf 2026-11-02 – Primärquelle
- [Q16] Harding test, Wikipedia, https://en.wikipedia.org/wiki/Harding_test, Abruf 2026-11-02 – Sekundärquelle
- [Q17] Game Accessibility Guidelines, Intermediate, https://gameaccessibilityguidelines.com/intermediate/, Abruf 2026-11-02 – Primärquelle (Richtlinien-Sammlung)
- [Q18] § 2 UrhG Geschützte Werke, Bundesamt für Justiz, https://www.gesetze-im-internet.de/urhg/__2.html, Abruf 2026-11-02 – Primärquelle
- [Q19] Recht der Entwicklung von Computerspielen, Kanzlei Ferner Alsdorf, https://www.ferner-alsdorf.de/recht-der-entwicklung-von-computerspielen/, Abruf 2026-11-02 – Sekundärquelle

## Entscheidungen

- Nutzer am 2026-11-02: Rückfragen beantwortet (1b, 2a, 3 gemischt, 4a), siehe Kopf.
- Nutzer am 2026-11-02: RS-04.1 bis RS-04.5 freigegeben
