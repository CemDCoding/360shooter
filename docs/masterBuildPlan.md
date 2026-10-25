<!--
MASTER-BUILD-PLAN – VORLAGE (MultiAgent-System)

setup-project.ps1 kopiert diese Vorlage nach docs/masterBuildPlan.md im Projekt.
Der Planner-Agent (ma-planner) füllt sie im Interview mit dem Nutzer und pflegt sie danach.
Er ist der einzige Agent, der diese Datei ändert. Der Lead (ma-lead) steuert den Bau danach.
Grundlage der Regeln: MultiAgent/entscheidungen.md
-->

# Master-Build-Plan 360shooter

**Stand:** 2026-10-25 · **Planversion:** 1 · **Gepflegt von:** ma-planner · **Gesteuert von:** ma-lead · **Nutzer:** Cem Dogan

360shooter ist ein 2D-Pixel-Survival-Shooter im Metroid-Stil für Handy und PC. Eine Astronautin steht in der Bildschirmmitte, dreht sich um 360° und schießt automatisch mit einer Laserpistole in Blickrichtung. Sie muss in jeder Runde überleben, bis der Timer abläuft. Monster greifen von allen Seiten an. Der erste Stich umfasst die Level 0–20 (Batches Wald, Wald bei Nacht, Elfenwald) und läuft nur lokal. Grundlage ist die Idee in `idee.txt`. Meilensteine und Pakete folgen nach G1.

---

## 0. Gebrauchsanweisung

### Lagebericht

<!-- Übergabe an einen neuen Lead, der den bisherigen Chat nicht kennt. Der Planner ersetzt ihn bei jedem „Wellenabschluss“. Höchstens 10 Zeilen. -->

- **Stand:** 2026-10-25 · M0, M1, M2, M2b abgenommen (M2b-DEP am 2026-10-25, PC und iPhone) · `dev` auf d25bc66 (AP-56 und AP-57 gemergt), nach origin gepusht · **Design übernommen** (PE-59): M2c (AP-50–AP-55, M2c-DEP) liegt nach M2b-DEP und vor M3, Reihenfolge vom Nutzer bestätigt (PE-60, H-11). Handtest-Befunde: PE-61 (AP-56 erledigt, AP-53 offen). Lint-Fix: PE-62 (AP-57 erledigt)
- **Fertig:** AP-01–AP-15, AP-21–AP-36, AP-37a, AP-37c, AP-38, AP-39, AP-56 (gemergt cfcdde7), AP-57 (gemergt d25bc66, Lint-Fix), M0-DEP, M1-DEP, M2-DEP, M2b-DEP (alle in dev, Reviews bestanden). Checks auf dev grün: Install, lint (0 Fehler), typecheck, 254/254 Tests, assets:check, build. **Bereit:** AP-50, AP-51 (M2c W1). **Danach:** AP-52–AP-54 (W2), AP-55 (W3). **Offen:** AP-16–AP-20 (warten auf M2c-DEP), M2c-DEP, M3-DEP.
- **Budget:** `.claude/ma-usage.json`: team 0 % (Reset erfolgt, `resets_at` 2026-10-25 16:50 UTC), Zielwert 45 %, Obergrenze 54 % (§7.2). Das Budget ist für die nächste Welle frei.
- **Unterbrochen oder laufend:** Keine laufende Arbeit. Push `dev` nach origin erledigt (d25bc66, Lead-Angabe).
- **Erkenntnisse:** AP-36 gemergt: alte Waffen-Items, Event `weapon-changed` und 3 Platzhalter-PNGs entfernt. Außerhalb des Eigentums geändert: `tests/entities/ItemPickup.test.ts` und `public/assets/.placeholders.json` (§18). AP-31 war kurz vor AP-33 in dev rot (Lehre §18). Feuerring trifft Bosse ab M3 nur nach Entscheidung mit PE-34 (Q-23, §18). Design-Commit 5e58bf2 hat `npm run lint` rot gemacht, behoben mit AP-57 (§18).
- **Nächster Schritt:** Lead startet M2c W1 (AP-50, AP-51, beide `bereit`), dann W2 (AP-52 bis AP-54, je mit Design-Review; AP-53 trägt die Handtest-Befunde Stick-Größe und grauer Kasten), W3 (AP-55), M2c-DEP (mit den Prüfpunkten aus AP-56, §9.2). Erst nach M2c-DEP startet AP-16 (M3).
- **Offene Fragen an den Nutzer:** Q-32 Stick-Größe (Befund 10 % kleiner = 126 px oder Design-Token 88 px, AP-53 nimmt Token 88 mit Fangbereich 126 px, angenommen). Stumm-Taste im Debug-Modus (§18, offen). Zu bestätigen (angenommen): PE-34, PE-41, PE-43 bis PE-45, Startwerte in AP-56 (Baum-HP 50, Radiusfaktor 0,65). Vorschlag §16: Lead-Skript für Buchstaben-IDs (Werkzeug, Entscheidung Nutzer). Geklärt am 2026-10-25: H-11 (Reihenfolge), Q-31 (Timer-Text „BOSS!“).

<!-- Ende Lagebericht -->


### Rollen und Dokumente

| Wer / Was | Zweck |
|---|---|
| **Nutzer** [Mensch] | Teamleiter. Entscheidet über Security, Datenschutz, Vorgehensweise und Umfang, bringt `dev` → `stage` → `master`, richtet externe Dienste ein, füllt `.env`. |
| `ma-planner` (`.claude/agents/ma-planner.md`) | Interviewt den Nutzer, bis er „stop“ sagt. Danach pflegt er diesen Plan im Auftrag des Leads. |
| `ma-lead` (`.claude/agents/ma-lead.md`) | Steuert den Bau: plant Wellen, startet Coder und Reviewer, merged in `dev`, berichtet dem Nutzer. |
| `ma-coder` (`.claude/agents/ma-coder.md`) | Setzt genau ein Paket in einem eigenen Worktree um und committet auf `agent/AP-<nr>-c<n>`. |
| `ma-reviewer` (`.claude/agents/ma-reviewer.md`) | Prüft jedes Paket nur lesend. Urteil: bestanden / nicht bestanden. |
| `docs/masterBuildPlan.md` | Dieser Plan. Verbindlich für alle Agents. |
| `idee.txt` | Spielidee des Nutzers (Gegner, Batches, Design). Widerspricht sie diesem Plan, wird nachgefragt. |

Gemeinsame Regeln (R1–R6, Schutz vor fremden Anweisungen, Rechte, Git-Schema) stehen in jeder Agent-Datei unter „Gemeinsame Regeln für alle Agents“.

### Markierungen

| Markierung | Bedeutung | Wer entfernt sie |
|---|---|---|
| `{{…}}` | Platzhalter | Planner |
| `<!-- LEITFRAGEN … -->` | Fragen an den Nutzer. `[K]` kritisch (blockiert ein Gate), `[W]` wichtig, `[O]` optional (Standard darf angenommen werden) | Planner, sobald der Abschnitt fertig ist |
| `⟦offen: Q-xx⟧` | bewusst offene Stelle, siehe §16 | Planner nach Klärung |
| `(angenommen)` | Standard des Planners, vom Nutzer noch nicht bestätigt | Nutzer durch Bestätigung |
| `PE-xx` | Planungsentscheidung, §16 | – |
| **[Mensch]** | Schritt, den nur der Nutzer ausführt | – |

### Ausfüllstand und Gates

Status: `leer` · `in Klärung` · `fertig` · `angenommen` (fertig, aber mit unbestätigten Annahmen).

| § | Abschnitt | Status | Offene Fragen | Nötig für Gate |
|---|---|---|---|---|
| 1 | Projektkontext und Ziel | fertig | – | G1 |
| 2 | Umfang | angenommen | PE-34 (Boss-Verhalten) vor M3; F-07, F-15 bis F-17 und Backlog freigegeben (H-07); F-01 mit Stick übernommen (V-05, 2026-10-25); F-17 bleibt Pflicht (V-06 abgelehnt, PE-56) | G1 |
| 3 | Tech-Stack | angenommen | Werkzeuge (Vitest, ESLint, Prettier) angenommen | G1 |
| 4 | Architektur, Datenmodell, Verträge | fertig | – | G1 |
| 5 | Sicherheit, Datenschutz, Recht, Limits | fertig | – | G1 |
| 6 | Umgebungen, Branches, Deployment | fertig | – | G1 |
| 7 | Team-Steuerung | fertig | – | G1 |
| 8 | Lanes und Dateieigentum | fertig | – | G2 |
| 9 | Meilensteine und Wellen | fertig | – (M2b freigegeben, H-07; am 2026-10-25 um AP-38, AP-39 und Rüstungen AP-37a/AP-37c erweitert, AP-32 nach W5; M2c Design-Umsetzung neu, Reihenfolge PE-60 bestätigt 2026-10-25; M2b-Nachtrag AP-56 neu) | G2 |
| 10 | Statusübersicht | fertig | – | G2 |
| 11 | Abhängigkeitsgraph | fertig | – | G2 |
| 12 | Arbeitspakete | angenommen | M0–M2 abgenommen (2026-10-25); M2b AP-25–AP-36 freigegeben (H-07), AP-38 und AP-39 (nach AP-38), AP-37a und AP-37c (Feuerring, PE-52, PE-58); M2c AP-50–AP-55 aus dem freigegebenen Design (PE-59), Reihenfolge PE-60 bestätigt (H-11); M2b-Nachtrag AP-56 (Handtest-Befunde Balancing und Rundenstart, PE-61) und AP-57 (Lint-Fix, PE-62); M3 detailliert, Boss-Verhalten angenommen (PE-34), Abhängigkeit auf M2c-DEP | G2 (je Meilenstein) |
| 13 | Menschliche Schritte | fertig | – | G2 |
| 14 | Budget und Kürzungen | angenommen | Fensterleistung nach M0 nachschärfen | G2 |
| 15 | Risiken | fertig | – | G2 |
| 16 | Planungsentscheidungen und offene Fragen | angenommen | PE-34, PE-37, PE-38 bestätigen; PE-41 (Zahlen), PE-43 (Richtwerte), PE-44, PE-45 bestätigen (angenommen); PE-57 und Q-23 bestätigt (2026-10-25); PE-54 bis PE-58 neu, V-05 übernommen, V-06 abgelehnt; PE-59 (Design übernommen), PE-60 (Reihenfolge, bestätigt 2026-10-25), Q-31 geklärt („BOSS!“); PE-61 (Handtest-Befunde M2b-DEP, AP-56) neu; PE-62 (Lint-Fix auf dev, AP-57 erledigt) neu | laufend |
| 17 | Abdeckungsmatrix | fertig | – | G2 |
| 18 | Änderungsprotokoll | laufend | – | laufend |

**Gates:** G1 erfüllt. G2(M0), G2(M1), G2(M2) erfüllt. G2(M3) erfüllt mit Annahme PE-34 (Boss-Verhalten), Bestätigung durch den Nutzer vor M3-Freigabe. G2(M2b): Planung freigegeben (H-07, 2026-10-24), M2-DEP abgenommen (2026-10-25). Erweitert um AP-38, AP-39 (nach AP-38) und die Rüstungspakete AP-37a und AP-37c (PE-58). W1 (AP-25, AP-26, AP-38) abgeschlossen am 2026-10-25, alle `fertig`. W2 abgeschlossen am 2026-10-25, alle `fertig`. W3 abgeschlossen am 2026-10-25, alle `fertig`. W4 (AP-31, AP-34, AP-37c) abgeschlossen am 2026-10-25, alle `fertig`. W5 (AP-32, AP-33, AP-35) abgeschlossen am 2026-10-25, alle `fertig`. W6 (AP-36) abgeschlossen am 2026-10-25, `fertig`. W7 (M2b-DEP) abgenommen am 2026-10-25 (PC und iPhone), `fertig`; Handtest-Befunde: AP-56 (Balancing und Rundenstart) als M2b-Nachtrag vor M2c W1, Stick und HUD-Kasten in AP-53. G2(M2c): Design freigegeben (Brief 2026-10-25), Pakete AP-50–AP-55 vollständig, Reihenfolge nach M2b-DEP und vor M3 vom Nutzer bestätigt (PE-60, H-11, 2026-10-25). W8 (AP-56, AP-57) abgeschlossen am 2026-10-25, beide `fertig`. M2c W1 (AP-50, AP-51) ist `bereit`.

| Gate | Bedingung | Wer prüft | Folge |
|---|---|---|---|
| **G1** Bereit zur Paketierung | §1–§7 `fertig` oder `angenommen`, keine `[K]`-Frage offen | Planner | Der Planner schneidet Pakete (§8–§17). |
| **G2(Mx)** Bereit für Meilenstein Mx | G1 erfüllt; alle Pakete von Mx vollständig; [Mensch]-Schritte stehen; Abdeckungsmatrix deckt Mx ab | Lead | Der Lead startet die erste Welle von Mx. Sonst beauftragt er den Planner mit „Verfeinerung Mx“. |
| **G3** Fertig | alle Pflicht-Meilensteine live, Abnahmekriterien aus §1 erfüllt | Nutzer | Plan wird eingefroren. |

---

## 1. Projektkontext und Ziel

<!-- LEITFRAGEN
[K] Was ist das Projekt in einem Satz, und welches Problem löst es für wen?
[K] Was wird ausgeliefert (Repository, Live-Deployment, App …), und gibt es einen Termin?
[W] Ist eine Kommerzialisierung denkbar? (beeinflusst Recht, Lizenzen, Datenschutz-Tiefe)
[W] Welche Leitprinzipien gelten bei Zielkonflikten (z. B. Sicherheit vor Funktionsumfang)?
[O] Gibt es eine bestehende Projektdokumentation, auf die verwiesen werden soll?
-->

| Feld | Wert |
|---|---|
| Einzeiler | Rundenbasierter 360°-Survival-Shooter im Pixel-Stil: Die Astronautin in der Bildschirmmitte dreht sich, schießt automatisch und überlebt Monsterwellen, bis der Timer abläuft. |
| Zielgruppe | Gelegenheitsspieler auf Handy und PC. Im ersten Stich nur der Nutzer selbst (lokal). |
| Lieferumfang | Stich 1: lokal lauffähiges Spiel mit Level 0–20 auf PC und Handy. Keine Veröffentlichung. Später App Store (Ausblick). |
| Termin | keiner (PE-19) |
| Kommerzialisierung | später möglich (App Store), PE-01 |
| Projektdokumentation | `idee.txt` (Spielidee, Gegner, Batches; noch nicht committet, siehe §16 Vorschläge) |

**Leitprinzipien (in Rangfolge):**

1. Sicherheit und Datenschutz werden nie gekürzt.
2. Alles läuft lokal. Veröffentlichung, Anmeldung, Downloads und Server-Datenbank sind im ersten Stich unwichtig (PE-02).
3. Spielgefühl (Steuerung, Treffer, Lesbarkeit) vor Inhaltsmenge.
4. Level 21–100 sind nur Ausblick. Der Code soll sie später ohne Umbau aufnehmen können (datengetriebene Level und Gegner).

**Abnahmekriterien (G3):**

1. M0–M3 abgenommen, alle Smoke-Tests aus §9 erfüllt.
2. Level 0–20 sind nacheinander freispielbar, am PC (Maus) und auf dem iPhone (Touch, Homescreen-App, Querformat).
3. Jedes Level endet mit seinem Boss (nach Q-04).
4. Grafik und Sound lassen sich nach den Anleitungen in `docs/guides/` ohne Code-Änderung austauschen, `npm run assets:check` ist grün.
5. Keine personenbezogenen Daten, kein Tracking, keine externen Requests.
6. Alle Checks grün (`lint`, `typecheck`, `test`, `build`).

---

## 2. Umfang

<!-- LEITFRAGEN
[K] Welche Funktionen sind Pflicht? Pro Funktion: Was muss der Nutzer tun können?
[K] Was ist ausdrücklich NICHT im Umfang?
[W] Was ist optional und wird nur gebaut, wenn Budget bleibt?
[W] Welcher Kernfluss muss als Erstes vollständig live sein?
-->

### Pflicht

| ID | Funktion | Beschreibung aus Nutzersicht | Kernfluss |
|---|---|---|---|
| F-01 | Steuerung | Die Astronautin steht fest in der Bildschirmmitte und läuft nicht (PE-08). Der Spieler zeigt mit Maus oder Finger (Touch) auf eine Stelle, die Figur dreht sich dorthin, in beide Richtungen auf dem kürzeren Weg. Die Drehung ist **nicht sofort**, sondern mit begrenzter Drehgeschwindigkeit (PE-03, PE-04). Auf Touch-Geräten im Querformat zusätzlich ein virtueller Stick unten rechts: Die Stick-Richtung ist die Zielrichtung (360°). Tippen auf das Spielfeld bleibt erhalten, der Stick hat Vorrang (PE-55). | ja |
| F-02 | Automatischer Schuss | Die Laserpistole feuert automatisch, immer in die aktuelle Blickrichtung (PE-03). | ja |
| F-03 | Runde mit Timer | Eine Runde ist gewonnen, wenn der Timer abläuft und die Astronautin noch lebt. Dauer: erste Hälfte 3 min, zweite Hälfte 5 min, die erste Hälfte wird aufgerundet, bezogen auf die Level eines Batches (PE-05, PE-09). Ergebnis: Wald 0–2 = 3 min, 3–4 = 5 min · Nacht 5–7 = 3 min, 8–9 = 5 min · Elfenwald 10–15 = 3 min, 16–20 = 5 min. | ja |
| F-04 | Gegner | Verfluchter Baum (Level 0–20, langsam, etwas mehr HP, läuft auf Spieler zu), Wald-Hexe (5–20, schießt Projektile, normale Werte), Zombie-Eichhörnchen (5–20, schnell, wenig HP, läuft), Böser Wald-Spirit (10–20, Dauerschaden in Nähe, wenig HP). Quelle: `idee.txt`. | ja |
| F-05 | Boss je Level | Jedes Level hat einen Boss. Er erscheint in der letzten Minute. Läuft der Timer ab, während er noch lebt, geht die Runde weiter, bis er besiegt ist (PE-18). Ein Boss pro Batch, die anderen Level des Batches nutzen ihn in Varianten (PE-33):
<br>• Wald: verwurzeltes Baummonster
<br>• Wald bei Nacht: Waldgeist
<br>• Elfenwald: Riesen-Stein

Verhalten siehe PE-34. Eigener Meilenstein M3. | nein |
| F-06 | Level und Maps 0–20 | Batches Wald, Wald bei Nacht, Elfenwald mit je einer einfachen Map mit Charme. Grenzen: Wald 0–4, Wald bei Nacht 5–9, Elfenwald 10–20 (PE-10). | ja |
| F-07 | Waffen-Items in der Runde | Besiegte Gegner lassen mit ca. 8 % zufällig Items fallen: Doppelschuss, Schild, Dauerfeuer und selten Heilung. Ein Item wird eingesammelt, indem die Astronautin es **anschießt**. Doppelschuss (Stufe 1–2) und Schild (Schadens-Puffer, max. 3 Stufen) wirken bis Rundenende, Dauerfeuer 5 s. Ein liegendes Item verschwindet nach 10 s. Die Waffe startet jede Runde neu (PE-12, PE-16, PE-42, PE-43). | ja |
| F-15 | Gold-Münzen | Gegner lassen mit 5 % Chance eine Gold-Münze fallen, stärkere Gegner geben mehr Gold, ab Wert 5 erscheint eine größere Münze. Münzen fliegen automatisch zur Astronautin. Gold aus einer Runde: Sieg 100 %, Niederlage 50 %, Gutschrift am Rundenende (PE-39, PE-40). | nein |
| F-16 | Dauerhafte Upgrades | Im Hauptmenü kauft die Spielerin mit Gold Upgrades auf zwei Spuren: Waffe (Feuerrate, Schaden) und Spielerin (max. HP, Drehgeschwindigkeit), je 10 Stufen. Der Preis steigt mit jeder Stufe. Reset löscht Gold und Upgrades (PE-41, PE-45). | nein |
| F-17 | Rüstungen mit passiven Effekten | Rüstungen wirken passiv, zeitlich begrenzt und nur in der Runde. Pilot ist der Feuerring: 5 s um die Spielerin, Radius 72 px, 20 Schaden je Sekunde an Gegnern im Ring, Aktivierung durch Einsammeln, 20 s Abklingzeit nach Ende (PE-47, PE-52). Weitere Rüstungen sind spätere Planung. | nein |
| F-08 | Spielerlevel | Das Spielerlevel steigt durch Erfahrung aus Runden, wird lokal gespeichert und angezeigt. Im ersten Stich schaltet es nichts frei (PE-13). | nein |
| F-09 | Hauptmenü und Level-Freischaltung | Start, Anzeige des Spielerlevels, Level-Auswahl 0–20. Ein Level wird frei, wenn das vorherige geschafft ist (PE-13). | ja |
| F-10 | iPhone über PWA | Das Spiel läuft auf dem iPhone in Safari, als Homescreen-App im Vollbild, vom PC über das lokale WLAN bereitgestellt (PE-14). | ja |
| F-11 | Lebenspunkte und Niederlage | Die Astronautin hat 100 HP mit Lebensleiste. Bei 0 HP ist die Runde verloren, ein Teil der Erfahrung geht trotzdem ans Spielerlevel. Heilung gibt es nur als seltenes Item (PE-17). | ja |
| F-12 | Platzhalter-Grafik austauschbar | Alle Sprites sind Platzhalter mit fester Sprite-Liste. Ein Designer ersetzt eine PNG-Datei, ohne Code anzufassen. Anleitung `docs/guides/grafik-austauschen.md` (PE-23). | nein |
| F-13 | Platzhalter-Sounds austauschbar | Einfache Platzhalter-Effekte (Laser, Treffer, Item, Niederlage, Sieg), Stummschalt-Taste, Austausch per Datei. Anleitung `docs/guides/sound-austauschen.md` (PE-24). | nein |
| F-14 | Querformat | Das Spiel ist für Querformat ausgelegt, auf dem iPhone gibt es im Hochformat einen Hinweis „bitte drehen“ (PE-25). | nein |

### Optional

| ID | Funktion | Bedingung |
|---|---|---|
| O-01 | {{…}} | {{nur wenn alle Pflicht-Meilensteine live sind}} |

### Bewusst nicht im Umfang

| Ausgeschlossen | Begründung |
|---|---|
| Level 21–100 (Bauernhof bis Büro) | Ausblick, nicht im ersten Stich (`idee.txt`) |
| Weitere Startwaffen | Im ersten Stich gibt es nur die Laserpistole (PE-06) |
| Veröffentlichung, App-Store-Einreichung, Anmeldung, Online-Spielerdatenbank, Downloads | PE-02 |

### Später (Backlog, nicht geplant)

| Idee | Begründung |
|---|---|
| Neue Waffen | Backlog aus Q-14 (PE-42), nicht geplant |
| Akimbo-Modus (zwei Waffen gleichzeitig) | Backlog aus Q-14, nicht geplant |

---

## 3. Tech-Stack

<!-- LEITFRAGEN
[K] Sprache(n), Frontend, Backend, Datenbank, Auth, Hosting?
[W] Monorepo oder getrennte Repositories? Paketmanager?
[W] Test-Werkzeuge und Code-Qualität (Lint, Format, Typecheck)?
[W] Externe Dienste und ihre Kostenobergrenzen? (Konten legt nur der Nutzer an)
[O] Freigegebene Abhängigkeiten: welche Pakete dürfen Coder ohne Rückfrage installieren?
-->

| Bereich | Technologie | Begründung |
|---|---|---|
| Sprache | TypeScript (strict) | Typsicherheit, gut für parallele Agent-Arbeit (PE-11) |
| Frontend / Engine | Phaser 3 (aktuelle 3.x), Build mit Vite | 2D, Pixel-Art, Maus und Touch, läuft im Browser (PE-11) |
| Backend | keins | alles lokal (PE-02) |
| Datenbank / ORM | keine. Spielstand (Spielerlevel) lokal im Gerät (`localStorage`) (angenommen) | PE-02 |
| Auth | keine | PE-02 |
| Handy | Stich 1: PWA in Safari über das lokale WLAN (Web-App-Manifest, Vollbild-Meta-Tags, kein Mac nötig). Capacitor für die native App erst in einem späteren Stich | PE-14 |
| Tests | Vitest für Spiellogik (ohne Phaser-Rendering) (angenommen) | Logik testbar, schnell |
| Code-Qualität | ESLint + typescript-eslint, Prettier, `tsc --noEmit` (angenommen) | Standard |
| Paketmanager | npm, ein Repository (angenommen) | einfach |
| Hosting | keins. PC: lokal im Browser (`npm run dev` / `npm run preview`) | PE-02 |

**Checks, die jedes Paket bestehen muss:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (angenommen)

**Freigegebene Abhängigkeiten (PE-11, angenommen):** `phaser`, `typescript`, `vite`, `vitest`, `eslint`, `typescript-eslint`, `@eslint/js`, `prettier`, `eslint-config-prettier`. Keine Capacitor-Pakete im ersten Stich (PE-14). Coder installieren nur diese, und nur wenn ihnen die `package.json` gehört. Alles andere geht über Lead und Nutzer.

---

## 4. Architektur, Datenmodell und Verträge

<!-- LEITFRAGEN
[K] Welche Bausteine gibt es, und wer spricht mit wem?
[K] Welche Kernentitäten und Beziehungen? Wem gehören die Daten?
[W] Wo liegen die gemeinsamen Verträge (Schemas, API-Typen), damit parallel gebaut werden kann?
-->

Status: Entwurf des Planners (angenommen, PE-21), Bestätigung durch den Nutzer offen.

**Bausteine:**

```mermaid
flowchart TD
  CFG["src/config<br/>Level-, Gegner-, Item-, Waffendaten"] --> LOG
  CON["src/contracts<br/>Typen und Events"] --> CFG & LOG & ENT & SCN
  LOG["src/logic<br/>reine Spiellogik, ohne Phaser"] --> ENT["src/entities<br/>Phaser-Objekte"]
  LOG --> SCN["src/scenes<br/>Boot, Menu, Game, Hud, Result"]
  ENT --> SCN
  PLT["src/platform<br/>Eingabe Maus/Touch, Speicher"] --> SCN
```

- `src/contracts/`: gemeinsame Typen (`LevelDef`, `EnemyDef`, `ItemDef`, `WeaponStats`, `SaveGame`) und typisierte Event-Namen zwischen Game- und HUD-Szene.
- `src/config/`: datengetriebene Inhalte. Level 0–20 als Tabelle (Batch, Dauer, Gegnerpool, Spawn-Rate, Boss-Platzhalter), damit Level 21–100 später nur Daten sind.
- `src/logic/`: reine, mit Vitest getestete Funktionen. Dazu gehören:
  - die Drehung zum Ziel mit Maximalgeschwindigkeit,
  - der Rundentimer und der Spawn-Director,
  - Schaden und HP,
  - die Item-Wirkung und Stapelung,
  - Erfahrung, Spielerlevel und Level-Freischaltung.
- `src/entities/`: Astronautin, Gegnertypen, Projektile (Laser und Hexe), Items.
- `src/scenes/`: Boot/Preload, Hauptmenü mit Level-Auswahl, Spiel, HUD (Timer, HP, Waffenstufen), Ergebnis.
- `src/platform/`: vereinheitlichte Zeiger-Eingabe (Maus und Touch) und Speicher-Adapter (`localStorage`).
- `public/`: Sprites, Manifest, Icons.

**Grundregeln:**

1. Spiellogik in `src/logic` importiert kein Phaser. Sie bekommt Daten und gibt Daten zurück.
2. Spielwerte (HP, Geschwindigkeit, Drop-Chancen, Drehgeschwindigkeit) stehen nur in `src/config`, nie verstreut im Code.
3. Nur `src/platform/storage` greift auf `localStorage` zu.
4. Szenen sprechen über typisierte Events aus `src/contracts`.

| Entität | Wichtige Felder | Gehört zu | Löschverhalten |
|---|---|---|---|
| SaveGame | `version` (1 oder 2), `playerXp`, `playerLevel`, `highestUnlockedLevel` (Index des höchsten freigeschalteten Levels, Startwert 0, Bereich 0..20, PE-35), `muted`, `gold` und `upgrades` (ab Version 2, PE-44) | Gerät (lokal) | „Fortschritt zurücksetzen“ im Menü löscht alles, auch Gold und Upgrades (PE-41) |
| LevelDef | `id`, `batch`, `durationSec`, `enemyPool`, `spawnRate`, `bossId?` | Konfiguration | – |
| EnemyDef | `id`, `hp`, `speed`, `damage`, `behavior` (chase, shooter, aura), `coinValue` (ab M2b) | Konfiguration | – |
| ItemDef | `id`, `effect` (doubleShot, shield, rapidFire, heal; alt fireRate, damage, size bis AP-36), `maxStacks`, `dropWeight`, `durationMs?` (nur Dauerfeuer) | Konfiguration | – |
| WeaponStats | `fireRate`, `damage`, `projectileSize`, `projectileSpeed`, `shotCount` (Standard 1) | Runde (flüchtig) | Reset bei Rundenende |
| ActivePowers (M2b) | `doubleShotStage` (0–2), `shieldLeft` (Schadenspunkte), `rapidFireMsLeft` | Runde (flüchtig) | Reset bei Rundenende |
| CoinRules (M2b, `coin.ts`) | `dropChance`, `magnetRadiusPx`, `collectRadiusPx`, `magnetSpeedPxPerSec` | Konfiguration | – |
| UpgradeLevels (M2b, `upgrade.ts`) | je Spur 0–10: `weaponFireRate`, `weaponDamage`, `playerMaxHp`, `playerTurnSpeed` | Gerät (im SaveGame) | Reset mit SaveGame |

**Verträge:** TypeScript-Typen in `src/contracts/`. Regel: Jeder Vertrag entsteht in einem eigenen Paket mindestens eine Welle vor seinen Nutzern. M2b (AP-25) ergänzt Typen additiv und die Events `coins-changed` (`{ roundCoins }`) und `powers-changed` (`ActivePowers`). Rüstungen (PE-47) kommen in §4 erst mit AP-37a (Vorschlag für das Datenmodell in §16).

---

## 5. Sicherheit, Datenschutz, Recht und Limits

<!-- LEITFRAGEN
[K] Wie werden Nutzer authentifiziert, und wie wird Zugriff auf fremde Daten verhindert?
[K] Welche personenbezogenen Daten werden verarbeitet? Welche DSGVO-Pflichten folgen daraus (Löschen, Export, EU-Hosting, Auftragsverarbeitung)?
[K] Gibt es eine öffentliche Webseite? Dann: Impressum und Datenschutzerklärung (R3), Einwilligung für Cookies/Tracking/externe Inhalte.
[W] Missbrauchs- und Kostenlimits (Raten, Größen, Tageslimits)?
[W] Härtung (Header, CORS, Validierung, XSS, CSRF)?
[O] Besondere Angriffsflächen (Uploads, KI-Eingaben/Prompt-Injection)?
-->

Es gelten immer R1–R6 (siehe Agent-Dateien). Dieser Abschnitt konkretisiert sie für das Projekt.

| Regel | Umsetzung (grob) | Testart | Paket |
|---|---|---|---|
Status: Entwurf des Planners (angenommen, PE-22).

- **Nutzer und Auth:** keine. Es gibt keine Konten und keine fremden Daten.
- **Personenbezogene Daten (R2):** keine. Lokal gespeichert wird nur der Spielfortschritt (`SaveGame`). Es gibt kein Tracking, keine Analytics und keine externen Inhalte (Schriften und Assets liegen lokal). Damit sind im ersten Stich keine DSGVO-Pflichten erkennbar.
- **Öffentliche Webseite (R3):** keine. Das Spiel läuft nur lokal und im Heim-WLAN. Impressum und Datenschutzerklärung entfallen im ersten Stich und werden vor jeder Veröffentlichung (App Store) Pflicht, siehe Q-09 und §16.

| Regel | Umsetzung (grob) | Testart | Paket |
|---|---|---|---|
| Keine personenbezogenen Daten, kein Tracking, keine externen Requests (R2) | nur `SaveGame` lokal, keine Netzwerkaufrufe im Spiel | Review, Suche nach `fetch`/externen URLs | alle |
| Spielstand robust laden | Version prüfen, kaputte oder fremde Werte verwerfen und mit Standard starten | Unit-Test | AP-04 |
| Dev-Server im WLAN | `--host` nur für das Heimnetz, nie Portweiterleitung oder öffentliches Hosting | Doku (README) | AP-13 |
| Asset-Lizenzen (R1) | nur eigene, generierte oder CC0-Assets, Lizenzliste im Repo | Review | AP-02, AP-07 |
| Abhängigkeiten (R6) | nur freigegebene Pakete (§3), `npm audit` ohne hohe Befunde | Check des Leads | AP-01, alle |
| Impressum und Datenschutzerklärung (R3) | entfällt im ersten Stich (nicht öffentlich), vor einer Veröffentlichung Pflicht | – | Ausblick |
| Secrets nur in `.env`, `.env.example` gepflegt (R4) | im ersten Stich keine Secrets nötig | Review | alle |

| Limit | Standard | Ebene |
|---|---|---|
| Gleichzeitige Gegner auf dem Bildschirm | 150 (angenommen) | Konfiguration |
| Zielbildrate | 60 fps auf aktuellem iPhone und PC (angenommen) | – |

**Nie kürzbar:** keine personenbezogenen Daten und kein Tracking, robustes Laden des Spielstands, Asset-Lizenzen.

**Vom Nutzer rechtlich zu prüfen (vor Kommerzialisierung):** Impressum und Datenschutzerklärung, App-Store-Richtlinien und Datenschutzangaben, Lizenzen aller Assets und Schriften, Altersfreigabe.

---

## 6. Umgebungen, Branches und Deployment

<!-- LEITFRAGEN
[K] Wo laufen stage und Produktion? Was löst ein Deployment aus?
[W] Welche Konten und Secrets muss der Nutzer anlegen, und bis wann?
[W] Datenbanken: welche Dev-Datenbank nutzen Agents? Eigene DB-Benutzer pro Rolle (agentDev / agentLead)?
[O] Wie sieht ein Smoke-Test nach dem Deployment aus?
-->

| Umgebung | Frontend | Backend | Datenbank | Auslöser |
|---|---|---|---|---|
| lokal / dev | `npm run dev` im Browser am PC | – | – (`localStorage` im Browser) | – |
| stage | Stand von `stage`: `npm run build` und `npm run preview -- --host`, getestet am PC und auf dem iPhone im WLAN | – | – | Merge dev → stage durch den Nutzer |
| Produktion | Stand von `master`: abgenommener, spielbarer Stand, gleicher Ablauf wie stage | – | – | Merge stage → master durch den Nutzer |

| Branch | Zweck | Wer schreibt darauf |
|---|---|---|
| `master` | Produktion | **[Mensch]**, per Pull Request von `stage` |
| `stage` | Abnahme | **[Mensch]**, per Pull Request von `dev` |
| `dev` | Integration, Default-Branch | ma-lead (`merge --no-ff`, `push`), ma-planner (nur Plan-Commits) |
| `agent/AP-<nr>-c<n>` | ein Arbeitspaket | ma-coder (`commit`), nur lokal, wird nach dem Merge gelöscht |

**Remote:** `origin` = `https://github.com/CemDCoding/360shooter.git`, vom Nutzer eingerichtet (PE-20). Der Lead pusht nur `dev`. `stage` und `master` bringt der Nutzer per Pull Request.

**Worktrees:** werden beim Start eines Coders automatisch im Ordner `360shooter_worktree/` neben dem Projekt angelegt (ein Unterordner und ein Branch pro Coder, abgezweigt von `dev`). Der Lead entfernt sie nach dem Merge.

**Parallele Coder und lokale Ressourcen:** keine Datenbank. Tests laufen ohne Server. Startet ein Coder den Dev-Server, wählt Vite automatisch einen freien Port.

**Env-Dateien:** Im ersten Stich sind keine Variablen nötig. `.env.example` bleibt ohne Einträge.

**Deployment-Anleitung:** README-Abschnitt „Auf dem iPhone spielen“ (PC und iPhone im selben WLAN, `npm run build`, `npm run preview -- --host`, IP-Adresse in Safari öffnen, „Zum Home-Bildschirm“). Den Abschnitt schreibt das PWA-Paket.

---

## 7. Team-Steuerung

<!-- LEITFRAGEN
[K] Wie viele Coder dürfen höchstens gleichzeitig laufen? (Engpass: Budget, nicht Technik)
[W] Freigabe: pro Welle oder pro Meilenstein?
[W] Welche Modelle und welcher Aufwand für welche Paketgröße / welches Risiko?
-->

### 7.1 Ablauf

```mermaid
flowchart TD
  N["Nutzer"] <-->|"Interview bis „stop“"| P["ma-planner"]
  P -->|"schreibt"| PLAN[("docs/masterBuildPlan.md")]
  N <-->|"Status, Entscheidungen"| L["ma-lead"]
  PLAN --> L
  L -->|"Auftrag AP-a"| C1["ma-coder c1<br/>agent/AP-a-c1"]
  L -->|"Auftrag AP-b"| C2["ma-coder c2<br/>agent/AP-b-c2"]
  C1 & C2 -->|"Bericht"| L
  L -->|"Paket prüfen"| R["ma-reviewer"]
  R -->|"Urteil"| L
  L -.->|"Nachbesserung (max. 2 Review-Runden)"| C1
  L -->|"merge --no-ff, push"| DEV["dev"]
  L -->|"Pflegeauftrag"| P
  N -->|"PR dev → stage → master"| PROD["stage / master"]
```

### 7.2 Parallelität, Budget, Modelle

- **Höchstens gleichzeitig:** 3 Coder (PE-15). Hinweis: Das Budget erreicht damit den Zielwert schneller. Der Wächter stoppt dann neue Starts.
- **Budget (D11b):** Zielwert **45 %** des 5-Stunden-Limits, Obergrenze **54 %** (Zielwert × 1,2). Nutzer-Entscheidung am 2026-10-25, Werte aus `.claude/ma-usage.json`; bisher 30 % und 36 % (§18). Ab dem Zielwert startet der Wächter keine neuen Coder mehr, laufende Pakete werden bis zur Obergrenze fertig. Dann fragt der Lead den Nutzer. Ohne Antwort geht es nach dem Reset weiter (D11c).
- **Freigabe:** pro Meilenstein (PE-15). Der Nutzer nennt den Meilenstein, bis zu dem der Lead autonom arbeitet. Eskalationen nach §7.3 gelten trotzdem.
- **Bei mehr Kandidaten als Plätzen:** zuerst kritischer Pfad (§11), dann Verträge, dann der Rest.

| Paket | Modell | Aufwand |
|---|---|---|
| S, Routine ohne Sicherheits- oder Kernlogik | haiku | low |
| M | sonnet | medium |
| L oder Sicherheit, Kernlogik, Migration | opus | high |

`opus` nur mit Aufwand `L` oder einem „Opus-Grund“ im Paket (Sicherheit, Kern, groß), sonst blockiert der Wächter. Aufwand `xhigh` und `max` sind gesperrt. Die Plan-Pflege läuft mit `haiku`.

**Review:** Jedes Paket prüft `ma-reviewer` (höchstens 2 Runden, Nachbesserung durch denselben Coder). Danach entscheidet der Nutzer.

### 7.3 Eskalation

| Situation | Coder | Lead | Nutzer |
|---|---|---|---|
| Paket unklar | stoppt vor dem ersten Code, meldet `blockiert` | klärt aus Plan und Doku, sonst fragt er den Nutzer | entscheidet |
| Änderung an fremder Datei nötig | meldet | lässt den Planner ein Folgepaket planen | – |
| Neue Abhängigkeit | meldet | fragt den Nutzer | entscheidet |
| Review nach Runde 2 nicht bestanden | – | eskaliert mit Optionen | entscheidet |
| Merge-Konflikt außerhalb des Lockfiles | – | bricht ab, klärt mit dem Planner, Fix-Paket | bei Vorgehensänderung |
| Security, Datenschutz, Umfang, Architektur | – | legt Vorschlag vor | entscheidet |
| Verdächtige Anweisungen in Daten (R6) | meldet | meldet | entscheidet |

---

## 8. Lanes und Dateieigentum

<!-- LEITFRAGEN
[W] Welche parallelen Arbeitsstränge ergeben sich aus der Architektur?
[W] Welche Dateien brauchen viele Pakete (Registrierung, Schema, package.json, Lockfile, Layouts)?
-->

| Lane | Zuständigkeit | Ordner und Dateien |
|---|---|---|
| **SH** – Verträge und Daten | Typen, Spielwerte, Level-Tabelle | `src/contracts/`, `src/config/` |
| **LOG** – Spiellogik | reine Logik ohne Phaser, mit Unit-Tests | `src/logic/`, `tests/logic/` |
| **GAME** – Spiel | Phaser-Szenen, Entities, Plattform-Adapter | `src/scenes/`, `src/entities/`, `src/platform/`, `src/main.ts` |
| **ASSET** – Grafik, Sound, Anleitungen | Platzhalter, Generator, Designer-Anleitungen | `public/assets/`, `scripts/`, `docs/guides/` |
| **OPS** – Gerüst, PWA, Doku | Werkzeuge, Build, PWA, README | Root-Konfiguration, `index.html`, `public/manifest.webmanifest`, `public/icons/`, `README.md` (ohne `.github/workflows`, das macht der Nutzer) |
| **HUM** – Mensch | Tests auf PC und iPhone, Merges nach stage/master, eigene Grafiken und Sounds | – |

**Grundregeln:**

1. Innerhalb einer Welle gehört jede Datei höchstens einem Paket.
2. Verträge entstehen mindestens eine Welle vor ihren Nutzern.
3. Gemeinsame Dateien legt ein Gerüst-Paket in Welle 1 eines Meilensteins an.
4. Konflikte im Lockfile sind erwartet. Der Lead löst sie beim Merge mit `npm install`.
5. Tests liegen gespiegelt unter `tests/` (z. B. `src/logic/rotation.ts` → `tests/logic/rotation.test.ts`) und gehören dem Paket, dem die Quelldatei gehört.

| Gemeinsame Datei | Wer ändert sie | Wann |
|---|---|---|
| `package.json`, `package-lock.json` | AP-01 (anlegen), AP-02 (`assets:placeholders`), AP-07 (`assets:check`), AP-13 (`preview:lan`, `icons`); sonst nur der Lead beim Merge | M0 W1, M0 W2, M1 W1, M2 W1 |
| `src/main.ts` (Szenen-Registrierung) | AP-01 registriert alle sechs Szenen als Stubs; danach unverändert | M0 W1 |
| `src/contracts/*` | AP-01; spätere Erweiterung nur in einem eigenen Vertragspaket eine Welle vorher (M2b: AP-25, AP-37a, Aufräumen AP-36; M3: AP-16) | M0 W1, M2b W1, M2b W3, M2b W6, M3 W1 |
| `index.html`, `vite.config.ts` | AP-01, später AP-13, AP-38 (M2b, nur `index.html`) | M0 W1, M2 W1, M2b W1 |
| `README.md` | AP-01, später AP-13 | M0 W1, M2 W1 |
| `src/platform/storage.ts`, `src/logic/progression.ts` (samt Tests) | AP-04 / AP-06 → AP-21 (Fix Index-Semantik) | M0 W2, M1 W1, M1 W2 |
| `src/scenes/GameScene.ts` | AP-10 → AP-12 (Hintergrund) → AP-14 (Sound) → AP-24 (Laser vs. Geschoss) | M1 W3, M2 W1, M2 W2, M2 W4 |
| `src/scenes/debug.ts`, `src/scenes/PreloadScene.ts` (samt `tests/scenes/debug.test.ts`) | AP-10 (`debug.ts`) → AP-22 (Direktstart `?level=n`) | M1 W3, M2 W3 |
| `src/scenes/{MenuScene,HudScene,ResultScene}.ts` | AP-10 (Hud, Result), AP-11 (Menu) → AP-14 (Sound, Stumm-Taste) | M1 W3, M2 W1, M2 W2 |
| `src/config/{levels,enemies,items,weapon,player,progression}.ts` | AP-03 → AP-15 → AP-23 (`levels`, `enemies`, `weapon`) → AP-35 → AP-56 (`levels`, `enemies`, M2b W8) → AP-16 (nur `levels.ts`) | M0 W2, M2 W2, M2 W4, M2b W5, M2b W8, M3 W1 |
| `src/config/assets.ts`, `docs/guides/*` | AP-02 / AP-07 → AP-16 (Boss-Assets), M2b: AP-26 → AP-37c → AP-36 | M0 W2, M1 W1, M3 W1, M2b W1, W4, W6 |
| `src/logic/{round,spawn}.ts`, `src/contracts/{events,index}.ts` | AP-06 / AP-01 → AP-16; M2b: AP-25 → AP-37a; `spawn.ts` zusätzlich AP-56 (Eröffnungswelle, M2b W8) vor AP-16 | M1 W1, M0 W1, M3 W1, M2b W1, W3, W8 |
| `src/scenes/{GameScene,HudScene,ResultScene}.ts` in M3 | AP-20 | M3 W3 |
| `src/scenes/GameScene.ts` in M2b | AP-38 (Mitte, Vollbild), AP-39 (Stick-Einbindung), AP-33 (Ergebnis und Gold, Upgrades beim Start, Rüstungs-Einbindung) | M2b W1, W2, W5 |
| `src/main.ts` in M2b | AP-38 (Scale-Einstellung, nur falls nötig) | M2b W1 |
| M2c (Design): `package.json`, `src/platform/audio.ts`, `index.html`, `src/config/assets.ts`, `src/contracts/assets.ts`, `src/scenes/PreloadScene.ts` | `package.json` nur AP-50 (Skripte `theme:build`, `fonts:build`). `audio.ts`: AP-50 (Signatur) → AP-52. `index.html`: AP-50 → AP-52. `PreloadScene.ts`: AP-51 (Schrift laden) → AP-52 (Ladebalken). `assets.ts`, `contracts/assets.ts`: nur AP-51 | M2c W1, W2 |

**M2b (Eigentum je Welle, freigegeben am 2026-10-24, H-07; ergänzt am 2026-10-25 um AP-38, AP-39 und die Rüstungspakete AP-37a und AP-37c, PE-58):** Innerhalb einer Welle höchstens ein Paket je Datei. Vertragsänderungen in W1 sind additiv, Aufräumen in W6. AP-38 und AP-39 teilen `GameScene.ts`, daher liegen sie in zwei Wellen nacheinander (AP-38 zuerst). AP-33 teilt `GameScene.ts` mit keinem anderen Paket, deshalb trägt es in W5 die Rüstungs-Einbindung. Höchstens drei Pakete je Welle (PE-15).

| Welle | Paket | Dateien |
|---|---|---|
| W1 | AP-25 | `src/contracts/*` (neu `coin.ts`, `upgrade.ts`), `tests/contracts/contracts.test.ts` |
| W1 | AP-26 | `src/config/assets.ts`, `public/assets/*` (neu: Münzen, Items), `docs/guides/*`, `public/assets/LICENSES.md`, `tests/config/assets.test.ts` |
| W1 | AP-38 | `index.html`, `src/main.ts`, `src/platform/layout.ts` (neu), `tests/platform/layout.test.ts` (neu), `src/scenes/{GameScene,HudScene}.ts`, `src/entities/Player.ts` (nur Mittelung, falls dort die Ursache liegt) |
| W2 | AP-27 | `src/config/{coins,upgrades,items,enemies,index}.ts`, `tests/config/{coins,upgrades,items,enemies}.test.ts` |
| W2 | AP-28 | `src/platform/storage.ts`, `tests/platform/storage.test.ts` |
| W2 | AP-39 | `src/platform/stick.ts` (neu), `tests/platform/stick.test.ts` (neu), `src/logic/aimSource.ts` (neu), `tests/logic/aimSource.test.ts` (neu), `src/platform/input.ts` (einziger Input-Code), `src/scenes/controls/VirtualStick.ts` (neu), `src/scenes/GameScene.ts` (nur Einbindung) |
| W3 | AP-29 | `src/logic/{economy,upgrades,coins}.ts`, `tests/logic/{economy,upgrades,coins}.test.ts` |
| W3 | AP-30 | `src/logic/{items,weapon,powers}.ts`, `tests/logic/{items,weapon,powers}.test.ts` |
| W3 | AP-37a | `src/contracts/{armour,events,index}.ts` (neu `armour.ts`, `events.ts` nur `armour-changed`), `src/config/armour.ts` (neu), `src/logic/armour.ts` (neu), `tests/config/armour.test.ts` (neu), `tests/logic/armour.test.ts` (neu) |
| W4 | AP-31 | `src/entities/{Player,LaserPool,Coin,CoinPool}.ts` |
| W4 | AP-34 | `src/scenes/HudScene.ts`, `src/scenes/hud/*` (neu), ggf. `tests/scenes/hud.test.ts` |
| W4 | AP-37c | `src/entities/{ArmourRing,ArmourPickup}.ts` (neu), `src/config/assets.ts`, `public/assets/sprites/item-fire-ring.png` (neu), `public/assets/.placeholders.json`, `public/assets/LICENSES.md`, `docs/guides/grafik-austauschen.md`, `tests/config/assets.test.ts` |
| W5 | AP-32 | `src/scenes/MenuScene.ts`, `src/scenes/menu/{UpgradePanel,ConfirmDialog}.ts` (von W4 hierher verschoben, damit W4 drei Pakete hat) |
| W5 | AP-33 | `src/scenes/{GameScene,ResultScene}.ts` (inkl. Rüstungs-Einbindung in `GameScene`) |
| W5 | AP-35 | `src/config/{levels,enemies,weapon,items,coins,upgrades}.ts`, `tests/config/*` (ohne `assets`, `maps`, `player`), `tests/logic/balance.test.ts`, `docs/balancing.md` |
| W6 | AP-36 | `src/contracts/{item,weapon}.ts`, `src/contracts/events.ts` (nur Event `weapon-changed`), `src/logic/{items,weapon}.ts`, `tests/logic/{items,weapon,balance,powers}.test.ts`, `src/config/assets.ts`, `tests/config/assets.test.ts`, `tests/contracts/contracts.test.ts`, alte Item-Platzhalter, `docs/guides/*`, `public/assets/LICENSES.md` |
| W8 (Nachtrag, PE-61) | AP-56 | `src/logic/spawn.ts`, `tests/logic/spawn.test.ts`, `src/config/{levels,enemies}.ts`, `src/config/coins.ts` (nur `dropChance`), `tests/config/{levels,enemies,coins}.test.ts`, `tests/logic/balance.test.ts`, `docs/balancing.md` (keine Überschneidung mit M2c W1: AP-50 und AP-51 besitzen diese Dateien nicht) |
| W8 (Nachtrag, PE-62) | AP-57 | `eslint.config.js` (nur der Eintrag `docs/design/**` in `ignores`). Keine Überschneidung mit AP-56 und mit M2c W1. AP-55 (W3) ändert dieselbe Datei später, die Zeile bleibt erhalten |

**M2c (Design-Umsetzung, Eigentum je Welle, Design-Brief vom 2026-10-25, PE-59, PE-60):** Die Spiellogik ändert sich nicht. `docs/design/` gehört dem Designer und ist für alle Coder nur lesbar. Höchstens drei Pakete je Welle (PE-15). Die drei UI-Pakete der W2 hängen nur von W1 ab und teilen keine Datei. Gemeinsame Hilfen der Welt „Funk“ (Panel, Button) liegen in `src/scenes/hud/` und gehören AP-53. Die Resultat-Buttons nutzen sie von dort, nicht aus `menu/Button.ts`.

| Welle | Paket | Dateien |
|---|---|---|
| W1 | AP-50 | `scripts/build-theme.mjs` (neu), `src/config/theme.ts` (neu, erzeugt), `src/config/weaponMount.ts` (neu), `src/logic/weaponMount.ts` (neu), `src/platform/motion.ts` (neu), `src/styles/tokens.css` (neu, Kopie von `docs/design/export/tokens.css`), `package.json` (nur Skripte), `index.html` (nur Farben und Verweis auf `tokens.css`), `public/manifest.webmanifest`, `src/main.ts` (nur `backgroundColor`), `src/platform/audio.ts` (nur Signatur von `addMuteButton`, Verhalten unverändert), `tests/config/theme.test.ts`, `tests/logic/weaponMount.test.ts`, `tests/platform/motion.test.ts` (alle neu) |
| W1 | AP-51 | `scripts/build-fonts.mjs` (neu), `scripts/generate-placeholders.mjs`, `scripts/check-assets.mjs`, `scripts/generate-icons.mjs`, `tests/scripts/check-assets.test.ts`, `src/contracts/assets.ts` (nur `AssetKind` um `bitmapFont`), `src/config/assets.ts`, `tests/config/assets.test.ts`, `src/scenes/PreloadScene.ts` (nur Schrift laden), `public/assets/fonts/*` (neu), `public/assets/sprites/{weapon-raygun,ui-icons}.png`, `public/assets/.placeholders.json`, `public/assets/LICENSES.md`, `public/icons/*`, `docs/guides/grafik-austauschen.md` |
| W2 | AP-52 | `src/scenes/MenuScene.ts`, `src/scenes/menu/{Button,LevelGrid,UpgradePanel,ConfirmDialog}.ts`, `src/scenes/PreloadScene.ts`, `src/scenes/BootScene.ts`, `src/platform/audio.ts` (`addMuteButton`), `index.html` (nur Hochformat-Hinweis), zugehörige Tests (`tests/platform/audio.test.ts` nur falls betroffen) |
| W2 | AP-53 | `src/scenes/HudScene.ts`, `src/scenes/hud/*` (inkl. neu `FunkPanel.ts`, `FunkButton.ts`), `src/scenes/ResultScene.ts`, `src/scenes/controls/VirtualStick.ts`, `src/config/maps.ts`, `src/entities/MapBackground.ts`, `tests/scenes/hud.test.ts`, `tests/config/maps.test.ts` |
| W2 | AP-54 | `src/entities/{Player,Laser,LaserPool,ArmourRing,ItemPickup,ArmourPickup}.ts`, `src/entities/enemies/Enemy.ts` (nur Treffer-Blitz und Aura-Farbe), `src/scenes/GameScene.ts` (nur Übergabe der Waffen-Ausbaustufe), `tests/entities/ItemPickup.test.ts` |
| W3 | AP-55 | `eslint.config.js` (nach AP-57, dessen `docs/design/**`-Eintrag bleibt), `README.md`, Restfunde in `src/scenes/**` und `src/entities/**` (nur Farb-Literale), `docs/guides/*` (Verweise) |

---

## 9. Meilensteine und Wellen

<!-- LEITFRAGEN
[K] In welche Meilensteine lässt sich der Umfang schneiden, sodass jeder für sich live geht?
[W] Was ist nach jedem Meilenstein live prüfbar?
-->

| # | Meilenstein | Inhalt | Live-Zustand |
|---|---|---|---|
| M0 | Fundament | Werkzeuge, Verträge, Spieldaten 0–20, Platzhalter-Assets, Eingabe und Speicher | `npm run dev` zeigt die Preload-Szene mit allen Platzhalter-Sprites; alle Checks grün |
| M1 | Kernspiel | Drehen und Auto-Schuss, 4 Gegnertypen, Items durch Anschießen, HP, Timer, Sieg/Niederlage, HUD; Designer-Anleitungen | Level 0 (und per Debug-Parameter jedes Level 0–20) am PC spielbar |
| M2 | Inhalte, Menü, iPhone | Hauptmenü mit Level-Auswahl und Spielerlevel, Maps je Batch, PWA + Querformat, Platzhalter-Sounds mit Stummschalten, Balancing 0–20 | Level 0–20 nacheinander freispielbar, am PC und auf dem iPhone |
| M2b | Gold und Waffen-Items (freigegeben, H-07) | Gold-Münzen aus Gegnern, Upgrade-Overlay im Hauptmenü (Waffe: Feuerrate, Schaden; Spielerin: max. HP, Drehgeschwindigkeit; je 10 Stufen), Waffen-Items neu (Doppelschuss, Schild, Dauerfeuer), Neu-Balancing, Fix iPhone-Darstellung (AP-38), virtueller Stick auf Touch-Geräten (AP-39), Rüstung Feuerring (AP-37a, AP-37c, Einbindung AP-33, Anzeige AP-34) | Upgrades kaufbar, Gold bleibt nach Neuladen, Reset löscht Gold und Upgrades; iPhone: Spielfeld passt ins Bild, Stick steuert die Zielrichtung; Feuerring wirkt 5 s, danach 20 s Abklingzeit |
| M2c | Design-Umsetzung (Design freigegeben 2026-10-25, PE-59, PE-60) | Tokens als `theme.ts`, eigene Bitmap-Schriften Astro Kapsel und Astro Funk, App-Icons, Menü im Kassetten-Stil, Runde, HUD, Pause und Ergebnis im Funk-Stil, Waffe als eigenes kreisendes Sprite mit drei Ausbaustufen | Alle Bildschirme im neuen Stil auf PC und iPhone, Spiellogik unverändert, keine Farb-Literale in Szenen und Entities |
| M3 | Bosse | Boss-Rahmen, drei Bosse mit Varianten je Level, Einbindung (PE-18, PE-33, PE-34) | jedes Level endet mit seinem Boss |

### 9.1 Ablauf einer Welle

| Schritt | Inhalt | Wer |
|---|---|---|
| 0 Lagebild | `dev` sauber, Abhängigkeiten `fertig`, Eigentum ohne Überschneidung, Budget | Lead |
| 1 Wellenplan | Pakete, Coder-Nr., Modell; Freigabe laut §7.2 | Lead → Nutzer |
| 2 Delegieren | Coder im Hintergrund starten, je eigener Worktree | Lead |
| 3 Umsetzen | Code, Tests, Commits auf `agent/AP-<nr>-c<n>`, Bericht | Coder |
| 4 Review | Urteil; bei „nicht bestanden“ Nachbesserung durch denselben Coder, max. 2 Runden | Reviewer, Lead, Coder |
| 5 Mergen | `merge --no-ff` in `dev`, Reihenfolge SH → LOG → GAME → ASSET → OPS | Lead |
| 6 Integrationspunkt | Install, Checks, Handtest-Checkliste; rot → Fix-Paket | Lead (+ Nutzer für Handtest) |
| 7 Abschluss | `push origin dev`, Worktrees und Branches aufräumen, Plan pflegen | Lead, Planner |

### 9.2 Meilensteine im Detail

#### M0 – Fundament

| Welle | Pakete (parallel) |
|---|---|
| W1 | AP-01 Gerüst und Verträge |
| W2 | AP-02 Asset-Pipeline, AP-03 Spieldaten, AP-04 Plattform |
| W3 | M0-DEP [Mensch] |

**Integration:** nach W2: `npm install`, alle Checks, `npm run dev` zeigt die Preload-Szene mit allen Platzhaltern.

##### M0-DEP – Abnahme [Mensch] (abgenommen 2026-10-25)

- Pull Request `dev` → `stage`, mergen, `npm run dev` am PC
- Pull Request `stage` → `master`, mergen
- **Smoke-Test:**
  - [x] `npm install` und `npm test` laufen ohne Fehler
  - [x] Browser zeigt die Preload-Szene mit allen Platzhalter-Sprites (Astronautin, 4 Gegner, Items)

#### M1 – Kernspiel

| Welle | Pakete (parallel) |
|---|---|
| W1 | AP-05 Kampf-Logik, AP-06 Runden- und Fortschrittslogik, AP-07 Designer-Anleitungen |
| W2 | AP-08 Astronautin, Laser, Items (Entities), AP-09 Gegner (Entities), AP-21 Fix Freischaltstand als Index |
| W3 | AP-10 Spielszene, HUD, Ergebnis |
| W4 | M1-DEP [Mensch] |

**Integration:** nach W3 Handtest am PC: drehen, schießen, Items anschießen, verlieren, gewinnen.

##### M1-DEP – Abnahme [Mensch] (abgenommen 2026-10-25)

- Pull Requests `dev` → `stage` → `master`, Test am PC
- **Smoke-Test:**
  - [x] Die Astronautin dreht sich sichtbar mit Verzögerung zum Mauszeiger, in beide Richtungen
  - [x] Der Laser feuert automatisch in Blickrichtung
  - [x] Level 0: Bäume kommen von allen Seiten, der Timer läuft 3:00 ab, danach erscheint „Gewonnen“
  - [x] Ein angeschossenes Item erhöht den Stack im HUD
  - [x] Bei 0 HP erscheint „Verloren“
  - [x] `?level=12` startet Level 12 mit allen vier Gegnertypen (erst nach AP-22 erfüllbar, siehe M2-DEP)
  - [x] Pause: Taste im HUD oder `Esc`/`P` pausiert und setzt fort; Browser-Tab wechseln und zurückkehren pausiert automatisch, ohne Tastendruck
  - [x] „Nochmal“ startet die Runde ohne doppelte Events (Timer, Treffer, Items)
  - [x] „Nächstes Level“ ist nur nach einem Sieg wählbar
  - [x] Fortschritt bleibt nach Neuladen erhalten
  - [x] `?fps=1` zeigt die FPS unten rechts im HUD
  - [x] Die beiden Anleitungen in `docs/guides/` sind für Nicht-Programmierer verständlich

#### M2 – Inhalte, Menü, iPhone

| Welle | Pakete (parallel) |
|---|---|
| W1 | AP-11 Hauptmenü und Fortschritt, AP-12 Maps je Batch, AP-13 PWA und Querformat |
| W2 | AP-14 Sound-Anbindung und Stummschalten, AP-15 Balancing Level 0–20 |
| W3 | AP-22 Fix Debug-Parameter `?level=n` im Menü-Flow |
| W4 | AP-23 Balancing-Nachbesserung Level 5–20, AP-24 Gegnerische Projektile abschießbar |
| W5 | M2-DEP [Mensch] |

##### M2-DEP – Abnahme [Mensch] (abgenommen 2026-10-25)

- Pull Requests `dev` → `stage` → `master`, Test am PC und auf dem iPhone (H-03)
- **Smoke-Test:**
  - [x] Menü zeigt Spielerlevel und Level 0–20, nur freigespielte sind wählbar
  - [x] Wald, Wald bei Nacht und Elfenwald sehen unterschiedlich aus
  - [x] iPhone: Homescreen-App startet im Vollbild, Steuerung per Finger, Hochformat zeigt „bitte drehen“
  - [x] Sounds hörbar, Stummschalten wirkt und bleibt gespeichert
  - [x] Fortschritt bleibt nach Neuladen erhalten, „Zurücksetzen“ löscht ihn
  - [x] Gegner auf den Platzhalter-Kacheln sind auf dem Handy in allen drei Batches gut lesbar
  - [x] Overlay „Bitte drehen“ erscheint im Hochformat, im Querformat spielt es sich normal
  - [ ] iPhone mit Notch: Safe-Area stimmt, nichts liegt unter der Notch (Nutzer meldete am 2026-10-25 zu große Grafik im Querformat; Nachprüfung über AP-38 im M2b-DEP)
  - [x] Stumm-Taste bleibt nach Neuladen erhalten
  - [x] Ton auf dem iPhone ist nach dem ersten Antippen hörbar
  - [x] Balancing-Handtest: Level 0 gut schaffbar, Level 20 nur mit Items. Bei Abweichung nachjustieren laut `docs/balancing.md`
  - [x] Debug: `?level=12` startet Elfenwald direkt, auch ohne Freischaltung (AP-22)
  - [x] Balancing nach Handtest: Ab Level 5 kippt das Spiel nicht mehr, Level 12 ist mit der Startwaffe fair zu schaffen (AP-23)
  - [x] Die Laserpistole zerstört Geschosse der Wald-Hexe, der Laser verschwindet dabei (AP-24)

#### M2b – Gold und Waffen-Items (freigegeben, noch nicht begonnen)

**Einordnung (PE-46, PE-53):** eigener Meilenstein zwischen M2-DEP und M3. Grund: Schild und Münzen müssen alle Schadens- und Einsammelpfade kennen, bevor die Bosse (M3) sie nutzen. Start nach M2-DEP (abgenommen 2026-10-25). Am 2026-10-25 kamen zwei Befunde aus dem iPhone-Test dazu (PE-54, PE-55): AP-38 und AP-39.

**Rüstungen (PE-47, PE-52, PE-58):** passive, zeitlich begrenzte Effekte, eigene Kategorie neben den Waffen-Items. Pilot ist der Feuerring um die Spielerin (5 s, Radius 72 px, 20 Schaden je Sekunde, nur in der Runde, Regeln in PE-57). Die Umsetzung läuft in vier Teilen: Vertrag, Config und Logik in AP-37a (W3), Entity und Pickup-Sprite in AP-37c (W4), Anzeige im HUD in AP-34 (W4), Einbindung in die Spielszene in AP-33 (W5). Der Katalog weiterer Rüstungen ist spätere Planung. Die Definition liegt als Daten in `src/config/armour.ts`, damit weitere Rüstungen ohne Umbau kommen. Gleiche Welle heißt keine Abhängigkeit: AP-37a und AP-37c haben deshalb keine Kante zu AP-29, AP-30 oder AP-31 (eigener Zustand `ActiveArmour`, Position kommt von der Szene).

| Welle | Pakete (parallel) |
|---|---|
| W1 | AP-25 Verträge Gold, Upgrades, Waffen-Items (SH), AP-26 Assets Münzen und neue Items (ASSET), AP-38 Fix iPhone-Darstellung, Mitte und HUD-Lesbarkeit (GAME/OPS) |
| W2 | AP-27 Config Münzen, Upgrades, Items, Gegner-Münzwerte (SH), AP-28 Spielstand v2 (GAME/Plattform), AP-39 Virtueller Stick für Touch-Geräte (GAME, nach AP-38) |
| W3 | AP-29 Logik Wirtschaft und Upgrades (LOG), AP-30 Logik Items, Schild, Dauerfeuer (LOG), AP-37a Rüstung Vertrag, Config und Logik Feuerring (SH/LOG) |
| W4 | AP-31 Entities Spielerin, Laser, Münzen (GAME), AP-34 HUD Münzen, Power- und Rüstungs-Anzeige (GAME), AP-37c Rüstung Feuerring-Entity und Pickup-Sprite (GAME/ASSET) |
| W5 | AP-32 Hauptmenü Upgrade-Overlay (GAME), AP-33 Spielszene und Ergebnis mit Gold, Rüstungs-Einbindung (GAME, opus), AP-35 Neu-Balancing (SH) |
| W6 | AP-36 Aufräumen alter Waffen-Items (SH/ASSET) |
| W7 | M2b-DEP [Mensch] (abgenommen 2026-10-25) |
| W8 (Nachtrag, PE-61/PE-62) | AP-56 Rundenstart, Baum-Leben, Balancing der ersten Level (SH/LOG); AP-57 Lint-Fix: ESLint ignoriert `docs/design/**` (OPS); danach M2c W1 |

**Integration:** nach W2 und nach W5 `npm install`, alle Checks, `npm run dev`. Nach W1 bleibt der Typecheck grün, weil alle Vertragsänderungen additiv sind. Nach W3 und W4 Typecheck und Tests. AP-32 wechselt von W4 nach W5, weil W4 sonst vier Pakete hätte (Limit drei, PE-15).

##### M2b-DEP – Abnahme [Mensch] (abgenommen 2026-10-25, PC und iPhone)

**Befunde aus dem Handtest (PE-61):** Stick auf dem Handy 10 % zu groß und grauer Kasten hinter den Power-ups gehen als Akzeptanzkriterien in AP-53 (M2c W2). Zu einfache erste Level, Rundenstart mit leerem Feld und Baum mit einem Laser tot gehen in das Nachtragspaket AP-56 (W8, vor M2c W1).

- Pull Requests `dev` → `stage` → `master`, Test am PC und auf dem iPhone (H-03)
- **Hinweis (PE-59, PE-60):** Die Optik ist Platzhalter und wird in M2c durch das freigegebene Design ersetzt. Diese Abnahme prüft Funktion und Passform, nicht Aussehen. Die Punkte „Lesbarkeit im HUD“ und „Abstand Gold-Anzeige und Upgrade-Button“ gelten nur grob (nichts ist abgeschnitten oder überlappt unbenutzbar). Die genaue Lesbarkeit und das Layout prüft M2c-DEP. Fehler aus dieser Abnahme werden noch in der alten Optik behoben, bevor M2c startet.
- **Smoke-Test:**
  - [ ] Gegner lassen selten (ca. 5 %) Gold-Münzen fallen, bei stärkeren Gegnern mehr Gold und größere Münzen
  - [ ] Münzen fliegen automatisch zur Astronautin, der Zähler im HUD steigt
  - [ ] Nach Sieg bleibt das gesamte Gold, nach Niederlage 50 %; die Ergebnisanzeige zeigt es
  - [ ] Hauptmenü: Gold steht sichtbar, „Upgrade“ öffnet die Übersicht, ein Kauf zieht Gold ab, die Stufe steigt bis 10
  - [ ] Waffe: nach Kauf spürbar höhere Feuerrate und Schaden; Spielerin: mehr HP und schnellere Drehung
  - [ ] Doppelschuss Stufe 1 zeigt zwei Laser, Stufe 2 drei Laser im Fächer
  - [ ] Schild nimmt Schaden ab, das HUD zeigt den Rest, danach ist er kaputt
  - [ ] Dauerfeuer hält ca. 4 s (AP-35, Neu-Balancing), das HUD zeigt die Restzeit
  - [ ] Gold und Upgrades bleiben nach Neuladen erhalten
  - [ ] „Fortschritt zurücksetzen“ löscht Gold und Upgrades
  - [ ] Ein Spielstand der Vorversion (v1) lädt ohne Verlust von Fortschritt
  - [ ] Balancing-Handtest: Stufe 10 eines Upgrades nach ca. 15–20 gewonnenen Leveln erreichbar, Level 0 gut schaffbar
  - [ ] iPhone (Querformat, Homescreen-App): Spielfeld passt vollständig in den sichtbaren Bereich, nichts liegt unter der Notch (AP-38, PE-54)
  - [ ] iPhone: Astronautin steht in der Bildschirmmitte, ohne sichtbaren Versatz (AP-38, PE-54)
  - [ ] iPhone: Item-Stacks und Power-Anzeige im HUD sind ohne Zoomen lesbar (AP-38, AP-34, PE-54)
  - [ ] iPhone: Virtueller Stick unten rechts erscheint nur auf Touch-Geräten im Querformat, 360°-Zielen über die Stick-Richtung, Auto-Schuss läuft, Drehung bleibt verzögert (AP-39, PE-55)
  - [ ] Tippen auf das Spielfeld zielt weiterhin. Solange der Stick gehalten wird, wirkt Tippen nicht, ein zweiter Finger auf dem Feld wird ignoriert, nach dem Loslassen gilt Tippen wieder. Die Pause-Taste funktioniert parallel (AP-39, PE-55)
  - [ ] Pause mit gehaltenem Stick: nach dem Fortsetzen ist der Stick zurückgesetzt, beim Loslassen bleibt das Ziel auf dem letzten Stick-Winkel (AP-39, Befund Review Runde 1)
  - [ ] PC: kein Stick sichtbar, die Maus zielt wie bisher (AP-39, PE-55)
  - [ ] Feuerring: Pickup fällt selten, Anschießen aktiviert es, der Ring um die Astronautin wirkt 5 s und fügt Gegnern im Ring Schaden zu (AP-37a, AP-37c, AP-33, PE-52)
  - [ ] Feuerring: danach 20 s Abklingzeit, ein Pickup in dieser Zeit oder während aktiver Rüstung wirkt nicht (PE-57)
  - [ ] Feuerring: Pause hält Ring und Abklingzeit an, eine neue Runde startet ohne Ring (PE-29, PE-57)
  - [ ] HUD zeigt Restzeit und Abklingzeit des Feuerrings (AP-34); im Hauptmenü gibt es keine Rüstung (PE-52)
  - [ ] Hauptmenü: Gold-Anzeige und Upgrade-Button sind klar getrennt (Abstand war bei AP-32 nur etwa 1 px), Übersicht und Bestätigungsdialog blockieren die Menüpunkte dahinter (AP-32)
  - [ ] Laser gehen durch Münzen hindurch, ohne sie zu treffen (AP-33)
  - [ ] Schild fängt Kontakt-, Aura- und Hexenschaden ab, beim Brechen ertönt der Bruch-Ton (AP-33)
  - [ ] Pause friert Gegner, Geschosse, Münzen, Schild, Dauerfeuer und Feuerring ein, nach dem Fortsetzen läuft alles weiter (AP-33, PE-29)
  - [ ] `?level=5` startet eine Debug-Runde, Erfahrung, Freischaltung und Gold bleiben unverändert (AP-33, PE-49)
  - [ ] „Nochmal“ dreimal hintereinander: keine doppelten Sounds, die Debug-Runde bleibt Debug (AP-33)

#### M2c – Design-Umsetzung

**Einordnung (PE-59, PE-60):** eigener Meilenstein nach M2b-DEP und vor M3. Gründe: (1) M2b-DEP prüft Funktion und Passform auf dem iPhone und soll nicht mit einem Optik-Umbau vermischt werden. Findet er Fehler, werden sie noch in der alten Optik behoben. (2) Die Design-Pakete besitzen `HudScene`, `ResultScene`, `config/assets.ts` und `Player.ts`. M3 (AP-16, AP-20) besitzt dieselben Dateien. Läuft das Design danach, müssten AP-20 und die Boss-Anzeige neu gebaut werden. (3) Der Umbau ändert keine Logik, M3 baut dann gleich auf `theme.ts` und der Funk-Schrift auf. Quelle: `docs/design/design-brief.md` (Übergabe an den Planner). Keine neuen npm-Abhängigkeiten.

| Welle | Pakete (parallel) |
|---|---|
| W1 | AP-50 Theme, Waffen-Geometrie und Farben der Hülle (OPS/SH/LOG), AP-51 Schriften, Icons und Asset-Pipeline (ASSET) |
| W2 | AP-52 Menü, Level-Auswahl, Upgrade-Panel, Laden, Hochformat-Hinweis (GAME), AP-53 Runde: HUD, Pause, Stick, Ergebnis, Maps (GAME), AP-54 Waffe als eigenes Sprite, Spielerin, Laser (GAME/LOG) |
| W3 | AP-55 Abschluss: Lint-Regel gegen Farb-Literale, Restfunde, README (OPS) |
| W4 | M2c-DEP [Mensch] |

**Integration:** nach W1 `npm install`, alle Checks, `npm run fonts:build` und `npm run theme:build` erzeugen unveränderte Dateien (kein Diff). Nach W2 alle Checks und Sichtprüfung der Szenen mit `npm run dev` (Menü, Level 0, Pause, Ergebnis). **Design-Review** (`ma-designer`, Modus Review) für AP-52, AP-53 und AP-54 zusätzlich zum normalen Review; Prüfgrundlage: Grundsätze im Brief, `docs/design/tokens.json`, `docs/design/screenshots/`. W1 und W2 werden direkt hintereinander gemergt und nicht einzeln im Browser abgenommen: In W1 ändert sich die Frame-Belegung von `ui-icons` und die Schrift wird geladen, aber noch nicht genutzt.

##### M2c-DEP – Abnahme [Mensch]

- Pull Requests `dev` → `stage` → `master`, Test am PC und auf dem iPhone im Querformat (H-03)
- **Smoke-Test:**
  - [ ] Menü: Logo, Porträt-Karte, Level-Raster nach Biom gruppiert mit Aufklebern, Kachelzustände (geschafft mit Stern, aktuell mit Ring und Pfeil, gesperrt mit Schloss), Legende; leerer Spielstand zeigt „WILLKOMMEN! STARTE MIT LEVEL 0.“
  - [ ] Upgrade-Panel: zehn Pips, „x/10“, Zustände kaufbar, „ZU TEUER“, „MAX“; Reset-Dialog hat den Fokus zuerst auf „ABBRECHEN“
  - [ ] Ladebildschirm „LADE KASSETTE …“ erscheint, danach das Menü ohne Systemschrift
  - [ ] Runde: Funk-HUD mit Energie (Zahl und 10 Segmente), Warnzustand und Label „ENERGIE!“ bei 25 % oder weniger, Timer-Panel (unter 10 s Warnung), Münzen, Chips nur für aktive Kräfte, Sekunden mit kleinem „s“
  - [ ] Pause-Overlay im Funk-Stil mit Level, Biom und Restzeit; Ergebnis im Funk-Stil mit Biom-Farbband, GEWONNEN/VERLOREN, Fakten, Hauptaktion mit Fokus
  - [ ] Waffe: Die Astronautin dreht sich nicht mehr, sie spiegelt sich; die Pistole kreist um die Hand, der Laser startet an der Mündung; Ausbaustufe wechselt bei Waffen-Upgrade 7 und 14 (zum Prüfen Spielstand mit Stufen oder Debug)
  - [ ] Hochformat-Hinweis im Kassetten-Stil, App-Icon auf dem Homescreen (Helm mit Visier)
  - [ ] Stick, Schild-Ring und Feuerring in den neuen Farben; Feuerring gestrichelt; Stick kleiner als vorher und mit dem Daumen gut zu treffen (Q-32, ist 88 px zu klein, Token anpassen)
  - [ ] Kein grauer Kasten hinter den Power-up-Anzeigen im HUD (Befund M2b-DEP)
  - [ ] **iPhone-Lesbarkeit (Brief, Handtest):** Funk 1× (Labels im HUD) und Kapsel 1× (Legende, Hinweis) ohne Zoomen lesbar. Wenn nicht, die Labels auf 2× anheben (kleines Fix-Paket, Platz im Layout ist vorhanden)
  - [ ] Kein Blinken bei `prefers-reduced-motion` (iPhone: Einstellungen, Bedienungshilfen, Bewegung, Bewegung reduzieren), keine Bildschirm-Erschütterung
  - [ ] Funktion unverändert: Level 0 spielbar, Gold und Upgrades, Items, Schild, Feuerring, Pause, Stick, Fortschritt bleibt nach Neuladen
  - [ ] Zustände nie nur über Farbe: Stern, Schloss, „ZU TEUER“, „MAX“, „ENERGIE!“ sind sichtbar (Brief, Grundsatz 4)
  - [ ] Balancing nach AP-56 (Handtest-Prüfpunkte): Level 10–20 gezielt spielen. Der Druck liegt ab Level 10 über 1, Level 12 = 1,09 (früher als zu schwer bewertet), Level 20 = 1,22. Eröffnungsgegner erscheinen horizontal im Bild, vertikal knapp außerhalb. Baum-HP 50 und Radiusfaktor 0,65 sind angenommen, bis der Nutzer sie bestätigt oder ändert

#### M3 – Bosse

| Welle | Pakete (parallel) |
|---|---|
| W1 | AP-16 Boss-Rahmen (Vertrag, Daten, Logik, Basis-Entity, Platzhalter) |
| W2 | AP-17 Baummonster, AP-18 Waldgeist, AP-19 Riesen-Stein |
| W3 | AP-20 Boss-Einbindung (Spielszene, HUD, Ergebnis) |
| W4 | M3-DEP [Mensch] |

##### M3-DEP – Abnahme [Mensch]

- Pull Requests `dev` → `stage` → `master`, Test am PC und auf dem iPhone
- **Smoke-Test:**
  - [ ] In der letzten Minute erscheint „Boss kommt!“ und der Boss des Batches
  - [ ] Der Timer läuft ab, die Runde endet aber erst mit dem Sieg über den Boss
  - [ ] `?level=0`, `?level=3`, `?level=7`, `?level=18`: Boss passt zum Batch, spätere Level haben stärkere Varianten mit Zusatzangriff
  - [ ] Jeder Angriff wird vorher sichtbar angekündigt (fair)
  - [ ] Design: Boss-Lebensleiste und Timer-Label im Funk-Stil (Brief `runde.html` 3, Text „BOSS!“ laut Q-31), Warnanzeigen in Warnrot, keine Farb-Literale in den Boss-Dateien (Design-Review AP-20)

---

## 10. Statusübersicht

Gepflegt von ma-planner (im Auftrag des Leads). Aufwand: S ≈ 0,75 h · M ≈ 1,5 h · L ≈ 2,5 h Agent-Zeit, H = Mensch.

Status: `offen` · `bereit` · `in Arbeit` · `Review` · `fertig` (gemergt in dev) · `blockiert`

| ID | Titel | M | Lane | Welle | Abhängigkeiten | Aufwand | Modell | Coder / Branch | Status |
|---|---|---|---|---|---|---|---|---|---|
| AP-01 | Gerüst und Verträge | M0 | OPS/SH | W1 | H-01 | M | sonnet (high) | c1 / agent/AP-01-c1 | fertig |
| AP-02 | Asset-Pipeline und Platzhalter | M0 | ASSET | W2 | AP-01 | M | sonnet (medium) | c2 / agent/AP-02-c2 | fertig |
| AP-03 | Spieldaten Level 0–20 | M0 | SH | W2 | AP-01 | S | sonnet (medium) | c3 / agent/AP-03-c3 | fertig |
| AP-04 | Plattform: Eingabe und Speicher | M0 | GAME | W2 | AP-01 | S | sonnet (medium) | c4 / agent/AP-04-c4 | fertig |
| M0-DEP | Abnahme M0 | M0 | HUM | W3 | AP-02–04 | H | – | – | fertig |
| AP-05 | Kampf-Logik | M1 | LOG | W1 | M0 | M | sonnet (high) | c5 / agent/AP-05-c5 | fertig |
| AP-06 | Runden- und Fortschrittslogik | M1 | LOG | W1 | M0 | M | sonnet (high) | c6 / agent/AP-06-c6 | fertig |
| AP-07 | Designer-Anleitungen Grafik und Sound | M1 | ASSET | W1 | AP-02 | S | sonnet (medium) | c7 / agent/AP-07-c7 | fertig |
| AP-08 | Astronautin, Laser, Items (Entities) | M1 | GAME | W2 | AP-05 | M | sonnet (medium) | c8 / agent/AP-08-c8 | fertig |
| AP-09 | Gegner (Entities) | M1 | GAME | W2 | AP-05, AP-06 | M | sonnet (medium) | c9 / agent/AP-09-c9 | fertig |
| AP-21 | Fix: Freischaltstand als Index | M1 | LOG/GAME | W2 | AP-04, AP-06 | S | sonnet (medium) | c21 / agent/AP-21-c21 | fertig |
| AP-10 | Spielszene, HUD, Ergebnis | M1 | GAME | W3 | AP-08, AP-09, AP-21 | L | opus (high) | c10 / agent/AP-10-c10 | fertig |
| M1-DEP | Abnahme M1 | M1 | HUM | W4 | AP-10, AP-21 | H | – | – | fertig |
| AP-11 | Hauptmenü und Fortschritt | M2 | GAME | W1 | M1 | M | sonnet (medium) | c11 / agent/AP-11-c11 | fertig |
| AP-12 | Maps je Batch | M2 | GAME | W1 | M1 | M | sonnet (medium) | c12 / agent/AP-12-c12 | fertig |
| AP-13 | PWA und Querformat | M2 | OPS | W1 | M1 | M | sonnet (medium) | c13 / agent/AP-13-c13 | fertig |
| AP-14 | Sound-Anbindung und Stummschalten | M2 | GAME | W2 | AP-11, AP-12 | S | sonnet (medium) | c14 / agent/AP-14-c14 | fertig |
| AP-15 | Balancing Level 0–20 | M2 | SH | W2 | M1 | M | sonnet (high) | c15 / agent/AP-15-c15 | fertig |
| AP-22 | Debug-Parameter `?level=n` im Menü-Flow | M2 | GAME | W3 | keine (AP-10, AP-11 fertig) | S | sonnet (medium) | c22 / agent/AP-22-c22 | fertig |
| AP-23 | Balancing-Nachbesserung Level 5–20 | M2 | SH | W4 | keine (AP-15 fertig) | S | sonnet (medium) | c23 / agent/AP-23-c23 | fertig |
| AP-24 | Gegnerische Projektile abschießbar | M2 | GAME/LOG | W4 | keine (AP-09, AP-10 fertig) | S | sonnet (medium) | c24 / agent/AP-24-c24 | fertig |
| M2-DEP | Abnahme M2 (PC + iPhone) | M2 | HUM | W5 | AP-14, AP-15, AP-22, AP-23, AP-24 | H | – | – | fertig |
| AP-25 | Verträge Gold, Upgrades, Waffen-Items | M2b | SH | W1 | M2-DEP (fertig) | S | sonnet (medium) | c25 / agent/AP-25-c25 | fertig |
| AP-26 | Assets Münzen und neue Items | M2b | ASSET | W1 | M2-DEP (fertig) | M | sonnet (medium) | c26 / agent/AP-26-c26 | fertig |
| AP-27 | Config Münzen, Upgrades, Items | M2b | SH | W2 | AP-25 | M | sonnet (medium) | c27 / agent/AP-27-c27 | fertig |
| AP-28 | Spielstand v2 (Gold, Upgrades) | M2b | GAME | W2 | AP-25 | S | sonnet (medium) | c28 / agent/AP-28-c28 | fertig |
| AP-29 | Logik Wirtschaft und Upgrades | M2b | LOG | W3 | AP-25, AP-27 | M | sonnet (high) | c29 / agent/AP-29-c29 | fertig |
| AP-30 | Logik Items, Schild, Dauerfeuer | M2b | LOG | W3 | AP-25, AP-27 | M | sonnet (high) | c30 / agent/AP-30-c30 | fertig |
| AP-31 | Entities Spielerin, Laser, Münzen | M2b | GAME | W4 | AP-26, AP-27, AP-29, AP-30 | M | sonnet (medium) | c31 / agent/AP-31-c31 | fertig |
| AP-32 | Hauptmenü Upgrade-Overlay | M2b | GAME | W5 | AP-27, AP-28, AP-29 | M | sonnet (medium) | c32 / agent/AP-32-c32 | fertig |
| AP-34 | HUD Münzen, Power- und Rüstungs-Anzeige | M2b | GAME | W4 | AP-25, AP-30, AP-37a, AP-38 | M | sonnet (medium) | c34 / agent/AP-34-c34 | fertig |
| AP-33 | Spielszene, Ergebnis mit Gold, Rüstungs-Einbindung | M2b | GAME | W5 | AP-29, AP-30, AP-31, AP-37a, AP-37c, AP-38, AP-39 | L | opus (high) | c33 / agent/AP-33-c33 | fertig |
| AP-35 | Neu-Balancing M2b | M2b | SH | W5 | AP-27, AP-29, AP-30 | M | sonnet (high) | c35 / agent/AP-35-c35 | fertig |
| AP-36 | Aufräumen alter Waffen-Items | M2b | SH/ASSET | W6 | AP-26, AP-33, AP-35 | S | sonnet (medium) | – (gemergt 44b27c3) | fertig |
| AP-37a | Rüstung Vertrag, Config und Logik (Feuerring, PE-52, PE-57) | M2b | SH/LOG | W3 | AP-25 | M | sonnet (high) | c37 / agent/AP-37-c37 | fertig |
| AP-37c | Rüstung Feuerring-Entity und Pickup-Sprite (PE-52, PE-57) | M2b | GAME/ASSET | W4 | AP-26, AP-37a | M | sonnet (medium) | c40 / agent/AP-37-c40 | fertig |
| AP-38 | Fix iPhone-Darstellung, Mitte und HUD-Lesbarkeit (PE-54) | M2b | GAME/OPS | W1 | keine (M2 abgenommen) | M | sonnet (medium) | c38 / agent/AP-38-c38 | fertig |
| AP-39 | Virtueller Stick für Touch-Geräten (PE-55) | M2b | GAME | W2 | AP-38 (Datei GameScene, Reihenfolge) | M | sonnet (high) | c39 / agent/AP-39-c39 | fertig |
| M2b-DEP | Abnahme M2b (PC + iPhone) | M2b | HUM | W7 | AP-31–AP-36, AP-37a, AP-37c, AP-38, AP-39 | H | – | – | fertig (abgenommen 2026-10-25) |
| AP-56 | Nachtrag Handtest M2b-DEP: Rundenstart, Baum-Leben, Balancing der ersten Level (PE-61) | M2b-Nachtrag | SH/LOG | W8 | M2b-DEP (fertig); vor M2c W1 (Vorgabe Lead) | M | sonnet (high) | – (gemergt cfcdde7) | fertig (Review bestanden, 254/254) |
| AP-57 | Lint-Fix: ESLint ignoriert `docs/design/**` (PE-62) | M2b-Nachtrag | OPS | W8 | keine (Design-Commit 5e58bf2 auf dev); keine gemeinsame Datei, Merge vor M2c W1 | S | sonnet (medium) | – (gemergt d25bc66) | fertig (Review bestanden) |
| AP-50 | Theme, Waffen-Geometrie und Farben der Hülle (Design) | M2c | OPS/SH/LOG | W1 | M2b-DEP | M | sonnet (high) | – | bereit |
| AP-51 | Schriften, Icons und Asset-Pipeline (Design) | M2c | ASSET | W1 | M2b-DEP | L | sonnet (high) | – | bereit |
| AP-52 | Menü, Level-Auswahl, Upgrade-Panel, Laden, Hochformat-Hinweis (Design, Design-Review) | M2c | GAME | W2 | AP-50, AP-51 | L | sonnet (high) | – | offen |
| AP-53 | Runde: HUD, Pause, Stick, Ergebnis, Maps (Design, Design-Review; Befunde PE-61: Stick kleiner, kein grauer Kasten) | M2c | GAME | W2 | AP-50, AP-51 | L | sonnet (high) | – | offen |
| AP-54 | Waffe als eigenes Sprite, Spielerin spiegelt, Laser, Treffer-Blitz (Design, Design-Review) | M2c | GAME/LOG | W2 | AP-50, AP-51 | M | sonnet (high) | – | offen |
| AP-55 | Design-Abschluss: Lint-Regel gegen Farb-Literale, Restfunde, README | M2c | OPS | W3 | AP-52, AP-53, AP-54, AP-57 (Datei `eslint.config.js`, Reihenfolge) | S | sonnet (medium) | – | offen |
| M2c-DEP | Abnahme M2c (PC + iPhone) | M2c | HUM | W4 | AP-50–AP-55 | H | – | – | offen |
| AP-16 | Boss-Rahmen | M3 | SH/LOG | W1 | M2c-DEP | L | sonnet (high) | – | offen |
| AP-17 | Boss Baummonster (Wald 0–4) | M3 | GAME | W2 | AP-16 | M | sonnet (medium) | – | offen |
| AP-18 | Boss Waldgeist (Nacht 5–9) | M3 | GAME | W2 | AP-16 | M | sonnet (medium) | – | offen |
| AP-19 | Boss Riesen-Stein (Elfenwald 10–20) | M3 | GAME | W2 | AP-16 | M | sonnet (medium) | – | offen |
| AP-20 | Boss-Einbindung | M3 | GAME | W3 | AP-17–19 | M | sonnet (high) | – | offen |
| M3-DEP | Abnahme M3 | M3 | HUM | W4 | AP-20 | H | – | – | offen |

---

## 11. Abhängigkeitsgraph

```mermaid
flowchart LR
  subgraph M0["M0 Fundament"]
    AP01["AP-01"] --> AP02["AP-02"] & AP03["AP-03"] & AP04["AP-04"]
  end
  subgraph M1["M1 Kernspiel"]
    AP05["AP-05"] --> AP08["AP-08"] & AP09["AP-09"]
    AP06["AP-06"] --> AP09
    AP08 & AP09 & AP21 --> AP10["AP-10"]
    AP07["AP-07"]
    AP21["AP-21"]
  end
  subgraph M2["M2 Inhalte, Menü, iPhone"]
    AP11["AP-11"] --> AP14["AP-14"]
    AP12["AP-12"] --> AP14
    AP13["AP-13"]
    AP15["AP-15"] --> AP23["AP-23"]
    AP24["AP-24"]
  end
  subgraph M2b["M2b Gold und Waffen-Items"]
    AP25["AP-25"] --> AP27["AP-27"] & AP28["AP-28"] & AP34["AP-34"] & AP37a["AP-37a"]
    AP26["AP-26"] --> AP37c["AP-37c"]
    AP38["AP-38"] --> AP39["AP-39"] & AP34["AP-34"]
    AP39 --> AP33["AP-33"]
    AP37a["AP-37a"] --> AP34 & AP37c & AP33
    AP37c --> AP33
    AP27 --> AP29["AP-29"] & AP30["AP-30"] & AP35["AP-35"] & AP31["AP-31"] & AP32["AP-32"]
    AP28 --> AP32
    AP29 --> AP31 & AP32 & AP33["AP-33"]
    AP30 --> AP31 & AP33 & AP34
    AP26 --> AP31
    AP31 --> AP33
    AP33 & AP35 --> AP36["AP-36"]
    AP31 & AP32 & AP33 & AP34 & AP35 & AP36 & AP37a & AP37c & AP38 & AP39 --> M2bDEP["M2b-DEP"]
  end
  subgraph M2c["M2c Design-Umsetzung"]
    AP50["AP-50"] --> AP52["AP-52"] & AP53["AP-53"] & AP54["AP-54"]
    AP51["AP-51"] --> AP52 & AP53 & AP54
    AP52 & AP53 & AP54 --> AP55["AP-55"]
    AP50 & AP51 & AP52 & AP53 & AP54 & AP55 --> M2cDEP["M2c-DEP"]
  end
  subgraph M3["M3 Bosse"]
    AP16["AP-16"] --> AP17["AP-17"] & AP18["AP-18"] & AP19["AP-19"]
    AP17 & AP18 & AP19 --> AP20["AP-20"]
  end
  AP02 & AP03 & AP04 --> AP05 & AP06
  AP02 --> AP07
  AP04 & AP06 --> AP21
  AP10 --> AP11 & AP12 & AP13 & AP15
  M2bDEP --> AP56["AP-56 Nachtrag"] & AP57["AP-57 Lint-Fix"] & AP50 & AP51
  M2cDEP --> AP16
  AP57 -.->|Datei eslint.config.js, vor AP-55| AP55
  AP10 & AP11 --> AP22["AP-22"]
  AP09 & AP10 --> AP24
  AP14 & AP15 & AP22 & AP23 & AP24 --> M2DEP["M2-DEP"]
```

**M2b:** Die Reihenfolgekante M2-DEP → AP-25/AP-26 (PE-46) ist mit der Abnahme vom 2026-10-25 erfüllt und entfernt. W1 und W2 sind je ein Paket pro Datei. AP-38 (W1) und AP-39 (W2) teilen `GameScene.ts`, daher nacheinander. AP-34 (HUD, W4) und AP-33 (GameScene, W5) starten erst nach AP-38 bzw. AP-39. W5 läuft mit AP-35 (Config) und AP-32 (Menü) parallel, ohne gemeinsame Datei. AP-36 folgt, weil es die Item-Typen erst entfernt, wenn niemand sie mehr nutzt. Rüstungen (PE-58): AP-37a (W3) liefert Vertrag und Logik, AP-37c (W4) Entity und Sprite, AP-34 (W4) die Anzeige, AP-33 (W5) die Einbindung in `GameScene`. Die Einbindung steckt in AP-33, weil `GameScene.ts` in W5 schon AP-33 gehört. Ein eigenes Einbindungspaket wäre erst in W6 möglich und verletzte „spätestens W5“ (PE-58).

**M2c (PE-59, PE-60):** M2c startet nach M2b-DEP (Reihenfolgekante, keine Code-Abhängigkeit, wie bei M2b nach M2-DEP) und endet vor M3. AP-16 hängt von M2c-DEP ab, weil AP-51 `config/assets.ts` besitzt (wie AP-16) und AP-53 `HudScene`/`ResultScene` (wie AP-20). W2 hängt von W1 ab, weil `theme.ts` und die Schrift Verträge für die UI-Pakete sind. AP-52, AP-53 und AP-54 teilen keine Datei und nutzen keine Funktion aus derselben Welle: Die Ton-Taste ruft AP-53 mit der von AP-50 vorbereiteten Signatur `addMuteButton(scene, x, y, world)` auf, und die Funk-Buttons des Ergebnisses kommen aus `scenes/hud/` (AP-53), nicht aus `menu/Button.ts` (AP-52).

**M2 W4:** AP-23 (nur `src/config/*`, `tests/config/*`, `tests/logic/balance.test.ts`, `docs/balancing.md`) und AP-24 (`src/scenes/GameScene.ts`, `src/logic/projectiles.ts`, Test) teilen keine Datei und laufen parallel.

**Kritischer Pfad:** AP-01 → AP-03/AP-04 → AP-05 → AP-08/AP-09 → AP-10 → AP-11/AP-12 → AP-14 → (M2b) AP-25 → AP-27 → AP-29/AP-30 → AP-31 → AP-33 → AP-36 → M2b-DEP → AP-56 (Nachtrag, Reihenfolge Lead) → (M2c) AP-50/AP-51 → AP-52–AP-54 → AP-55 → M2c-DEP → (M3) AP-16 → AP-17–AP-19 → AP-20

---

## 12. Arbeitspakete

<!-- Regeln:
- Ein Paket passt in eine Agent-Sitzung (1–3 h) und ergibt einen einzeln committbaren, getesteten Stand.
- Ein Coder muss es allein mit Paket und Pflichtlektüre umsetzen können, ohne Rückfrage.
- Knappe, konkrete Schritte, keine fertigen Code-Blöcke.
- IDs fortlaufend über alle Meilensteine: AP-01, AP-02 …
-->

### M0 – Fundament

#### AP-01 – Gerüst und Verträge

- **Meilenstein, Lane, Welle:** M0 · OPS/SH · W1
- **Ziel:** Lauffähiges Phaser-3-Projekt mit TypeScript, Vite, Vitest, ESLint und Prettier, sechs Szenen-Stubs und allen gemeinsamen Typen. Alle späteren Pakete bauen darauf auf.
- **Pflichtlektüre:** §3, §4, §8 dieses Plans; PE-11, PE-21, PE-25
- **Abhängigkeiten:** H-01
- **Parallel möglich mit:** –
- **Dateien (Eigentum):** `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.gitignore`, `index.html`, `README.md`, `src/main.ts`, `src/scenes/{Boot,Preload,Menu,Game,Hud,Result}Scene.ts`, `src/contracts/*.ts`, `tests/contracts/contracts.test.ts`
- **Nicht anfassen:** `docs/`, `idee.txt`, `.claude/`, `.env*`
- **Freigegebene Abhängigkeiten:** `phaser` (3.x), `typescript`, `vite`, `vitest`, `eslint`, `@eslint/js`, `typescript-eslint`, `prettier`, `eslint-config-prettier`
- **Umsetzung:**
  1. Lege das Projekt mit npm an und installiere die Abhängigkeiten. Diese Skripte gehören in `package.json`:
     - `dev`, `build` (`tsc --noEmit && vite build`), `preview`
     - `test` (`vitest run`), `lint`, `typecheck` (`tsc --noEmit`), `format`
  2. `tsconfig.json`: strict, ES2022, `moduleResolution: bundler`. Vitest-Konfiguration in `vite.config.ts`, Tests unter `tests/**/*.test.ts`.
  3. `.gitignore`: `node_modules/`, `dist/` ergänzen. Bestehende Einträge bleiben.
  4. `index.html`: viewport ohne Zoom, `touch-action: none`, kein Scrollen, Vollfläche für den Canvas.
  5. `src/main.ts`: Phaser-Konfiguration:
     - logische Auflösung 640×360, `pixelArt: true`
     - `Scale.FIT` mit `CENTER_BOTH`, dunkler Hintergrund
     - alle sechs Szenen registrieren. Die Stubs zeigen nur ihren Namen. Boot startet Preload, Preload startet Menu.
  6. `src/contracts/`, je Datei ein Thema, Export gesammelt über `index.ts`:
     - `level.ts`:
       - `BatchId` (`forest` | `forestNight` | `elfForest`)
       - `LevelDef` mit den Feldern `id`, `batch`, `durationSec`, `enemyPool` (Liste aus `{ enemyId, weight }`), `spawnIntervalMs`, `maxEnemies` und optional `bossId`
     - `enemy.ts`:
       - `EnemyId` (`cursedTree` | `forestWitch` | `zombieSquirrel` | `forestSpirit`)
       - `EnemyBehavior` (`chase` | `shooter` | `aura`)
       - `EnemyDef` mit den Feldern `id`, `hp`, `speed` (px/s), `contactDamage`, `behavior`, `xp`, `spriteKey`
       - optional `projectile` mit `damage`, `speed`, `intervalMs`, `keepDistance`
       - optional `aura` mit `radius`, `dps`
     - `item.ts`:
       - `ItemEffect` (`fireRate` | `damage` | `size` | `heal`)
       - `ItemDef` mit `id`, `effect`, `perStack`, `maxStacks`, `dropWeight`, `spriteKey`
       - `ItemRules` mit `dropChance`, `lifetimeMs`
     - `weapon.ts`:
       - `WeaponStats` mit `fireRatePerSec`, `damage`, `projectileScale`, `projectileSpeed`, `range`
       - `WeaponStacks` mit `fireRate`, `damage`, `size`
     - `player.ts`: `PlayerDef` mit `maxHp`, `turnSpeedDegPerSec`
     - `progression.ts`: `ProgressionRules` mit `xpCurveBase`, `xpCurveExponent`, `lossXpFactor`
     - `save.ts`: `SaveGame` mit `version: 1`, `playerXp`, `playerLevel`, `highestUnlockedLevel`, `muted`
     - `events.ts`: Konstanten für Event-Namen und eine Payload-Map. Events: `hp-changed`, `timer-tick`, `weapon-changed`, `round-ended` (`won` | `lost`, `xpGained`), `mute-changed`
     - `assets.ts`:
       - `AssetKind` (`spritesheet` | `image` | `audio`)
       - `AssetDef` mit `key`, `kind`, `path`, optional `frameWidth`, `frameHeight` und `frames`, dazu `description` (Text für Designer)
  7. README: Voraussetzungen (Node 24), Befehle, Ordnerstruktur nach §4, Regel „Spielwerte nur in `src/config`“. Am Ende der Hinweis „© Cem Dogan. Alle Rechte vorbehalten. Code, Grafiken und Sounds dürfen ohne Erlaubnis nicht verwendet werden.“ Keine `LICENSE`-Datei (PE-27).
  8. In `src/main.ts` Arcade Physics aktivieren (ohne Schwerkraft), damit M1 Kollisionen nutzen kann.
- **Schnittstellen:** stellt alle Verträge aus §4 bereit
- **Akzeptanzkriterien:**
  - `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` sind grün
  - `npm run dev` zeigt im Browser den Text der Menu-Szene, Fenster skaliert ohne Verzerrung
  - Kein Import von `phaser` in `src/contracts`
- **Tests:** `tests/contracts/contracts.test.ts`: Typ-Smoke-Test (Beispielobjekte je Vertrag kompilieren und sind gültig)
- **Review-Schwerpunkte:** Vollständigkeit der Verträge gegenüber §4, keine unnötigen Abhängigkeiten, `npm audit` ohne hohe Befunde
- **Doku-Pflichten:** README
- **Aufwand:** M · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein (Fundament)
- **Commit-Typ:** `chore(AP-01): scaffold project and contracts`

#### AP-02 – Asset-Pipeline und Platzhalter

- **Meilenstein, Lane, Welle:** M0 · ASSET · W2
- **Ziel:** Eine feste Asset-Liste (Manifest), ein Generator für Platzhalter-PNGs und -WAVs ohne fremde Pakete und eine Preload-Szene, die alles lädt. Designer ersetzen später nur Dateien (PE-23, PE-24).
- **Pflichtlektüre:** PE-23, PE-24, PE-26, §5 (Asset-Lizenzen), `src/contracts/assets.ts`
- **Abhängigkeiten:** AP-01
- **Parallel möglich mit:** AP-03, AP-04
- **Dateien (Eigentum):** `src/config/assets.ts`, `scripts/generate-placeholders.mjs`, `public/assets/sprites/*`, `public/assets/sounds/*`, `public/assets/LICENSES.md`, `src/scenes/PreloadScene.ts`, `package.json` (nur Skript `assets:placeholders`), `tests/config/assets.test.ts`
- **Nicht anfassen:** übrige `src/config/*`, `src/platform/*`, andere Szenen
- **Freigegebene Abhängigkeiten:** keine (nur Node-Bordmittel `node:fs`, `node:zlib`, `node:path`)
- **Umsetzung:**
  1. `src/config/assets.ts`: Manifest nach `AssetDef`. Jeder Eintrag bekommt eine deutsche `description` für Designer. Alle Sprites sind PNG mit Transparenz, Blickrichtung **nach rechts**, Frames waagerecht nebeneinander. Sprites (Breite×Höhe je Frame, Anzahl Frames):
     - Figuren:
       - `astronaut` 32×32 ×4 (2 Idle, 2 Schuss)
       - `boss-placeholder` 64×64 ×2
     - Waffe und Geschosse:
       - `laser` 16×4 ×1
       - `witch-bolt` 8×8 ×2
     - Gegner:
       - `enemy-cursed-tree` 32×32 ×4
       - `enemy-forest-witch` 32×32 ×4
       - `enemy-zombie-squirrel` 24×24 ×4
       - `enemy-forest-spirit` 32×32 ×4
     - Items:
       - `item-fire-rate` 16×16 ×2
       - `item-damage` 16×16 ×2
       - `item-size` 16×16 ×2
       - `item-heal` 16×16 ×2
     - Maps:
       - `tiles-forest` 32×32 ×4
       - `tiles-forest-night` 32×32 ×4
       - `tiles-elf-forest` 32×32 ×4
     - Oberfläche: `ui-icons` 16×16 ×3 (Herz, Ton an, Ton aus)

     Sounds (WAV, 16 Bit, mono, 44,1 kHz): `laser`, `hit`, `enemy-death`, `item-pickup`, `player-hurt`, `round-won`, `round-lost`.
  2. `scripts/generate-placeholders.mjs`:
     - erzeugt pro Manifest-Eintrag eine Datei: einfache, gut unterscheidbare Pixel-Formen in eigener Farbe, Frames leicht verschieden
     - schreibt nur fehlende Dateien. Mit `--force` überschreibt es nur Dateien, die es selbst erzeugt hat (Markierung über eine Liste in `public/assets/.placeholders.json`)
     - Echte Designer-Dateien werden nie überschrieben.
  3. Skript `assets:placeholders` in `package.json`. Generator ausführen, Ergebnisse committen.
  4. `PreloadScene`:
     - lädt alles aus dem Manifest, mit Fortschrittsbalken
     - Fehlt eine Datei, gibt es eine Warnung in der Konsole, kein Absturz
     - Nach dem Laden zeigt eine Debug-Ansicht (`?assets=1`) alle Sprites und spielt die Animationen. Ohne Parameter startet die Menu-Szene.
  5. `public/assets/LICENSES.md`: Tabelle Datei | Herkunft | Lizenz. Platzhalter: „selbst erzeugt“.
- **Schnittstellen:** nutzt `AssetDef`; stellt `ASSETS` (Manifest) und Asset-Keys für AP-07 bis AP-14 bereit
- **Akzeptanzkriterien:**
  - `npm run assets:placeholders` erzeugt alle Dateien, ein zweiter Lauf ändert nichts
  - Eine von Hand ersetzte PNG bleibt bei einem neuen Lauf erhalten
  - `?assets=1` zeigt alle Sprites mit Animation
  - Checks grün
- **Tests:** `tests/config/assets.test.ts`: eindeutige Keys, jede Datei im Manifest existiert, Frame-Größen passen zur Bildgröße (PNG-Header lesen)
- **Review-Schwerpunkte:** keine fremden Pakete, Generator überschreibt keine Designer-Dateien, Lizenzliste vorhanden
- **Doku-Pflichten:** `public/assets/LICENSES.md`
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein (Grundlage für Austausch durch Designer)
- **Commit-Typ:** `feat(AP-02): add asset manifest, placeholder generator and preload`

#### AP-03 – Spieldaten Level 0–20

- **Meilenstein, Lane, Welle:** M0 · SH · W2
- **Ziel:** Alle Spielwerte als Daten: Level 0–20, Gegner, Items, Waffe, Spielerin, Fortschritt. Startwerte, das Feintuning macht AP-15.
- **Pflichtlektüre:** §2 (F-03 bis F-11), PE-04, PE-05, PE-09, PE-10, PE-16, PE-17, `idee.txt` (Gegner), `src/contracts/*`
- **Abhängigkeiten:** AP-01
- **Parallel möglich mit:** AP-02, AP-04
- **Dateien (Eigentum):** `src/config/{levels,enemies,items,weapon,player,progression,index}.ts`, `tests/config/{levels,enemies,items}.test.ts`
- **Nicht anfassen:** `src/config/assets.ts` (AP-02)
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `levels.ts`: `LEVELS` mit 21 Einträgen, `getLevel(id)`, `LEVEL_COUNT`.
     - Batches: `forest` 0–4, `forestNight` 5–9, `elfForest` 10–20.
     - Dauer 180 s oder 300 s pro Batch, erste Hälfte aufgerundet: 0–2, 5–7 und 10–15 haben 180 s, der Rest 300 s.
     - Gegnerpool:
       - `cursedTree` ab Level 0
       - `forestWitch` und `zombieSquirrel` ab Level 5
       - `forestSpirit` ab Level 10
     - `spawnIntervalMs` sinkt von Level zu Level, `maxEnemies` höchstens 150. `bossId` bleibt leer bis M3.
  2. `enemies.ts`, Startwerte:
     - `cursedTree`: hp 30, speed 30, dmg 10, chase
     - `forestWitch`: hp 20, speed 40, shooter, alle 2000 ms ein Geschoss mit dmg 8, speed 120, hält 140 px Abstand
     - `zombieSquirrel`: hp 8, speed 110, dmg 5, chase
     - `forestSpirit`: hp 10, speed 60, aura mit Radius 48 und 12 dps
     - `xp` passend zur Gefahr
  3. `items.ts`:
     - `fireRate` +20 % je Stufe, `damage` +25 %, `size` +25 %, jeweils `maxStacks` 5
     - `heal` +25 HP
     - Gewichte 30/30/30/10
     - `ITEM_RULES` mit `dropChance` 0.08 und `lifetimeMs` 10000
  4. `weapon.ts`: Grundwerte 2 Schuss/s, Schaden 10, Skalierung 1, Geschwindigkeit 400, Reichweite 360.
  5. `player.ts`: `maxHp` 100, `turnSpeedDegPerSec` 270.
  6. `progression.ts`: Kurve `xpCurveBase` 100, `xpCurveExponent` 1.5, `lossXpFactor` 0.5.
  7. Kommentar am Dateikopf: „Startwerte, Feintuning in AP-15, nur hier ändern“.
- **Schnittstellen:** nutzt Verträge aus AP-01; stellt Konfiguration für alle Logik- und Spielpakete bereit
- **Akzeptanzkriterien:**
  - Tests belegen Batch-Grenzen, Dauern und Gegner-Verfügbarkeit genau nach PE-05, PE-09, PE-10 und `idee.txt`
  - Checks grün
- **Tests:** Tabellen-Tests für alle 21 Level; Gegner- und Item-Werte sind positiv; Gewichte > 0
- **Review-Schwerpunkte:** Übereinstimmung mit `idee.txt` und PE-05/09/10, keine Logik in Config
- **Doku-Pflichten:** –
- **Aufwand:** S · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-03): add game data for levels 0-20`

#### AP-04 – Plattform: Eingabe und Speicher

- **Meilenstein, Lane, Welle:** M0 · GAME · W2
- **Ziel:** Einheitliche Zielrichtung aus Maus und Touch und ein robuster lokaler Spielstand (PE-03, PE-13, §5).
- **Pflichtlektüre:** PE-03, PE-08, §5 (robustes Laden), `src/contracts/save.ts`
- **Abhängigkeiten:** AP-01
- **Parallel möglich mit:** AP-02, AP-03
- **Dateien (Eigentum):** `src/platform/{input,storage,angle}.ts`, `tests/platform/{storage,angle}.test.ts`
- **Nicht anfassen:** `src/scenes/*`, `src/config/*`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `angle.ts` (ohne Phaser): `angleFromCenter(px, py, cx, cy)` in Radiant und `normalizeAngle`.
  2. `input.ts`: Klasse `AimInput` für eine Phaser-Szene.
     - Maus: Das Ziel folgt dem Zeiger, auch ohne Klick.
     - Touch: Das Ziel ist der letzte Berührungspunkt und bleibt nach dem Loslassen erhalten.
     - Liefert `targetAngle`.
     - Unterdrückt das Kontextmenü und das Scrollen.
  3. `storage.ts`:
     - `loadSave()`, `writeSave()`, `resetSave()`, Schlüssel `360shooter.save.v1`
     - Fehlt der Stand, ist er kaputt oder hat er falsche Typen oder Werte außerhalb des Bereichs, gibt es den Standard ohne Absturz
     - Storage ist injizierbar für Tests. Fehler beim Schreiben (privater Modus) werden abgefangen.
- **Schnittstellen:** nutzt `SaveGame`; stellt `AimInput`, `angleFromCenter`, Storage-API für AP-10/AP-11 bereit
- **Akzeptanzkriterien:**
  - Kaputter oder manipulierter Spielstand führt zum Standard, kein Absturz
  - Checks grün
- **Tests:** Winkel in allen vier Quadranten; Storage: leer, gültig, kaputtes JSON, falsche Typen, negative Werte, Schreibfehler
- **Review-Schwerpunkte:** Validierung des Spielstands (§5), keine weiteren Daten gespeichert (R2)
- **Doku-Pflichten:** –
- **Aufwand:** S · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-04): add aim input and save storage`

### M1 – Kernspiel

#### AP-05 – Kampf-Logik

- **Meilenstein, Lane, Welle:** M1 · LOG · W1
- **Ziel:** Reine, getestete Funktionen für Drehung, Waffe, Items, HP und Zufall, ohne Phaser.
- **Pflichtlektüre:** §4 (Grundregeln), PE-03, PE-04, PE-12, PE-16, PE-17, `src/contracts/*`, `src/config/{weapon,items,player}.ts`
- **Abhängigkeiten:** M0 (AP-01–AP-04)
- **Parallel möglich mit:** AP-06, AP-07
- **Dateien (Eigentum):** `src/logic/{rotation,weapon,items,health,rng,geometry}.ts`, `tests/logic/{rotation,weapon,items,health,rng,geometry}.test.ts`
- **Nicht anfassen:** `src/logic/{round,spawn,progression}.ts` (AP-06), `src/config/*`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `rotation.ts`: `stepRotation(current, target, maxDegPerSec, dtMs)` dreht auf dem kürzeren Weg, maximal `maxDegPerSec × dt`. Kein Überschießen, Ergebnis normalisiert.
  2. `weapon.ts`:
     - `computeWeaponStats(base, stacks, itemDefs)` → `WeaponStats`
     - `FireTimer`: `tick(dtMs, fireRatePerSec)` → Anzahl der Schüsse in diesem Schritt (Akkumulator, unabhängig von der Bildrate)
  3. `items.ts`:
     - `rollDrop(rng, rules, defs)` → `ItemDef | null`, gewichtet
     - `applyItem(stacks, def)` → neue Stacks, gedeckelt bei `maxStacks`. `heal` ändert die Stacks nicht und gibt die Heilmenge zurück.
     - `isExpired(spawnedAtMs, nowMs, lifetimeMs)`
  4. `health.ts`: `applyDamage`, `applyHeal` (gedeckelt bei `maxHp`), `isDead`, `auraDamage(dps, dtMs)`.
  5. `rng.ts`: deterministischer Zufall mit Seed (z. B. mulberry32), Schnittstelle `next(): number`.
  6. `geometry.ts`: `circlesOverlap`, `pointOnRing(angle, radius, cx, cy)`, `distance`.
- **Schnittstellen:** nutzt Verträge; stellt Logik für AP-08, AP-09, AP-10 bereit
- **Akzeptanzkriterien:**
  - Kein Import von `phaser` in `src/logic`
  - Testabdeckung der Logikdateien ≥ 90 % der Zeilen
  - Checks grün
- **Tests:** Drehung über die 0°/360°-Grenze in beide Richtungen; FireTimer bei 30 und 144 fps gleich viele Schüsse pro Sekunde; Stack-Deckel; Drop-Verteilung mit festem Seed; HP-Grenzen
- **Review-Schwerpunkte:** Bildraten-Unabhängigkeit, keine hartkodierten Spielwerte
- **Doku-Pflichten:** –
- **Aufwand:** M · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-05): add combat logic`

#### AP-06 – Runden- und Fortschrittslogik

- **Meilenstein, Lane, Welle:** M1 · LOG · W1
- **Ziel:** Reine, getestete Logik für Rundenablauf, Spawns und Spielerlevel.
- **Pflichtlektüre:** PE-05, PE-09, PE-13, PE-17, PE-18 (Boss nur als Erweiterungspunkt), `src/contracts/*`, `src/config/{levels,progression}.ts`
- **Abhängigkeiten:** M0
- **Parallel möglich mit:** AP-05, AP-07
- **Dateien (Eigentum):** `src/logic/{round,spawn,progression}.ts`, `tests/logic/{round,spawn,progression}.test.ts`
- **Nicht anfassen:** Dateien von AP-05, `src/config/*`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `round.ts`: `RoundState`.
     - Erzeugen aus `LevelDef`, `tick(dtMs)`, `playerDied()`
     - Zustände `running`, `won`, `lost`, dazu `remainingMs` und `isFinalMinute`
     - Gewonnen, wenn die Zeit abgelaufen ist und die Spielerin lebt.
     - Erweiterungspunkt `requiresBossDefeat` (in M1 immer `false`), damit M3 nur ergänzt.
  2. `spawn.ts`: `SpawnDirector(level, rng)`.
     - `tick(dtMs, aliveCount)` → Liste von `{ enemyId, angle, radius }`
     - Gegner erscheinen auf einem Ring knapp außerhalb des Sichtfelds (Radius aus Konstruktor-Parameter), aus allen Richtungen und gewichtet nach `enemyPool`.
     - Das Intervall sinkt im Rundenverlauf (Startwert × 1,0 → × 0,6), `maxEnemies` wird beachtet.
  3. `progression.ts`:
     - `xpForLevel(n)` aus `ProgressionRules`
     - `roundXp(killXp, result)`: bei `lost` mit `lossXpFactor`
     - `applyRoundResult(save, levelId, result, xp)` → neuer `SaveGame` mit XP und Spielerlevel. Bei `won` wird das nächste Level freigeschaltet, höchstens bis `LEVEL_COUNT - 1`.
- **Schnittstellen:** nutzt `LevelDef`, `SaveGame`, `ProgressionRules`; stellt Logik für AP-09, AP-10, AP-11 bereit
- **Akzeptanzkriterien:**
  - Rundendauer stimmt für 180 s und 300 s
  - Niederlage hat Vorrang vor gleichzeitigem Timer-Ende
  - Spawns respektieren `maxEnemies` und den Gegnerpool des Levels
  - Kein `phaser`-Import, Checks grün
- **Tests:** Zustandswechsel; Spawn-Pool je Batch (Level 0 nur Bäume, Level 12 alle vier); gleichmäßige Winkelverteilung mit Seed; XP-Kurve, mehrere Level-ups auf einmal, Freischaltung nur bei Sieg, kein Überlauf über Level 20
- **Review-Schwerpunkte:** Regeln aus PE-05/09/13/17 korrekt, Erweiterungspunkt Boss sauber
- **Doku-Pflichten:** –
- **Aufwand:** M · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-06): add round, spawn and progression logic`

#### AP-07 – Designer-Anleitungen Grafik und Sound

- **Meilenstein, Lane, Welle:** M1 · ASSET · W1
- **Ziel:** Zwei Anleitungen, mit denen Grafikdesigner und der Nutzer ohne Programmierkenntnisse Sprites und Sounds ersetzen können, plus ein Prüfbefehl, der falsche Dateien meldet (PE-23, PE-24).
- **Pflichtlektüre:** PE-23, PE-24, PE-26, `src/config/assets.ts`, `public/assets/LICENSES.md`, README
- **Abhängigkeiten:** AP-02
- **Parallel möglich mit:** AP-05, AP-06
- **Dateien (Eigentum):** `docs/guides/grafik-austauschen.md`, `docs/guides/sound-austauschen.md`, `scripts/check-assets.mjs`, `package.json` (nur Skript `assets:check`), `tests/scripts/check-assets.test.ts`
- **Nicht anfassen:** `docs/masterBuildPlan.md`, `src/**`, `public/assets/*` (nur lesen)
- **Freigegebene Abhängigkeiten:** keine (nur Node-Bordmittel)
- **Umsetzung:**
  1. `grafik-austauschen.md`, einfache Sprache, kurze Sätze, Du-Form. Abschnitte:
     - Was du brauchst: kostenlose Programme wie LibreSprite oder Piskel; Aseprite als kostenpflichtige Alternative.
     - Die Regeln:
       - PNG mit transparentem Hintergrund, exakt die angegebene Größe
       - Frames waagerecht nebeneinander, Figur schaut nach rechts
       - harte Pixel ohne Kantenglättung, Dateiname unverändert
     - Tabelle aller Sprites: Dateiname, Frame-Größe, Anzahl Frames, Gesamtgröße der Datei, was darauf zu sehen ist, welcher Frame wofür. Die Werte kommen aus dem Manifest.
     - Schritt für Schritt: Datei öffnen, zeichnen, unter gleichem Namen in `public/assets/sprites/` speichern, `npm run assets:check`, Spiel mit `?assets=1` ansehen. Jeder Befehl wird erklärt: was er tut und wo man ihn eintippt.
     - Häufige Fehler und ihre Lösung.
     - Pflicht: Eintrag in `public/assets/LICENSES.md`, nur eigene oder ausdrücklich erlaubte Grafiken (Repo ist öffentlich).
  2. `sound-austauschen.md`, gleich aufgebaut:
     - Programme: Audacity; jsfxr oder ChipTone für Retro-Effekte.
     - Format: WAV, 16 Bit, mono, 44,1 kHz. Empfohlene Länge je Sound, keine Stille am Anfang, Lautstärke angleichen.
     - Tabelle aller Sounds mit Anlass im Spiel.
  3. `scripts/check-assets.mjs`:
     - prüft jede Datei aus dem Manifest: vorhanden, PNG-Größe passt zu Frames × Frame-Größe, WAV-Format laut Header
     - verständliche deutsche Meldungen, Exit-Code ≠ 0 bei Fehlern
     - Das Manifest wird gelesen, nicht dupliziert. Bei Bedarf als JSON-Export aus `src/config/assets.ts` über ein kleines TS-freies Hilfsmodul; der Weg wird im Bericht begründet.
- **Schnittstellen:** nutzt das Asset-Manifest aus AP-02
- **Akzeptanzkriterien:**
  - Jedes Asset aus dem Manifest steht in genau einer Tabelle
  - Eine absichtlich falsch große PNG führt zu einer klaren Fehlermeldung
  - Ein Nicht-Programmierer kann jeden Schritt ohne Vorwissen ausführen (Review liest mit dieser Brille)
- **Tests:** `check-assets` mit gültigen und fehlerhaften Testdateien (temporäres Verzeichnis)
- **Review-Schwerpunkte:** Verständlichkeit, Vollständigkeit gegenüber dem Manifest, Lizenzhinweis
- **Doku-Pflichten:** Verweis auf beide Anleitungen im README ist **nicht** Teil dieses Pakets (README gehört AP-13 in M2), stattdessen Liste im Bericht
- **Aufwand:** S · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein (Nutzerwunsch)
- **Commit-Typ:** `docs(AP-07): add asset replacement guides and asset check`

#### AP-08 – Astronautin, Laser, Items (Entities)

- **Meilenstein, Lane, Welle:** M1 · GAME · W2
- **Ziel:** Phaser-Objekte für die Spielerin (fest in der Mitte, verzögerte Drehung, Auto-Schuss), Laser-Projektile und Items, die man anschießen kann.
- **Pflichtlektüre:** PE-03, PE-04, PE-08, PE-12, PE-16, PE-17, `src/logic/{rotation,weapon,items,health}.ts`, `src/platform/input.ts`, `src/config/assets.ts`
- **Abhängigkeiten:** AP-05
- **Parallel möglich mit:** AP-09
- **Dateien (Eigentum):** `src/entities/{Player,Laser,LaserPool,ItemPickup}.ts`
- **Nicht anfassen:** `src/entities/enemies/*` (AP-09), `src/scenes/*`, `src/logic/*`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `Player`:
     - Sprite `astronaut` in der Mitte, Arcade-Body als Kreis
     - `update(dt, targetAngle)` dreht mit `stepRotation` und `turnSpeedDegPerSec`
     - feuert mit `FireTimer` über `LaserPool` in die aktuelle Blickrichtung
     - hält HP und Waffen-Stacks, `takeDamage`, `heal`, `applyItem`
     - sendet Änderungen über Callbacks (keine Szenen-Imports)
     - Animationen idle/shoot, sanftes Aufblinken bei Treffer: kurze helle Tönung, ca. 100–150 ms, kein greller Blitz, **kein Bildschirmwackeln** (PE-31)
  2. `LaserPool`: Objekt-Pool mit Arcade-Gruppe. Skalierung und Schaden nach aktuellen `WeaponStats`, Löschen ab `range`.
  3. `ItemPickup`:
     - erscheint an einer Gegnerposition
     - blinkt in den letzten 3 s und verschwindet nach `lifetimeMs`
     - `collect()` wird ausgelöst, wenn ein Laser es trifft. Der Laser wird dabei verbraucht.
- **Schnittstellen:** nutzt Logik aus AP-05 und `AimInput` aus AP-04; stellt Entities für AP-10 bereit
- **Akzeptanzkriterien:**
  - Spielwerte nur aus `src/config`
  - Logik nur über `src/logic`
  - Checks grün
  - Handtest über eine temporäre Debug-Szene ist **nicht** nötig, die Integration prüft AP-10
- **Tests:** keine Phaser-Tests; neue Hilfsfunktionen gehören nach `src/logic`, aber nicht in dieses Paket. Fehlt dort etwas, meldet der Coder das.
- **Review-Schwerpunkte:** keine Spiellogik dupliziert, Pooling, keine Speicherlecks (Listener abmelden)
- **Doku-Pflichten:** –
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-08): add player, laser and item entities`

#### AP-09 – Gegner (Entities)

- **Meilenstein, Lane, Welle:** M1 · GAME · W2
- **Ziel:** Die vier Gegnertypen aus `idee.txt` mit ihrem Verhalten, dazu das Hexen-Geschoss.
- **Pflichtlektüre:** `idee.txt` (Gegner), F-04, `src/config/enemies.ts`, `src/logic/{health,geometry}.ts`, `src/contracts/enemy.ts`
- **Abhängigkeiten:** AP-05, AP-06
- **Parallel möglich mit:** AP-08
- **Dateien (Eigentum):** `src/entities/enemies/{Enemy,ChaseEnemy,AuraEnemy,ForestWitch,WitchBolt,WitchBoltPool,createEnemy}.ts` (Ist-Stand nach AP-09: `EnemyPool` liegt in `createEnemy.ts`; Klassen je Verhalten statt je Gegnertyp)
- **Nicht anfassen:** Dateien von AP-08, `src/scenes/*`, `src/logic/*`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `Enemy` (Basis):
     - Sprite und Animation aus `spriteKey`, HP aus `EnemyDef`, `takeDamage` mit sanftem Aufblinken wie bei der Spielerin (PE-31), keine Schadenszahlen
     - Tod → Callback `onDeath(x, y, xp)`
     - Ausrichtung zur Mitte, Pooling-fähig (`spawn`/`despawn`)
  2. `chase` (`CursedTree`, `ZombieSquirrel`): läuft direkt zur Mitte. Kontaktschaden je Sekunde Kontakt.
  3. `shooter` (`ForestWitch`): nähert sich bis `keepDistance`, bleibt stehen, feuert im Intervall `WitchBolt` auf die Mitte.
  4. `aura` (`ForestSpirit`): läuft zur Mitte. Innerhalb von `aura.radius` meldet er Dauerschaden mit `auraDamage`, die Aura ist sichtbar als halbtransparenter Kreis.
  5. `createEnemy(scene, id)`: Fabrik aus `EnemyDef`, damit neue Gegner (Level 21+) nur Daten und höchstens ein neues Verhalten brauchen.
- **Schnittstellen:** nutzt Config und Logik; stellt Fabrik, Gruppen und Callbacks für AP-10 bereit
- **Akzeptanzkriterien:**
  - Alle vier Typen verhalten sich wie in F-04 beschrieben
  - Werte nur aus Config
  - Checks grün
- **Tests:** wie AP-08, keine Phaser-Tests
- **Review-Schwerpunkte:** Verhalten laut `idee.txt`, Erweiterbarkeit, Pooling
- **Doku-Pflichten:** –
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-09): add enemy entities`

#### AP-21 – Fix: Freischaltstand als Index

- **Meilenstein, Lane, Welle:** M1 · LOG/GAME · W2
- **Ziel:** `highestUnlockedLevel` ist eindeutig der Index des höchsten freigeschalteten Levels (PE-35). Ein neuer Spielstand schaltet nur Level 0 frei, und XP werden nie gebrochen gespeichert.
- **Pflichtlektüre:** PE-13, PE-35, §5 (robustes Laden), `src/contracts/save.ts`, `src/config/levels.ts` (`LEVEL_COUNT`), Ist-Code von AP-04 (`storage.ts`) und AP-06 (`progression.ts`)
- **Abhängigkeiten:** AP-04, AP-06
- **Parallel möglich mit:** AP-08, AP-09
- **Dateien (Eigentum):** `src/platform/storage.ts`, `tests/platform/storage.test.ts`, `src/logic/progression.ts`, `tests/logic/progression.test.ts`
- **Nicht anfassen:** `src/contracts/*`, `src/config/*`, `src/scenes/*`, `src/entities/*`, übrige `src/logic/*`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `storage.ts`:
     - `defaultSave()` setzt `highestUnlockedLevel` auf 0.
     - `parseSave` akzeptiert nur ganze Zahlen von 0 bis `LEVEL_COUNT - 1`. Die Obergrenze kommt aus `src/config/levels.ts` (importieren, nicht hartkodieren, `src/config` bleibt unverändert).
     - Ein Wert außerhalb des Bereichs führt wie bisher zum Standard, ohne Absturz.
     - `playerLevel` bleibt 1..1000.
  2. `progression.ts`:
     - `applyRoundResult` rundet die XP mit `Math.floor` ab, bevor sie addiert werden. Negative und ungültige Werte bleiben auf 0.
     - Freischaltung bei Sieg in Level n: `max(bisher, min(LEVEL_COUNT - 1, n + 1))`. Niederlage ändert die Freischaltung nicht.
  3. Tests:
     - Standard-Spielstand hat 0.
     - 0 und 20 sind gültig. -1, 21, 1,5 und Zeichenketten werden verworfen.
     - Sieg in Level 0 schaltet 1 frei, Sieg in Level 20 deckelt bei 20, Niederlage ändert nichts.
     - XP 12,7 wird als 12 gespeichert.
     - Testfixturen in den Progression-Tests nutzen Index-Semantik.
- **Schnittstellen:** nutzt `SaveGame` (Vertrag unverändert); stellt die korrigierte Speicher- und Fortschrittslogik für AP-10 und AP-11 bereit. Der Kommentar in `src/contracts/save.ts` ist nicht Teil dieses Pakets (Vertrag, AP-01). Die Bedeutung steht in PE-35.
- **Akzeptanzkriterien:**
  - Ein neuer Spielstand startet mit Level 0 frei
  - Ungültige Werte für `highestUnlockedLevel` führen zum Standard, kein Absturz
  - Checks grün
- **Tests:** siehe Umsetzung 3
- **Review-Schwerpunkte:** Bereich 0..20 an allen Stellen gleich, Konstante statt Zahl, keine Migration nötig (nichts ausgeliefert, PE-35)
- **Doku-Pflichten:** –
- **Aufwand:** S · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `fix(AP-21): define highest unlocked level as index`

#### AP-10 – Spielszene, HUD, Ergebnis

- **Meilenstein, Lane, Welle:** M1 · GAME · W3
- **Ziel:** Alles zu einer spielbaren Runde verbinden: Spawns, Kollisionen, Items, Timer, Sieg/Niederlage, Fortschritt speichern, HUD und Ergebnisbildschirm.
- **Pflichtlektüre:** §2 (F-01–F-11), PE-03–PE-18, PE-35, `src/contracts/events.ts`, alle Dateien aus AP-04–AP-09 und AP-21 (Schnittstellen), §18 (Erkenntnisse AP-06, AP-08, AP-09)
- **Abhängigkeiten:** AP-08, AP-09, AP-21
- **Parallel möglich mit:** –
- **Dateien (Eigentum):** `src/scenes/{GameScene,HudScene,ResultScene}.ts`, `src/scenes/debug.ts`
- **Nicht anfassen:** `src/main.ts`, `src/entities/*`, `src/logic/*`, `src/config/*`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `GameScene` startet mit `{ levelId }`. Der Debug-Parameter `?level=n` (0–20, ungültig → 0) startet ein Level direkt, `debug.ts` liest und begrenzt ihn.
  2. Ablauf:
     - `AimInput` → `Player`
     - `SpawnDirector` → `createEnemy` auf dem Ring
     - `RoundState` tickt
     - Kollisionen:
       - Laser ↔ Gegner: Schaden, beim Tod Drop-Wurf mit `rollDrop` → `ItemPickup`
       - Laser ↔ Item: einsammeln
       - Gegner ↔ Spielerin: Kontaktschaden
       - Hexen-Geschoss ↔ Spielerin
       - Aura des Spirits
  3. Events an `HudScene` laut Vertrag. HUD zeigt:
     - Timer `m:ss`
     - HP-Leiste
     - Waffenstufen (drei kleine Icons mit Zahl 0–5)
     - Pause-Taste
  4. Pause: Taste im HUD, `Esc`/`P` am PC. Automatische Pause, wenn die Seite in den Hintergrund geht (Browser-Tab wechseln, `visibilitychange`), ohne Tastendruck (PE-29). Kein Bildschirmwackeln, keine Schadenszahlen (PE-31).
  5. Rundenende:
     - `applyRoundResult` mit `writeSave`
     - `ResultScene` zeigt „Gewonnen“ oder „Verloren“, XP und Spielerlevel
     - Tasten „Nochmal“, „Nächstes Level“ (nur nach Sieg, Level < 20) und „Menü“
  6. Leistung: Pools nutzen. Bei 150 Gegnern am PC flüssig, Debug-FPS-Anzeige mit `?fps=1`.
- **Schnittstellen:** nutzt alles aus M0 und M1
- **Hinweise aus M1 W2 (Ist-API, Details §18):**
  - `new LaserPool(scene)`: `.group`, `.fire(x,y,rad,stats)`, `.release(laser)`, `.update()` pro Frame, `.destroy()`. `Laser` hat `damage` und `deactivate()`.
  - `new Player(scene,x,y,lasers)`: `update(dtMs, targetAngleRad)` pro Frame, `takeDamage(n)`, `heal(n)`, `applyItem(def)`. Felder `hp`, `stats`, `stacks`, `facingDeg`, `isDead`. Änderungen über `player.callbacks` (`onHpChange`, `onStatsChange`, `onShoot`, `onHurt`, `onDeath`). Die Szene setzt die Listener und räumt sie beim Szenenwechsel selbst ab.
  - `new ItemPickup(scene,x,y,def,ITEM_RULES)`: `update(nowMs)` pro Frame (gibt `false` zurück, wenn es weg ist), `collect()` löst `onCollected(def)` aus. Im Overlap ruft die Szene selbst `pool.release(laser)`, `item.collect()` und `player.applyItem(def)` auf.
  - `new EnemyPool(scene, { boltPool, onDeath(x,y,xp) })`: `spawn(id,x,y)`, `update(time,delta)` pro Frame (auch für das Aufblinken nötig), `clear()`, `enemies`. Pool-Gegner sind inaktiv. Im Overlap `.active` prüfen.
  - `createEnemy(scene,id,ctx)` wählt die Klasse über `ENEMIES[id].behavior`.
  - Enemy: `takeDamage(n)` (true bei Tod), `contactDamageFor(dtMs)`, `auraDamageAt(px,py,dtMs)`, `def`, `hp`, `active`.
  - `new WitchBoltPool(scene)`: `bolts` (`damage`, `active`), `update()`, `clear()`. Treffer gegen die Spielerin und `bolt.despawn()` übernimmt die Szene.
  - Reihenfolge je Frame: `playerDied()` vor `tick()` aufrufen (AP-06, §18).
  - Arena-Mitte `ARENA_CENTER` (320,180) liegt lokal in `Enemy.ts` und ist per `ctx.center` überschreibbar. Eine gemeinsame Auflösungskonstante ist offen (§16).
- **Akzeptanzkriterien:**
  - Alle Smoke-Test-Punkte von M1-DEP sind erfüllt
  - Kein Spielwert in Szenen hartkodiert
  - Checks grün
- **Tests:** `tests/scenes/debug.test.ts` für das Parsen der Parameter; Integration als Handtest-Checkliste im Bericht
- **Review-Schwerpunkte:** Kollisionen korrekt, Speicherung über Storage-API, Aufräumen beim Szenenwechsel (keine doppelten Listener nach „Nochmal“)
- **Doku-Pflichten:** Debug-Parameter im Bericht auflisten (README-Eintrag macht AP-13)
- **Aufwand:** L · **Modell:** opus · **Effort:** high
- **Opus-Grund:** Kern
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-10): wire game, hud and result scenes`

### M2 – Inhalte, Menü, iPhone

#### AP-11 – Hauptmenü und Fortschritt

- **Meilenstein, Lane, Welle:** M2 · GAME · W1
- **Ziel:** Hauptmenü mit Spielerlevel, Level-Auswahl 0–20 nach Batches und „Fortschritt zurücksetzen“ (F-08, F-09).
- **Pflichtlektüre:** F-08, F-09, PE-13, `src/platform/storage.ts`, `src/logic/progression.ts`, `src/config/levels.ts`
- **Abhängigkeiten:** M1
- **Parallel möglich mit:** AP-12, AP-13
- **Dateien (Eigentum):** `src/scenes/MenuScene.ts`, `src/scenes/menu/{LevelGrid,ConfirmDialog,Button,levelGroups}.ts`, `tests/scenes/levelGroups.test.ts`
- **Nicht anfassen:** `src/scenes/{GameScene,HudScene,ResultScene}.ts`, `index.html`, `src/config/*`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. Titel „360shooter“, Astronautin (Idle-Animation), Spielerlevel mit XP-Balken bis zum nächsten Level.
  2. `LevelGrid`:
     - Level 0–20 in drei Gruppen: Wald, Wald bei Nacht, Elfenwald
     - Gesperrte Level sind grau mit Schloss, freie Level sind antippbar.
     - Rundendauer (3:00/5:00) als kleine Angabe
  3. `Button`: Tasten groß genug für Finger (mindestens 32×32 logische Pixel), Hover am PC, sanftes Feedback.
  4. „Fortschritt zurücksetzen“ mit `ConfirmDialog` („Wirklich löschen?“) → `resetSave()`.
  5. Auswahl startet `GameScene` mit `{ levelId }`.
- **Hinweise aus M1 W3:**
  - `src/scenes/MenuScene.ts` enthält einen temporären Einstieg (`this.scene.start('GameScene')`, vom Lead im Review von AP-10 erlaubt). Dieser Stub wird durch das echte Menü ersetzt. Bis dahin startet die Menü-Taste der ResultScene sofort ein neues Level.
  - Aus `src/scenes/debug.ts` nutzbar (nur importieren, nicht ändern): `resolveLevelId`, `isValidLevelId`, `MAX_LEVEL_ID`.
- **Akzeptanzkriterien:**
  - Nur freigespielte Level startbar
  - Nach Sieg in Level n ist n+1 beim Zurückkehren frei
  - Reset wirkt sofort
  - Checks grün
- **Tests:** keine Phaser-Tests; falls Hilfslogik nötig (z. B. Gruppierung), als reine Funktion in `src/scenes/menu/levelGroups.ts` mit Test `tests/scenes/levelGroups.test.ts` (gehört diesem Paket)
- **Review-Schwerpunkte:** Bedienbarkeit per Touch, keine direkte `localStorage`-Nutzung
- **Doku-Pflichten:** –
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-11): add main menu with level select and progress`

#### AP-12 – Maps je Batch

- **Meilenstein, Lane, Welle:** M2 · GAME · W1
- **Ziel:** Drei einfache Maps mit Charme: Wald, Wald bei Nacht, Elfenwald (F-06).
- **Pflichtlektüre:** F-06, PE-10, `idee.txt` (Umgebung, Design-Orientierung Metroid-pixelig), `src/config/assets.ts`
- **Abhängigkeiten:** M1
- **Parallel möglich mit:** AP-11, AP-13
- **Dateien (Eigentum):** `src/config/maps.ts`, `src/entities/MapBackground.ts`, `src/scenes/GameScene.ts` (nur Einbindung des Hintergrunds), `tests/config/maps.test.ts`
- **Nicht anfassen:** übrige `src/config/*`, `MenuScene`, `index.html`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `maps.ts`: je `BatchId` ein Eintrag mit diesen Feldern:
     - Tileset-Key
     - Grundfarbe und Tönung
     - Dichte der Deko-Kacheln
     - optionaler Partikel-Effekt:
       - Wald: keiner
       - Nacht: Glühwürmchen
       - Elfenwald: schimmernde Sporen
     - Rand-Abdunklung (Vignette)
  2. `MapBackground`:
     - füllt die Fläche mit Kacheln aus dem Tileset, Verteilung zufällig mit festem Seed pro Level
     - Partikel leicht und ressourcenschonend (≤ 40)
     - Keine Hindernisse, nur Optik
  3. In `GameScene` beim Start den Hintergrund des Batches des Levels einbinden. Sonst bleibt `GameScene` unverändert.
- **Akzeptanzkriterien:**
  - Die drei Batches sind auf einen Blick unterscheidbar
  - Mit Designer-Tilesets funktioniert es ohne Code-Änderung
  - Spielbarkeit (Lesbarkeit der Gegner) bleibt erhalten
  - Checks grün
- **Tests:** jeder `BatchId` hat einen Map-Eintrag mit gültigem Asset-Key
- **Review-Schwerpunkte:** Leistung auf dem Handy, Lesbarkeit
- **Doku-Pflichten:** –
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** ja (Partikel weglassen)
- **Commit-Typ:** `feat(AP-12): add batch maps`

#### AP-13 – PWA und Querformat

- **Meilenstein, Lane, Welle:** M2 · OPS · W1
- **Ziel:** Das Spiel läuft auf dem iPhone als Homescreen-App im Vollbild, vom PC über das WLAN; im Hochformat erscheint „Bitte drehen“ (F-10, F-14, PE-14, PE-25).
- **Pflichtlektüre:** PE-14, PE-25, §5 (Dev-Server im WLAN), §6 (Deployment-Anleitung), H-03
- **Abhängigkeiten:** M1
- **Parallel möglich mit:** AP-11, AP-12
- **Dateien (Eigentum):** `index.html`, `public/manifest.webmanifest`, `public/icons/*`, `scripts/generate-icons.mjs`, `vite.config.ts`, `package.json` (nur Skripte `preview:lan`, `icons`), `README.md`
- **Nicht anfassen:** `src/**`
- **Freigegebene Abhängigkeiten:** keine (keine PWA-Plugins; Service Worker entfällt, weil iOS ihn über `http://` im LAN nicht zulässt)
- **Umsetzung:**
  1. `manifest.webmanifest`: Name, `display: fullscreen`, `orientation: landscape`, Farben, Icons 180/192/512.
  2. `index.html`:
     - `apple-mobile-web-app-capable`, Statusleiste, `apple-touch-icon`
     - `viewport-fit=cover`, Safe-Area-Ränder
     - Doppeltipp-Zoom, Long-Press-Menü und Textauswahl unterdrücken
     - CSS-Overlay „Bitte drehen“ bei Hochformat
  3. `scripts/generate-icons.mjs`: Platzhalter-Icons aus Node-Bordmitteln. Echte Icons kann der Designer ersetzen, die Anleitung bekommt einen Hinweis im README.
  4. Skript `preview:lan`: `build` und danach `vite preview --host`, die lokale IP im Terminal sichtbar.
  5. README um diese Abschnitte ergänzen:
     - „Am PC spielen“
     - „Auf dem iPhone spielen“: Schritt für Schritt mit gleichem WLAN, Firewall-Abfrage „Zulassen“, IP in Safari, „Teilen → Zum Home-Bildschirm“
     - Hinweis: nur im Heimnetz, keine Portweiterleitung
     - „Debug-Parameter“ (`?level=`, `?fps=1`, `?assets=1`)
     - Verweise auf `docs/guides/grafik-austauschen.md` und `docs/guides/sound-austauschen.md`
- **Akzeptanzkriterien:**
  - iPhone: Homescreen-App startet ohne Safari-Leisten
  - Hochformat zeigt das Overlay
  - Kein Zoomen und kein Scrollen beim Spielen
  - Checks grün
- **Tests:** keine; Handtest-Checkliste im Bericht
- **Review-Schwerpunkte:** keine externen Requests, Hinweis zum Heimnetz, Verständlichkeit der README-Schritte
- **Doku-Pflichten:** README
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein (iPhone ist Pflicht)
- **Commit-Typ:** `feat(AP-13): add pwa setup and landscape lock`

#### AP-14 – Sound-Anbindung und Stummschalten

- **Meilenstein, Lane, Welle:** M2 · GAME · W2
- **Ziel:** Platzhalter-Sounds an den richtigen Stellen, Stummschalt-Taste, Zustand gespeichert (F-13, PE-24).
- **Pflichtlektüre:** PE-24, `src/config/assets.ts`, `src/platform/storage.ts` (`muted`), `src/contracts/events.ts`
- **Abhängigkeiten:** AP-11, AP-12
- **Parallel möglich mit:** AP-15
- **Dateien (Eigentum):** `src/platform/audio.ts`, `src/scenes/{GameScene,HudScene,ResultScene,MenuScene}.ts` (nur Sound-Aufrufe und Stumm-Taste), `tests/platform/audio.test.ts`
- **Nicht anfassen:** `src/config/*` (AP-15), `src/entities/*`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `audio.ts`: `SoundService`.
     - `play(key)` beachtet `muted`. Der Laser-Sound wird gedrosselt, höchstens alle 80 ms.
     - `setMuted` speichert über Storage und sendet `mute-changed`.
     - Auf iOS wird Audio beim ersten Antippen freigeschaltet.
  2. Sound-Aufrufe:
     - `laser`, `hit`, `enemy-death`, `item-pickup` und `player-hurt` in `GameScene`
     - `round-won` und `round-lost` in `ResultScene`
  3. Stumm-Taste (Icons `ui-icons`) im HUD und im Menü.
  4. Lautstärke-Grundwert in `src/platform/audio.ts` als eine Konstante (kein Config-Eingriff in dieser Welle).
- **Akzeptanzkriterien:**
  - Stumm bleibt nach Neuladen stumm
  - Auf dem iPhone ist Ton nach dem ersten Antippen hörbar
  - Ersetzte WAV-Dateien werden ohne Code-Änderung gespielt
  - Checks grün
- **Tests:** Drosselung und Mute-Logik mit Fake-Sound und Fake-Storage
- **Review-Schwerpunkte:** keine doppelten Listener, Drosselung
- **Doku-Pflichten:** –
- **Aufwand:** S · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein (F-13)
- **Commit-Typ:** `feat(AP-14): add sound playback and mute`

#### AP-15 – Balancing Level 0–20

- **Meilenstein, Lane, Welle:** M2 · SH · W2
- **Ziel:** Spielwerte so abstimmen, dass jedes Level etwas schwerer wird, Level 0 leicht ist und Level 20 fordernd, ohne unfair zu sein. Mit Erklärung für den Nutzer zum Nachjustieren.
- **Pflichtlektüre:** `idee.txt` (Gegner), PE-05, PE-16, PE-17, `src/config/*`, `src/logic/*`
- **Abhängigkeiten:** M1
- **Parallel möglich mit:** AP-14
- **Dateien (Eigentum):** `src/config/{levels,enemies,items,weapon,player,progression}.ts`, `tests/config/*.test.ts` (außer `assets`, `maps`), `tests/logic/balance.test.ts`, `docs/balancing.md`
- **Nicht anfassen:** `src/config/{assets,maps}.ts`, `src/logic/*`, Szenen
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. Kennzahlen pro Level berechnen, als reine Rechnung im Test, mit `src/logic`:
     - Gegner-HP pro Minute
     - mögliche Spieler-DPS ohne und mit Items
     - Schaden pro Minute bei freiem Durchlauf
  2. Werte anpassen, bis drei Bedingungen gelten:
     - Die Schwierigkeit steigt pro Level monoton.
     - Ein Batch-Sprung ist spürbar, aber nicht abrupt.
     - Die 5-Minuten-Level sind fordernder als die 3-Minuten-Level desselben Batches.
  3. `balance.test.ts` sichert diese Bedingungen.
  4. `docs/balancing.md`: in einfacher Sprache erklären, welcher Wert was bewirkt und wo er steht, mit einer Tabelle aller Level und ihrer Kennzahlen.
- **Akzeptanzkriterien:**
  - Bedingungen aus Schritt 2 als Tests grün
  - Handtest durch den Nutzer in M2-DEP: Level 0 gut schaffbar, Level 20 nur mit Items
  - Checks grün
- **Tests:** `balance.test.ts`, bestehende Config-Tests angepasst
- **Review-Schwerpunkte:** Werte nur in Config, nachvollziehbare Doku
- **Doku-Pflichten:** `docs/balancing.md`
- **Aufwand:** M · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** ja (K1: nur Kennzahlen-Tabelle, keine Monotonie-Tests)
- **Commit-Typ:** `feat(AP-15): balance levels 0-20`

#### AP-22 – Fix: Debug-Parameter `?level=n` im Menü-Flow

- **Meilenstein, Lane, Welle:** M2 · GAME · W3
- **Ziel:** `?level=n` startet nach dem Preload direkt `GameScene` mit Level n (0–20). Ungültige Werte und Zahlen außerhalb werden wie bisher in `parseDebugLevel` behandelt (nicht ganzzahlig → 0, sonst auf 0..20 begrenzt). Der Direktstart gilt unabhängig vom Freischaltstand. Ohne Parameter bleibt es beim Hauptmenü. Der Start verändert den Spielstand nicht (PE-36).
- **Ursache (Befund Nutzer-Handtest):** Seit AP-11 startet `PreloadScene` immer `MenuScene`. `GameScene` liest `?level` nur, wenn keine Level-Daten übergeben werden. Der Parameter greift deshalb nie.
- **Pflichtlektüre:** PE-36, PE-13, §9.2 M1-DEP und M2-DEP (Smoke-Test), `src/scenes/debug.ts`, `src/scenes/PreloadScene.ts`, `src/scenes/GameScene.ts` (nur lesen: `resolveLevelId`, Szenendaten `{ levelId }`), `tests/scenes/debug.test.ts`
- **Abhängigkeiten:** keine offenen (AP-10, AP-11 fertig)
- **Parallel möglich mit:** – (W3 enthält nur dieses Paket)
- **Dateien (Eigentum):** `src/scenes/PreloadScene.ts`, `src/scenes/debug.ts`, `tests/scenes/debug.test.ts`
- **Nicht anfassen:** `src/scenes/{GameScene,MenuScene,ResultScene,HudScene}.ts`, `src/platform/*`, `src/logic/*`, `src/config/*`, `src/main.ts`, `index.html`, `README.md`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `debug.ts`: neue reine Funktion `resolveStartTarget(search: string)`. Sie liefert `{ scene: 'GameScene', levelId }`, wenn `?level` vorhanden ist (Wert über `parseDebugLevel`), sonst `{ scene: 'MenuScene' }`. Sie liest nur die Query-Zeichenkette und keinen Spielstand.
  2. `PreloadScene.create()`: `?assets=1` (Debug-Ansicht) bleibt vorrangig. Danach startet die Szene das Ziel aus `resolveStartTarget(window.location.search)`. Bei `GameScene` werden `{ levelId }` übergeben, bei `MenuScene` wie bisher keine Daten. Die Szene enthält keine eigene Parse-Logik.
  3. Der Start schreibt keinen Spielstand (kein `writeSave` in den geänderten Dateien).
  4. Runden mit Debug-Level werden am Rundenende wie jede Runde gespeichert (PE-36, `GameScene` bleibt unverändert).
  5. Tests in `tests/scenes/debug.test.ts`: ohne Parameter → `MenuScene`; `?level=12` → `GameScene` mit 12; `?level=20` → 20; `?level=99` → 20; `?level=-3` → 0; `?level=abc` und `?level=1.5` → 0; `?level=5&fps=1` → 5; `?fps=1` allein → `MenuScene`.
- **Schnittstellen:** nutzt `parseDebugLevel`, `resolveLevelId`, `MAX_LEVEL_ID` aus `debug.ts` und die Szenendaten `{ levelId }` von `GameScene` (unverändert).
- **Akzeptanzkriterien:**
  - `?level=n` startet direkt in `GameScene` mit Level n (0–20), auch wenn Level n gesperrt ist
  - Ohne Parameter startet das Menü wie bisher
  - Der Start schreibt keinen Spielstand
  - Checks grün (`lint`, `typecheck`, `test`, `build`)
  - Handtest durch den Nutzer: `?level=12` startet Elfenwald, alle vier Gegnertypen (Verfluchter Baum, Wald-Hexe, Zombie-Eichhörnchen, Böser Wald-Spirit) sind im Spiel zu sehen
- **Tests:** Vitest für `resolveStartTarget` (Umsetzung 5). Die Phaser-Szene selbst wird nicht getestet. Der Handtest steht in der Checkliste des Berichts.
- **Review-Schwerpunkte:** `PreloadScene` ruft nur die reine Funktion, Clamping identisch zu `parseDebugLevel`, `?assets=1` nicht gebrochen, kein Schreibzugriff auf den Spielstand beim Start.
- **Doku-Pflichten:** Der Bericht beschreibt das Verhalten (Direktstart, Spielstand beim Start unverändert, Runden wie PE-36). README nicht anfassen (`Q-13` entscheidet über eine Änderung der Runden-Speicherung).
- **Aufwand:** S · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein (M2-DEP hängt daran)
- **Commit-Typ:** `fix(AP-22): start debug level directly from preload`

#### AP-23 – Balancing-Nachbesserung Level 5–20

- **Meilenstein, Lane, Welle:** M2 · SH · W4
- **Ziel:** Nach dem Nutzer-Handtest kippt das Spiel ab Level 5, Level 12 ist zu schwer. Gegner ab Level 5 werden langsamer, die Startwaffe (Laserpistole) feuert schneller, und die Schwierigkeit steigt von Level 5 bis 20 gleichmäßig. Level 0–4 bleiben in ihren Spawn-Werten unverändert (PE-38).
- **Pflichtlektüre:** PE-38, PE-05, PE-16, PE-17, Umsetzung und Erkenntnisse von AP-15 (Druck-Kennzahl, §18), `src/config/{levels,enemies,weapon}.ts`, `src/logic/spawn.ts` (nur lesen), `docs/balancing.md`
- **Abhängigkeiten:** keine (AP-15 fertig)
- **Parallel möglich mit:** AP-24 (keine gemeinsamen Dateien)
- **Dateien (Eigentum):** `src/config/{levels,enemies,weapon}.ts`, `tests/config/{levels,enemies}.test.ts`, `tests/config/weapon.test.ts` (neu), `tests/logic/balance.test.ts`, `docs/balancing.md`
- **Nicht anfassen:** `src/config/{assets,maps,items,player,progression,index}.ts`, `src/entities/*`, `src/logic/*`, `src/scenes/*`, `src/contracts/*`. Keine Logikänderung: die Werte wirken über die bestehende Konfiguration.
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `weapon.ts`: `fireRatePerSec` von 3 auf 4 (Richtwert, angenommen). Die Feuerrate wirkt auf alle Level, also werden Level 0–4 dadurch ebenfalls leichter. Das im Bericht nennen.
  2. `enemies.ts`: Zombie-Eichhörnchen (`zombieSquirrel`) `speed` von 110 auf 80 (Richtwert, angenommen). Es erscheint erst ab Level 5, Level 0–4 sind nicht betroffen.
  3. Verfluchter Baum (`cursedTree`) bleibt in diesem Paket unverändert, er erscheint schon ab Level 0. Eine Tempo-Senkung nur ab Level 5 braucht eine Änderung außerhalb der Daten, siehe §16 „Vorgeschlagene Änderungen“. Ohne Freigabe dieses Vorschlags bleibt der Baum unverändert.
  4. `levels.ts`: `spawnIntervalMs` und `maxEnemies` für Level 5–20 neu abstimmen:
     - Die Werte für Level 0–4 bleiben gleich wie vor AP-23 (Festwerte im Test).
     - Die Druck-Kennzahl (Gegner-HP/s geteilt durch Basis-DPS, wie in AP-15) steigt ab Level 5 von Level zu Level.
     - Der Sprung von Level 4 auf Level 5 ist höchstens +12 % (vorher +22 %).
     - Jeder weitere Schritt bis Level 20 ist höchstens +10 %.
     - Die Richtwerte sind Vorschläge. Der Coder darf sie anpassen, wenn er die Bedingungen einhält und die Änderung im Bericht nennt.
     - Die Basis-DPS steigt mit der Feuerrate. Die Druck-Werte aller Level sinken dadurch, deshalb die Kurve nach Schritt 1 neu rechnen.
  5. Tests:
     - `tests/config/weapon.test.ts` (neu): `fireRatePerSec` ist mindestens 4.
     - `tests/config/enemies.test.ts`: `zombieSquirrel.speed` höchstens 80, alle Gegner-Geschwindigkeiten größer 0.
     - `tests/config/levels.test.ts`: Festwerte für Level 0–4 (`spawnIntervalMs`, `maxEnemies`).
     - `tests/logic/balance.test.ts`: Druck-Bedingungen aus Umsetzung 4 (Schritt 4→5 höchstens +12 %, danach höchstens +10 % je Level, monoton). Bestehende Batch-Bedingungen bleiben grün.
  6. `docs/balancing.md`: Kennzahlen-Tabelle neu erzeugen (sie ist handkopiert), Abschnitt „Änderung nach dem Handtest (AP-23)“ in einfacher Sprache. Die Druck-Werte sind gegenüber AP-15 nicht vergleichbar.
- **Schnittstellen:** keine Vertragsänderung. `src/logic/spawn.ts` und die Entities lesen die Werte weiterhin über `src/config`.
- **Akzeptanzkriterien:**
  - Tests aus Umsetzung 5 grün, Level 0–4 Spawn-Werte unverändert
  - Checks grün (`lint`, `typecheck`, `test`, `build`, `assets:check`)
  - Handtest durch den Nutzer in M2-DEP (`?level=5`, `?level=12`): Level 5 kippt nicht, Level 12 ist mit der Startwaffe fair zu schaffen
- **Tests:** wie Umsetzung 5
- **Review-Schwerpunkte:** nur Daten geändert, keine Logik in `src/config`, keine Spielwerte in Szenen, Level 0–4 Festwerte, Zahlen in `docs/balancing.md` stimmen mit `src/config` überein
- **Doku-Pflichten:** `docs/balancing.md`
- **Aufwand:** S · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein (Befund des Nutzers)
- **Commit-Typ:** `fix(AP-23): rebalance levels 5-20 and start weapon fire rate`

#### AP-24 – Gegnerische Projektile abschießbar

- **Meilenstein, Lane, Welle:** M2 · GAME/LOG · W4 (vor M3, weil Bosse Geschosse schießen)
- **Ziel:** Die Laserpistole des Spielers zerstört gegnerische Geschosse, zum Beispiel das Hexen-Geschoss der Wald-Hexe. Ein Treffer entfernt Laser und Geschoss. Kein Durchschlag: Ein Laser trifft genau ein Ziel (Gegner, Item oder Geschoss). Angenommen, siehe PE-37.
- **Pflichtlektüre:** PE-37, PE-16, PE-31, §12 AP-09 und AP-10 (Hinweise Ist-API), §18 Erkenntnisse AP-08, AP-09 und AP-10, `src/scenes/GameScene.ts` (Block `addColliders`), `src/entities/enemies/WitchBolt.ts`, `src/entities/enemies/WitchBoltPool.ts`, `src/entities/LaserPool.ts`, `src/logic/geometry.ts`
- **Abhängigkeiten:** keine offenen (AP-09 und AP-10 fertig)
- **Parallel möglich mit:** AP-23 (keine gemeinsamen Dateien)
- **Dateien (Eigentum):** `src/logic/projectiles.ts` (neu), `tests/logic/projectiles.test.ts` (neu), `src/scenes/GameScene.ts`
- **Nicht anfassen:** `src/entities/*`, `src/config/*`, `src/contracts/*`, übrige `src/logic/*`, `src/scenes/{HudScene,ResultScene,MenuScene,PreloadScene,debug}.ts`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `src/logic/projectiles.ts`: reine Funktion `canLaserDestroyBolt(laser, bolt)`. Sie liefert `true`, wenn beide aktiv sind und sich die Kreise überschneiden (`circlesOverlap` aus `geometry.ts`). Eingabe ist `{ active, x, y, radius }`, ohne Phaser-Typen.
  2. `GameScene.addColliders()`: neuer Overlap von `this.boltPool.bolts` mit `this.lasers.group`, nach dem Muster Laser gegen Gegner. Im Callback: `active` und `this.ended` prüfen, `this.lasers.release(laser)`, `bolt.despawn()`. Optional kurzer Treffer-Ton `sfx-hit`, bestehende Drosselung nutzen. Radien aus den Körpern der Entities, keine Zahlen im Code.
  3. Doppeltreffer vermeiden: Der Laser ist nach dem ersten Treffer inaktiv, das Geschoss wird nur einmal entfernt.
  4. Tests in `tests/logic/projectiles.test.ts`: Treffer bei Überlappung, kein Treffer ohne Überlappung, kein Treffer bei inaktivem Laser oder Geschoss, Berührung zählt als Treffer.
- **Schnittstellen:** nutzt `LaserPool.release`, `WitchBolt.despawn`, `boltPool.bolts`, `circlesOverlap`. Verträge und Pools bleiben unverändert. Die Logik ist für Boss-Geschosse (M3) wiederverwendbar.
- **Akzeptanzkriterien:**
  - Ein Laser zerstört ein Hexen-Geschoss, danach sind Laser und Geschoss weg
  - Ein Laser trifft nie zwei Ziele
  - Treffer auf Gegner und Items funktionieren wie bisher
  - Checks grün (`lint`, `typecheck`, `test`, `build`)
  - Handtest durch den Nutzer (M2-DEP): ab Level 5, Wald-Hexe schießt, Laser trifft Geschoss
- **Tests:** Vitest für `projectiles.ts`. Die Szene wird nicht getestet, der Handtest steht im Bericht.
- **Review-Schwerpunkte:** Pool-Rückgabe genau einmal, `ended`-Guard, keine Änderung an `src/entities`, keine Spielwerte in der Szene
- **Doku-Pflichten:** – (der Bericht beschreibt das Verhalten)
- **Aufwand:** S · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein (vor M3 nötig)
- **Commit-Typ:** `feat(AP-24): let player lasers destroy enemy projectiles`

### M2b – Gold und Waffen-Items (freigegeben, noch nicht begonnen)

Die Pakete hängen an den Entscheidungen PE-39 bis PE-53 (§16). Der Nutzer hat Umfang, Verträge und Reihenfolge am 2026-10-24 freigegeben (H-07, V-01 bis V-04 in §2, §4, §9 übernommen). Am 2026-10-25 kamen AP-38 (Fix iPhone, W1) und AP-39 (Stick, W2) aus dem iPhone-Test dazu. Der Stick ist mit V-05 freigegeben (2026-10-25), AP-39 wartet nur noch auf AP-38. Alle Verträge sind in W1 additiv. Jedes Paket nutzt nur Verträge und Config aus früheren Wellen.

Rüstungen (PE-47, PE-52, PE-58): Pilot ist der Feuerring. Der Katalog weiterer Rüstungen ist spätere Planung, die Definition liegt als Daten vor. Die Rüstung ist Pflicht (F-17, V-06 abgelehnt) und hat Priorität. Die Pakete AP-37a (W3, Vertrag, Config, Logik), AP-37c (W4, Entity und Pickup-Sprite) und die Einbindung in AP-33 (W5) sowie die Anzeige in AP-34 (W4) stehen in M2b.

#### AP-37a – Rüstung: Vertrag, Config und Logik (Feuerring)

- **Meilenstein, Lane, Welle:** M2b · SH/LOG · W3
- **Ziel:** Der Feuerring (PE-52) als Daten und reine Logik: Vertrag `ArmourDef`, Zustand `ActiveArmour`, Aktivierung, Zeitablauf, Ring-Schaden, Drop-Wurf. Weitere Rüstungen kommen später nur als Daten (PE-58).
- **Pflichtlektüre:** PE-47, PE-52, PE-57, PE-58, F-17, `src/contracts/{events,index}.ts` (Ist-Stand nach AP-25), `src/logic/geometry.ts` und `src/logic/rng.ts` (nur lesen)
- **Abhängigkeiten:** AP-25 (`events.ts`, `index.ts` aus W1). Keine Kante zu AP-29 oder AP-30 (gleiche Welle), die Rüstung hat einen eigenen Zustand
- **Parallel möglich mit:** AP-29, AP-30 (keine gemeinsame Datei)
- **Dateien (Eigentum):** `src/contracts/{armour,events,index}.ts` (neu: `armour.ts`; `events.ts` nur die Konstante und Payload für `armour-changed`), `src/config/armour.ts` (neu), `src/logic/armour.ts` (neu), `tests/config/armour.test.ts` (neu), `tests/logic/armour.test.ts` (neu)
- **Nicht anfassen:** `src/logic/{items,weapon,powers,economy,upgrades,coins}.ts`, `src/config/{items,assets,enemies,index}.ts`, `src/entities/*`, `src/scenes/*`, `src/platform/*`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `src/contracts/armour.ts`: Typ `ArmourDef` mit `id`, `label` (deutsch), `durationMs`, `cooldownMs`, `radiusPx`, `damagePerSec`. Typ `ArmourRules` mit `dropChance`. Typ `ActiveArmour` mit `id` (oder null), `activeMsLeft`, `cooldownMsLeft`. Nur Typen, kein Phaser.
  2. `events.ts`: Konstante `armour-changed` mit Payload `ActiveArmour`. Bestehende Events bleiben. `index.ts` exportiert `armour`.
  3. `src/config/armour.ts`: Liste `ARMOURS` mit dem Feuerring (`durationMs` 5000, `cooldownMs` 20000, `radiusPx` 72, `damagePerSec` 20, PE-52). `ARMOUR_RULES.dropChance` 0,02 (Richtwert, Q-23 bestätigt). Keine Logik in der Config.
  4. `src/logic/armour.ts` (ohne Phaser): `createArmourState()`. `activateArmour(state, def)` wirkt nur ohne aktive Rüstung und ohne Abklingzeit, sonst gibt sie den Zustand unverändert zurück (PE-57). `tickArmour(state, dtMs)` zählt die aktive Zeit herunter, danach startet die Abklingzeit. `ringDamageFor(def, dtMs)` gibt `damagePerSec` × dt in Sekunden zurück. `isInRing(...)` prüft über `circlesOverlap` aus `logic/geometry.ts`. `rollArmourDrop(rng, rules)` wie `rollCoinDrop`. `resetArmour()` für das Rundenende.
  5. Die Zeit kommt immer als `dtMs` der pausierbaren Spielzeit (PE-29), die Logik kennt keine Rohzeit.
- **Schnittstellen:** Vertrag für AP-33, AP-34 und AP-37c. Keine Vertragsänderung nach W3.
- **Akzeptanzkriterien:**
  - Ring-Schaden 20 je Sekunde bei 1000 ms, außerhalb von 72 px kein Schaden
  - Aktivierung wirkt nur ohne aktive Rüstung und Abklingzeit, Aktivzeit 5 s, danach 20 s Abklingzeit
  - Keine Phaser-Importe, Checks grün
- **Tests:** `tests/config/armour.test.ts`: Werte des Feuerrings, Drop-Chance zwischen 0 und 1, `ARMOURS` enthält den Feuerring mit eindeutiger ID. `tests/logic/armour.test.ts`: Aktivierung, Blockade während aktiv und Abklingzeit, Ende nach 5 s, Abklingzeit 20 s, Schaden je Schritt (dt-Skalierung), Radius-Grenze innen und außen, Drop-Rate mit festem Seed (ca. 2 %), Reset
- **Review-Schwerpunkte:** Werte nur aus Config, Zeit nur über `dtMs`, keine Phaser-Importe, Vertrag additiv, Regeln aus PE-57 umgesetzt
- **Doku-Pflichten:** –
- **Aufwand:** M · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein (F-17 ist Pflicht)
- **Commit-Typ:** `feat(AP-37a): add armour contract, config and fire ring logic`

#### AP-37c – Rüstung: Feuerring-Entity und Pickup-Sprite

- **Meilenstein, Lane, Welle:** M2b · GAME/ASSET · W4
- **Ziel:** Ein sichtbarer Feuerring um die Spielerin, ein Pickup, das wie ein Item eingesammelt wird, und das Platzhalter-Sprite über die bestehende Pipeline (PE-23, F-12).
- **Pflichtlektüre:** PE-23, PE-47, PE-52, PE-57, `src/config/assets.ts` und `docs/guides/grafik-austauschen.md` (Ist-Stand), `src/entities/ItemPickup.ts` (Ist-Stand, als Muster), `src/contracts/armour.ts` und `src/config/armour.ts` (AP-37a)
- **Abhängigkeiten:** AP-26 (Asset-Muster, `assets.ts`), AP-37a (Vertrag und Config)
- **Parallel möglich mit:** AP-31, AP-34 (keine gemeinsame Datei). Die Position der Spielerin übergibt die Szene, `Player.ts` bleibt unberührt
- **Dateien (Eigentum):** `src/entities/{ArmourRing,ArmourPickup}.ts` (neu), `src/config/assets.ts`, `public/assets/sprites/item-fire-ring.png` (neu), `public/assets/.placeholders.json`, `public/assets/LICENSES.md`, `docs/guides/grafik-austauschen.md`, `tests/config/assets.test.ts`
- **Nicht anfassen:** `src/entities/{Player,LaserPool,Coin,CoinPool}.ts` (AP-31), `src/scenes/*` (Einbindung in AP-33), `src/logic/*`, `src/config/{armour,items,...}.ts` (nur lesen)
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. Manifest additiv: `item-fire-ring` 16×16 ×2 Frames, deutsche `description`. `npm run assets:placeholders`, danach `npm run assets:check`. Der Generator darf keine Designer-Dateien überschreiben.
  2. `docs/guides/grafik-austauschen.md`: eine Zeile für `item-fire-ring`. `LICENSES.md`: „selbst erzeugt“.
  3. `src/entities/ArmourPickup.ts`: Muster wie `ItemPickup`, Sprite `item-fire-ring`, Verfall nach `ITEM_RULES.lifetimeMs` (wie Items), `collect()` ruft `onCollected(def)` auf. Eingesammelt wird durch Anschießen (PE-57). Die Zeit kommt von der Szene (pausierbar).
  4. `src/entities/ArmourRing.ts`: Kreis mit dem Radius aus `ArmourDef`, Transparenz 50 %, Tiefe über dem Spielfeld. `show(def)`, `hide()`, `setCenter(x, y)` pro Frame, `destroy()`. Der Ring zeigt nur an. Schaden und Zeit liegen in AP-37a.
  5. Keine Pooling-Pflicht, es gibt höchstens ein Pickup und einen Ring. Listener abmelden, Objekte beim Szenenwechsel zerstören.
- **Schnittstellen:** Entities für AP-33. Keine Vertragsänderung. `ARMOURS` nur aus `src/config/armour` importieren, nicht über `src/config/index.ts`. Branch `agent/AP-37-c<n>` und Commit-Betreff `feat(AP-37): …` (Lead-Skript, §18).
- **Akzeptanzkriterien:**
  - `npm run assets:check` grün, zweiter Generatorlauf ändert nichts
  - Keine Spielwerte und keine Logik in den Entities, nur Anzeige und Aufrufe
  - Checks grün
- **Tests:** `tests/config/assets.test.ts` um `item-fire-ring` erweitert (eindeutig, Datei vorhanden, Frame-Größe passt). Phaser-Entities nur im Handtest (M2b-DEP)
- **Review-Schwerpunkte:** Generator überschreibt keine Designer-Dateien, Lizenzliste, Ring ohne Logik, Listener aufräumen
- **Doku-Pflichten:** `docs/guides/grafik-austauschen.md`, `public/assets/LICENSES.md`
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** ja (Ring ohne Pulsieren, nur statische Linie; K8)
- **Commit-Typ:** `feat(AP-37): add fire ring entity and pickup sprite` (Lead-Skript, §18)

#### AP-25 – Verträge Gold, Upgrades, Waffen-Items

- **Meilenstein, Lane, Welle:** M2b · SH · W1
- **Ziel:** Alle neuen Typen und Events als Verträge. Die Änderungen sind additiv, bestehende Namen bleiben bis AP-36.
- **Pflichtlektüre:** PE-39 bis PE-44, §2 (F-07, F-15, F-16), §4 (Verträge), `src/contracts/*`
- **Abhängigkeiten:** M2-DEP (abgenommen 2026-10-25)
- **Parallel möglich mit:** AP-26
- **Dateien (Eigentum):** `src/contracts/{coin,upgrade,item,weapon,enemy,save,events,index}.ts` (neu: `coin.ts`, `upgrade.ts`), `tests/contracts/contracts.test.ts`
- **Nicht anfassen:** `src/config/*`, `src/logic/*`, `src/entities/*`, `src/scenes/*`, `src/platform/*`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `coin.ts`: Typ `CoinRules` mit `dropChance`, `magnetRadiusPx`, `collectRadiusPx`, `magnetSpeedPxPerSec`.
  2. `upgrade.ts`: `UpgradeTrack` (`weaponFireRate` | `weaponDamage` | `playerMaxHp` | `playerTurnSpeed`), `UpgradeLevels` (je Spur eine ganze Zahl), Konstante `MAX_UPGRADE_LEVEL = 10`.
  3. `item.ts`: `ItemEffect` um `doubleShot`, `shield`, `rapidFire` erweitern. `ItemDef` um optional `durationMs` (nur Dauerfeuer).
  4. `weapon.ts`: `WeaponStats` um optional `shotCount` (Standard 1). Neuer Typ `ActivePowers` mit `doubleShotStage` (0–2), `shieldLeft` (Schadenspunkte), `rapidFireMsLeft`.
  5. `enemy.ts`: `EnemyDef` um optional `coinValue` (Münzwert je Gegner).
  6. `save.ts`: `version` ist `1 | 2`. Neue optionale Felder `gold` und `upgrades`. Optional, damit Stände der Vorversion gültig bleiben. AP-28 füllt sie beim Lesen immer.
  7. `events.ts`: Konstanten und Payloads für `coins-changed` (`{ roundCoins }`) und `powers-changed` (`ActivePowers`). Bestehende Events bleiben.
  8. `index.ts` exportiert alles.
- **Schnittstellen:** stellt die Typen für AP-27 bis AP-34 bereit. Keine Vertragsänderung nach W1 außer in AP-36.
- **Akzeptanzkriterien:**
  - `npm run typecheck` und `npm test` grün, keine bestehenden Verträge entfernt
  - Kein Import von `phaser` in `src/contracts`
- **Tests:** Typ-Smoke-Test: Beispielobjekte für die neuen Typen kompilieren
- **Review-Schwerpunkte:** nur additive Änderungen, optionale Felder begründet, Event-Namen konsistent
- **Doku-Pflichten:** –
- **Aufwand:** S · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-25): add contracts for coins, upgrades and new items`

#### AP-26 – Assets Münzen und neue Items

- **Meilenstein, Lane, Welle:** M2b · ASSET · W1
- **Ziel:** Platzhalter-Sprites und -Sounds für Münzen und die neuen Items. Designer ersetzen sie wie bisher nur durch Dateien (PE-23, PE-24).
- **Pflichtlektüre:** PE-23, PE-24, PE-26, `src/config/assets.ts`, `docs/guides/*`, `public/assets/LICENSES.md`
- **Abhängigkeiten:** M2-DEP (abgenommen 2026-10-25)
- **Parallel möglich mit:** AP-25, AP-38
- **Dateien (Eigentum):** `src/config/assets.ts`, `public/assets/sprites/{item-double-shot,item-shield,item-rapid-fire,coin-small,coin-big}.png`, `public/assets/sounds/{sfx-coin,sfx-shield-break}.wav`, `public/assets/.placeholders.json`, `public/assets/LICENSES.md`, `docs/guides/{grafik,sound}-austauschen.md`, `tests/config/assets.test.ts`
- **Nicht anfassen:** übrige `src/config/*`, `src/contracts/*`. Die alten Item-Einträge bleiben bis AP-36.
- **Freigegebene Abhängigkeiten:** keine (Node-Bordmittel über den bestehenden Generator)
- **Umsetzung:**
  1. Manifest additiv: `item-double-shot` 16×16 ×2, `item-shield` 16×16 ×2, `item-rapid-fire` 16×16 ×2, `coin-small` 8×8 ×4 (Drehung), `coin-big` 16×16 ×4 (Drehung). Sounds `sfx-coin` und `sfx-shield-break`. Jeder Eintrag bekommt eine deutsche `description`.
  2. `npm run assets:placeholders`, danach `npm run assets:check`.
  3. Beide Anleitungen um die neuen Einträge ergänzen (jedes Asset genau einmal in einer Tabelle).
  4. `LICENSES.md`: „selbst erzeugt“.
- **Schnittstellen:** nutzt `AssetDef` (unverändert). Stellt die Keys für AP-31, AP-34 bereit.
- **Akzeptanzkriterien:**
  - Generator ändert bei einem zweiten Lauf nichts
  - `npm run assets:check` grün, alte Einträge unverändert
- **Tests:** `tests/config/assets.test.ts` um die neuen Keys erweitern (eindeutig, Datei vorhanden, Frame-Größe passt)
- **Review-Schwerpunkte:** Lizenzliste, Vollständigkeit der Anleitungen, Generator überschreibt keine Designer-Dateien
- **Doku-Pflichten:** `docs/guides/*`, `public/assets/LICENSES.md`
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** ja (Sound `sfx-shield-break` weglassen)
- **Commit-Typ:** `feat(AP-26): add placeholder assets for coins and new items`

#### AP-27 – Config Münzen, Upgrades, Items, Gegner-Münzwerte

- **Meilenstein, Lane, Welle:** M2b · SH · W2
- **Ziel:** Alle neuen Werte als Daten. Startwerte aus PE-39 bis PE-43, das Feintuning macht AP-35.
- **Pflichtlektüre:** PE-39 bis PE-43, `src/contracts/{coin,upgrade,item,enemy}.ts`, `src/config/{items,enemies,player,weapon}.ts` (nur lesen)
- **Abhängigkeiten:** AP-25
- **Parallel möglich mit:** AP-28
- **Dateien (Eigentum):** `src/config/{coins,upgrades,items,enemies,index}.ts`, `tests/config/{coins,upgrades,items,enemies}.test.ts`
- **Nicht anfassen:** `src/config/{weapon,player,levels,assets,maps}.ts`, `src/logic/*`, `src/scenes/*`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `coins.ts`: `COIN_RULES` (`dropChance` 0.05, `magnetRadiusPx` 400 = ganzes Spielfeld, `collectRadiusPx` 12, `magnetSpeedPxPerSec` 320, angenommen). `BIG_COIN_MIN_VALUE` 5. `GOLD_KEEP_ON_WIN` 1, `GOLD_KEEP_ON_LOSS` 0.5.
  2. `upgrades.ts`: `UPGRADES` je Spur mit deutschem `label` und Effekt je Stufe: `weaponFireRate` +10 % (multiplikativ), `weaponDamage` +10 %, `playerMaxHp` +10 HP, `playerTurnSpeed` +15 °/s. `COST_BASE` 10, `COST_GROWTH` 1,4. Preis für Stufe k auf k+1 = round(COST_BASE × COST_GROWTH^k).
  3. `items.ts` (ersetzt die Liste): `doubleShot` (`perStack` 1, `maxStacks` 2, `dropWeight` 30), `shield` (`perStack` 60, `maxStacks` 3, `dropWeight` 30), `rapidFire` (`maxStacks` 1, `durationMs` 5000, `dropWeight` 30), `heal` (`perStack` 25, `maxStacks` 1, `dropWeight` 10). `ITEM_RULES` bleibt (`dropChance` 0.08, `lifetimeMs` 10000). Konstante `RAPID_FIRE_MAX_PER_SEC` = 20.
  4. `enemies.ts`: `coinValue`: `cursedTree` 2, `zombieSquirrel` 2, `forestWitch` 5, `forestSpirit` 8 (Richtwerte, AP-35 kalibriert).
  5. `index.ts` exportiert die neuen Dateien.
- **Schnittstellen:** Konfiguration für AP-29 bis AP-35.
- **Akzeptanzkriterien:**
  - Preise: Stufe 1 = 10, Stufe 10 = 207, Summe je Spur = 698 (Test)
  - Checks grün, keine Logik in `src/config`
- **Tests:** `coins.test.ts` (Werte positiv, 0 < `dropChance` < 1), `upgrades.test.ts` (Preisreihe, Maximum 10, Effektwerte), `items.test.ts` (vier Items, alte Typen weg, Gewichte summieren sich auf 100), `enemies.test.ts` (`coinValue` > 0 für alle vier Gegner)
- **Review-Schwerpunkte:** Werte stimmen mit PE-39 bis PE-43 überein, keine Logik in der Config
- **Doku-Pflichten:** –
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-27): add config for coins, upgrades and new items`

#### AP-28 – Spielstand v2 (Gold und Upgrades)

- **Meilenstein, Lane, Welle:** M2b · GAME (Plattform) · W2
- **Ziel:** Gold und Upgrades im Spielstand, robust gelesen. Die Vorversion (v1) bleibt gültig.
- **Pflichtlektüre:** PE-35, PE-44, §5 (robustes Laden), `src/contracts/save.ts`, `src/platform/storage.ts` (Ist-Stand)
- **Abhängigkeiten:** AP-25
- **Parallel möglich mit:** AP-27
- **Dateien (Eigentum):** `src/platform/storage.ts`, `tests/platform/storage.test.ts`
- **Nicht anfassen:** `src/contracts/*`, `src/config/*`, `src/logic/*`, `src/scenes/*`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `defaultSave()`: `version` 2, `gold` 0, alle Upgrade-Spuren 0.
  2. `parseSave` akzeptiert `version` 1 und 2. Bei v1 fehlen Gold und Upgrades, sie werden 0. `gold` ist eine ganze Zahl von 0 bis MAX_GOLD (1e9, wie MAX_XP), sonst 0. Eine Upgrade-Stufe ist eine ganze Zahl von 0 bis `MAX_UPGRADE_LEVEL`, sonst 0. Nur dieser Wert wird zurückgesetzt, der Fortschritt bleibt (PE-44).
  3. `writeSave` schreibt immer `version` 2 und nur validierte Felder.
  4. `resetSave()` setzt alles zurück, auch Gold und Upgrades.
  5. Keine neuen Daten (R2): nur Zahlen, keine Zeitstempel, keine Kennungen.
- **Schnittstellen:** nutzt `SaveGame` aus AP-25. Stellt die Felder für AP-29, AP-32 und AP-33 bereit.
- **Akzeptanzkriterien:**
  - Ein v1-Stand bleibt mit XP und Freischaltung erhalten
  - Ein kaputter Gold-Wert führt nur zu 0, kein Absturz
  - Reset löscht alles, Checks grün
- **Tests:** v1 lädt, v2 lädt, Gold -1, 1,5 und Text werden 0, Upgrade-Stufe 11 und -1 werden 0, `writeSave` schreibt `version` 2, Reset
- **Review-Schwerpunkte:** Validierung (§5), keine Datenabflüsse, Migrationstest vorhanden
- **Doku-Pflichten:** –
- **Aufwand:** S · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-28): store gold and upgrades in save version 2`

#### AP-29 – Logik Wirtschaft und Upgrades

- **Meilenstein, Lane, Welle:** M2b · LOG · W3
- **Ziel:** Reine Logik für Goldauszahlung, Upgrade-Kauf und Münzen (Drop, Magnet).
- **Pflichtlektüre:** PE-39 bis PE-41, `src/config/{coins,upgrades}.ts`, `src/contracts/{coin,upgrade,save}.ts`, `src/logic/progression.ts` (nur lesen)
- **Abhängigkeiten:** AP-25, AP-27
- **Parallel möglich mit:** AP-30, AP-37a (keine gemeinsamen Dateien)
- **Dateien (Eigentum):** `src/logic/{economy,upgrades,coins}.ts`, `tests/logic/{economy,upgrades,coins}.test.ts`
- **Nicht anfassen:** `src/logic/{progression,round,spawn,items,weapon,powers}.ts`, `src/platform/*`, `src/config/*`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `economy.ts`: `goldPayout(collected, result)`: Sieg behält alles, Niederlage `floor(0,5 × collected)`. `applyRoundGold(save, collected, result)` gibt einen neuen `SaveGame` mit erhöhtem `gold` zurück, gedeckelt bei MAX_GOLD (Ort der Konstante offen, §16).
  2. `upgrades.ts`: `upgradeCost(track, level)` (null bei Stufe 10) ist die einzige Preisfunktion und rechnet round(COST_BASE × COST_GROWTH^k) aus der Config. Tests prüfen nur ihre Werte und duplizieren die Formel nicht (Hinweis Review AP-27). `buyUpgrade(save, track)` gibt den neuen Stand oder null zurück (zu wenig Gold oder Maximum). `upgradeFactors(levels)` gibt `{ weaponFireRateMult, weaponDamageMult, playerMaxHp, playerTurnSpeedDegPerSec }` zurück. Diese Werte gehen in AP-30 und AP-31 als Parameter.
  3. `coins.ts`: `rollCoinDrop(rng, rules)` gibt einen Boolean zurück. `coinSizeFor(value)` gibt `'small'` oder `'big'`. `coinMagnetStep(coin, player, dtMs, rules)` gibt die neue Position und `collected` zurück.
- **Schnittstellen:** nutzt Config und Verträge. Stellt Funktionen für AP-31, AP-32 und AP-33 bereit.
- **Akzeptanzkriterien:**
  - Sieg 100 %, Niederlage 7 → 3 (Test)
  - Stufe 10 ist nicht kaufbar, ein Kauf zieht genau den Preis ab
  - Der Magnet erreicht die Astronautin in endlicher Zeit
  - Kein `phaser`-Import, Checks grün
- **Tests:** wie oben, zusätzlich Drop-Rate mit festem Seed (ca. 5 %) und eine komplette Kaufreihe bis Stufe 10
- **Review-Schwerpunkte:** Rundung, Deckel, Preisformel nur aus der Config
- **Doku-Pflichten:** –
- **Aufwand:** M · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-29): add gold payout, upgrade purchase and coin logic`

#### AP-30 – Logik Waffen-Items, Schild, Dauerfeuer

- **Meilenstein, Lane, Welle:** M2b · LOG · W3
- **Ziel:** Die drei neuen Waffen-Items als reine Logik: Stapel, Schildpuffer, Dauerfeuer-Timer, Schussmuster. Die alte Item-Logik (Feuerrate, Schaden, Größe) wird ersetzt.
- **Pflichtlektüre:** PE-16, PE-31, PE-42, PE-43, §18 Lehre AP-10 (pausierbare Spielzeit), `src/config/items.ts`, `src/logic/{items,weapon}.ts` (Ist-Stand), `src/contracts/{item,weapon}.ts`
- **Abhängigkeiten:** AP-25, AP-27
- **Parallel möglich mit:** AP-29, AP-37a (keine gemeinsamen Dateien). Die Upgrade-Faktoren kommen als Parameter, es gibt keinen Import aus `upgrades.ts`.
- **Dateien (Eigentum):** `src/logic/{items,weapon,powers}.ts`, `tests/logic/{items,weapon,powers}.test.ts`
- **Nicht anfassen:** `src/logic/{economy,upgrades,coins,round,spawn,health,geometry,rotation,rng,progression}.ts`, `src/config/*`, `src/entities/*`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `items.ts`: `applyPowerItem(state: ActivePowers, def)` gibt den neuen Zustand zurück. `doubleShot` erhöht die Stufe bis `maxStacks`. `shield` erhöht `shieldLeft` um `perStack` und die Stufe bis `maxStacks`. `rapidFire` setzt `rapidFireMsLeft` auf `durationMs` (stapelt nicht). `heal` bleibt wie bisher und gibt die Heilmenge zurück. `isExpired` bleibt.
  2. `powers.ts`:
     - `absorbDamage(state, dmg)` gibt `{ state, remainingDamage }` zurück. Der Schild nimmt zuerst Schaden. Ist er leer, wird die Stufe 0 (kaputt).
     - `tickPowers(state, dtMs)` zählt `rapidFireMsLeft` herunter. Die Zeit ist die pausierbare Spielzeit.
     - `shotPattern(stage)` gibt eine Liste `{ offsetPx, angleDeg }`: Stufe 0 ein Laser in der Mitte, Stufe 1 zwei parallele Laser mit ±4 px Versatz, Stufe 2 drei Laser mit −8°, 0°, +8°.
     - `effectiveFireRate(baseRatePerSec, rapidFireActive)` gibt bei Dauerfeuer `max(base, RAPID_FIRE_MAX_PER_SEC)` zurück.
  3. `weapon.ts`: `computeWeaponStats(base, factors, state)` gibt `WeaponStats` mit `fireRatePerSec` (× `weaponFireRateMult`, Dauerfeuer-Regel), `damage` (× `weaponDamageMult`) und `shotCount` (1 bis 3). `FireTimer` bleibt.
- **Schnittstellen:** stellt Funktionen für AP-31 (Spielerin, Laser) und AP-34 (HUD) bereit.
- **Akzeptanzkriterien:**
  - Das Schild-Limit wird genau verbraucht, ein kaputter Schild gibt den Restschaden weiter
  - Dauerfeuer endet nach 5 s Spielzeit, Pause zählt nicht
  - Feuerrate bei 30 und 144 fps gleich (AP-05-Regel)
  - Checks grün
- **Tests:** Stapel-Deckel, Schild genau, Schild kaputt, Dauerfeuer-Ablauf, Schussmuster Stufe 0 bis 2, Feuerrate mit Obergrenze, Upgrade-Faktoren wirken multiplikativ
- **Review-Schwerpunkte:** Schild wird vor HP geprüft, keine Spielwerte im Code, keine Phaser-Importe
- **Doku-Pflichten:** –
- **Aufwand:** M · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** ja (K5: Doppelschuss nur Stufe 1)
- **Commit-Typ:** `feat(AP-30): add logic for double shot, shield and rapid fire`

#### AP-31 – Entities Spielerin, Laser, Münzen

- **Meilenstein, Lane, Welle:** M2b · GAME · W4
- **Ziel:** Spielerin mit Upgrade-Werten und Schild, Laser als Mehrfachschuss, Münzen mit Magnet.
- **Pflichtlektüre:** PE-31, PE-39, PE-41 bis PE-43, `src/entities/{Player,LaserPool,ItemPickup}.ts` (Ist-Stand), `src/logic/{powers,weapon,coins}.ts`, `src/config/{coins,player,items}.ts`
- **Abhängigkeiten:** AP-26, AP-27, AP-29, AP-30
- **Parallel möglich mit:** AP-34, AP-37c (keine gemeinsamen Dateien)
- **Dateien (Eigentum):** `src/entities/{Player,LaserPool,Coin,CoinPool}.ts` (`Coin` und `CoinPool` neu)
- **Nicht anfassen:** `src/entities/{enemies,bosses,ItemPickup}/*`, `src/scenes/*`, `src/logic/*`, `src/config/*`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `Player`: Der Konstruktor bekommt die Upgrade-Werte (`maxHp`, `turnSpeedDegPerSec`, Multiplikatoren) als Parameter, nicht aus der Szene. `takeDamage(n)` läuft zuerst durch `absorbDamage`, der Restwert des Schilds geht über einen Callback. Der Schild zeigt einen halbtransparenten Ring. Treffer lösen nur das sanfte Aufblinken aus (PE-31). `applyItem(def)` ruft `applyPowerItem` auf. Die Feuerrate kommt aus `effectiveFireRate`. `tickPowers(state, dtMs)` pro Frame mit der pausierbaren Spielzeit. Nach jeder Änderung des Power-Zustands `computeWeaponStats(base, factors, powers)` neu rechnen. Alte Aufrufe entfernen: `applyItem` aus `logic/items`, `emptyStacks` und die alte Signatur von `computeWeaponStats` (Rest in `Player.ts`).
  2. `LaserPool.fire`: erzeugt je nach `shotPattern(stage)` (AP-30) mehrere Laser: `offsetPx` seitlich zur Zielrichtung, `angleDeg` relativ dazu. Jeder Laser hat eigenen Schaden und wird ab `range` entfernt. Ein Laser trifft weiterhin genau ein Ziel (AP-24).
  3. `Coin` und `CoinPool`: Münze an der Gegnerposition, Größe nach `coinSizeFor`, Drehanimation. `update(dtMs, player)` nutzt `coinMagnetStep`. `collect` ruft `onCollected(value)` auf. Keine Lebensdauer (Q-17, bestätigt). Laser gehen durch Münzen.
  4. Pooling wie bei den Gegnern, Listener abmelden.
- **Schnittstellen:** nutzt AP-29 und AP-30. Stellt `Player`, `LaserPool` und `CoinPool` für AP-33 bereit. Ist-API: siehe §18 (Erkenntnisse AP-29, AP-30). `takeDamage` läuft über `absorbDamage`, bevor die HP abgerechnet werden.
- **Akzeptanzkriterien:**
  - Spielwerte nur aus Config, keine Logik in den Entities außer Aufrufen
  - Schild-Reihenfolge wie in AP-30, Checks grün
- **Tests:** keine Phaser-Tests, die Logik liegt in AP-29 und AP-30
- **Review-Schwerpunkte:** Pooling, Listener, Schild vor HP, keine Spielwerte
- **Doku-Pflichten:** –
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-31): add upgraded player, multi-shot lasers and coins`

#### AP-32 – Hauptmenü: Gold und Upgrade-Overlay

- **Meilenstein, Lane, Welle:** M2b · GAME · W5
- **Ziel:** Gold ist sichtbar, Upgrades sind im Hauptmenü kaufbar. Der Reset-Dialog nennt Gold und Upgrades (PE-41, PE-45).
- **Pflichtlektüre:** PE-41, PE-45, F-09, F-16, `src/scenes/MenuScene.ts` (Ist-Stand), `src/scenes/menu/*`, `src/logic/upgrades.ts` (AP-29), `src/platform/storage.ts` (AP-28)
- **Abhängigkeiten:** AP-27, AP-28, AP-29
- **Parallel möglich mit:** AP-33, AP-35 (keine gemeinsamen Dateien, Menü-Szene getrennt von der Spielszene)
- **Dateien (Eigentum):** `src/scenes/MenuScene.ts`, `src/scenes/menu/UpgradePanel.ts` (neu), `src/scenes/menu/ConfirmDialog.ts` (nur der Text)
- **Nicht anfassen:** `src/scenes/{GameScene,HudScene,ResultScene,PreloadScene,debug}.ts`, `src/main.ts` (keine neue Szene, PE-45), `src/logic/*`, `src/config/*`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. Gold-Anzeige unter dem Spielerlevel.
  2. Button „Upgrade“ (mind. 32×32 px, `Button`) öffnet `UpgradePanel` als Overlay.
  3. `UpgradePanel`: vier Zeilen mit Name, Stufe x/10, Preis oder „max“ und Kauf-Button. Der Kauf läuft über `buyUpgrade` und `writeSave`, danach werden Panel und Gold neu gezeichnet. Ohne genug Gold ist der Button grau.
  4. Schließen per Taste und am PC mit `Esc`.
  5. Der Reset-Dialog sagt, dass auch Gold und Upgrades gelöscht werden.
  6. Keine direkte `localStorage`-Nutzung, nur die Storage-API.
- **Schnittstellen:** nutzt AP-28 und AP-29. Keine Vertragsänderung.
- **Akzeptanzkriterien:**
  - Kauf zieht Gold ab und erhöht die Stufe, Stufe 10 zeigt „max“
  - Reset löscht Gold und Upgrades
  - Bedienbar per Touch, Checks grün
- **Tests:** keine Phaser-Tests, die Logik liegt in AP-29
- **Review-Schwerpunkte:** Touch-Bedienung, keine doppelten Listener nach dem Schließen, keine direkte Storage-Nutzung
- **Doku-Pflichten:** –
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-32): add gold display and upgrade overlay to menu`

#### AP-34 – HUD: Münzen und Power-Anzeige

- **Meilenstein, Lane, Welle:** M2b · GAME · W4
- **Ziel:** Im HUD sichtbar: Münzen der Runde, Doppelschuss-Stufe, Schildpunkte und Dauerfeuer-Restzeit. Die drei alten Waffenstufen-Symbole entfallen.
- **Pflichtlektüre:** PE-31, PE-42, PE-43, PE-47, PE-52, `src/contracts/{events,armour}.ts` (AP-25, AP-37a), `src/scenes/HudScene.ts` (Ist-Stand), `src/scenes/hud/*` (neu)
- **Abhängigkeiten:** AP-25, AP-30, AP-37a, AP-38
- **Parallel möglich mit:** AP-31, AP-37c (keine gemeinsamen Dateien)
- **Dateien (Eigentum):** `src/scenes/HudScene.ts`, `src/scenes/hud/{CoinCounter,PowerIndicators,ArmourIndicator}.ts` (neu), ggf. `tests/scenes/hud.test.ts`
- **Nicht anfassen:** `src/scenes/{GameScene,ResultScene,MenuScene}.ts`, `src/contracts/*`, `src/logic/*`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `CoinCounter`: Münzsymbol mit Zahl, hört auf `coins-changed`.
  2. `PowerIndicators`: Doppelschuss als Stufenanzeige 0/1/2, Schild als Balken mit Restpunkten, Dauerfeuer mit Restsekunden. Hört auf `powers-changed`. Icons aus den Item-Sprites (AP-26).
  2a. `ArmourIndicator` (PE-52): zeigt beim Feuerring die aktive Restzeit, danach die Abklingzeit, und ist ohne Rüstung unsichtbar. Hört auf `armour-changed` (AP-37a). Das Symbol ist eine Grafikform (Kreis), nicht der Sprite `item-fire-ring` aus AP-37c, weil AP-37c in derselben Welle liegt.
  3. Layout respektiert die Safe-Area (AP-13). Keine Schadenszahlen (PE-31).
  4. Pause-Taste bleibt. Layout-Werte als lokale Konstanten, mit Kennzeichnung als Kandidaten für die Config.
  5. Listener beim Szenenwechsel abmelden.
- **Schnittstellen:** nutzt die Events aus AP-25, die Typen aus AP-30 und AP-37a (`ActiveArmour`, `armour-changed`). Keine Vertragsänderung. Ist-API: `ActivePowers` hat kein Schild-Stufenfeld. Die Stufe ergibt sich aus `shieldLeft` und `perStack`, `shieldLeft` ist auf `maxStacks × perStack` gedeckelt. `ActiveArmour` hat `activeMsLeft` und `cooldownMsLeft` (§18).
- **Akzeptanzkriterien:**
  - Zahlen und Anzeigen aktualisieren sich live, Schildbalken leert sich, Dauerfeuer-Anzeige verschwindet nach Ablauf
  - Feuerring-Anzeige zeigt Aktivzeit, danach Abklingzeit, und verschwindet nach der Abklingzeit
  - Checks grün
- **Tests:** falls Hilfslogik nötig (z. B. Balkenbreite), als reine Funktion mit Test in `tests/scenes/hud.test.ts`
- **Review-Schwerpunkte:** Listener aufräumen, Lesbarkeit auf dem Handy
- **Doku-Pflichten:** –
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** ja (K6 light: Dauerfeuer als Zahl statt Balken)
- **Commit-Typ:** `feat(AP-34): show coins and power states in hud`

#### AP-33 – Spielszene und Ergebnis mit Gold

- **Meilenstein, Lane, Welle:** M2b · GAME · W5
- **Ziel:** Verbindet alles in der Runde: Upgrades beim Start, Münzen und neue Items im Kampf, Gold am Rundenende.
- **Pflichtlektüre:** PE-29, PE-47, PE-49, PE-52, PE-57, PE-39 bis PE-43, §18 Lehre AP-10 (Pause, `playTimeMs`, Reihenfolge `playerDied()` vor `tick()`), Schnittstellen aus AP-31, Ist-Stand aus AP-38 und AP-39, `src/scenes/{GameScene,ResultScene}.ts` (Ist-Stand)
- **Abhängigkeiten:** AP-29, AP-30, AP-31, AP-37a, AP-37c, AP-38, AP-39
- **Basis-Branch (Nutzer-Entscheidung am 2026-10-25):** `agent/AP-31-c31` (Commit 55477c3). AP-31 ist noch nicht in dev. AP-33 baut auf diesem Branch auf, und AP-31 und AP-33 werden direkt hintereinander gemergt (AP-31 zuerst), damit dev nie rot ist. Zusätzlich zu den Eigentumsdateien der Szene passt AP-33 diese drei Stellen an (Typecheck-Fehler aus dem AP-31-Review): (a) `new Player(scene, x, y, lasers, config)` mit `PlayerConfig` als 5. Argument, (b) `player.stacks` wird `player.powers`, (c) `onStatsChange(stats, powers)` statt `(stats, stacks)`. `LaserPool.fire` gibt `Laser[]` zurück und nimmt optional einen 5. Parameter `doubleShotStage` entgegen.
- **Parallel möglich mit:** AP-32, AP-35
- **Dateien (Eigentum):** `src/scenes/{GameScene,ResultScene}.ts`
- **Nicht anfassen:** `src/scenes/{HudScene,MenuScene}.ts`, `src/entities/*`, `src/logic/*`, `src/config/*`, `src/contracts/*`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. Start: `loadSave()`, dann `upgradeFactors` für Spielerin und Waffe.
  2. Beim Tod eines Gegners: `rollCoinDrop`, bei Erfolg `CoinPool.spawn` mit dem `coinValue` des Gegners. Zähler `roundCoins` und Event `coins-changed` bei jeder Änderung.
  3. Items: `rollDrop` wie bisher, neue Wirkung über `applyPowerItem`. Dauerfeuer und Münz-Verzögerung laufen über `playTimeMs` (pausierbar).
  4. Alle Schadenspfade (Kontakt, Aura, Geschoss) gehen über `Player.takeDamage`, damit der Schild zuerst wirkt.
  5. Event `powers-changed` bei jeder Änderung von Schild, Doppelschuss und Dauerfeuer. Das alte Event `weapon-changed` entfällt.
  6. Rundenende: `applyRoundGold(save, roundCoins, result)` und `applyRoundResult` werden kombiniert, danach ein einziger `writeSave`. Debug-Runden (`?level=n`) schreiben keinen Spielstand: kein `writeSave`, also keine Erfahrung, keine Freischaltung und kein Gold (PE-49, Q-13; Gold eingeschlossen als Folge, angenommen). Die Umsetzung steht hier statt in einem eigenen Folgepaket.
  7. `ResultScene` zeigt die gesammelten Münzen, den Anteil (100 % oder 50 %) und das Gold gesamt.
  8. Rüstung (PE-52, PE-57): Beim Tod eines Gegners zusätzlich `rollArmourDrop` aus AP-37a. Bei Erfolg erscheint ein `ArmourPickup` (AP-37c). Eingesammelt wird es durch einen Treffer wie bei Items. Die Aufnahme ruft `activateArmour` auf und sendet `armour-changed`. Während aktiver Rüstung oder Abklingzeit hat sie keine Wirkung.
  9. Jeder Frame: `tickArmour` mit dem Delta der pausierbaren Spielzeit (`playTimeMs`). `ArmourRing.setCenter` folgt der Spielerin. Ringschaden über `ringDamageFor` an Gegner im Radius, der Tod läuft über den bestehenden Todespfad. Bosse nehmen in M2b keinen Ringschaden (Q-23). Beim Rundenstart und Rundenende `resetArmour()`.
- **Schnittstellen:** nutzt AP-29, AP-30, AP-31, AP-37a, AP-37c. Keine Vertragsänderung. Ist-API (§18): `tickArmour(state, dtMs, def)` mit `def` als drittem Parameter, `isInRing(def, cx, cy, tx, ty, tr)`, `ARMOURS` nur aus `src/config/armour`. `computeWeaponStats(base, factors, powers)`, `tickPowers` pro Frame, `absorbDamage` vor der HP-Abrechnung. Aus AP-34 (§18): `HudScene` liest keinen Startzustand, die Szene sendet `coins-changed`, `powers-changed` und `armour-changed` nach dem Anlegen der HudScene mit Anfangswerten (oder `HudInitData` wird erweitert). Aus AP-37c: `ArmourPickup` bekommt `ITEM_RULES` übergeben, die Animation `item-fire-ring-anim` legt PreloadScene an.
- **Akzeptanzkriterien:**
  - Gold erscheint im Ergebnis, Niederlage zahlt 50 %
  - Feuerring-Handtest (M2b-DEP): Pickup aktiviert 5 s, Ring tötet Gegner im Radius, Pause friert die Zeit ein, Rundenende setzt zurück
  - Debug-Runde (`?level=n`) verändert den Spielstand nicht (Handtest, PE-49)
  - Keine doppelten Listener nach „Nochmal“, keine Spielwerte in der Szene
  - Alle Smoke-Test-Punkte der M2b-DEP für Runde und Ergebnis erfüllt, Checks grün
- **Tests:** keine Phaser-Tests, Handtest-Checkliste im Bericht
- **Review-Schwerpunkte:** Rundenende-Reihenfolge (§18), genau ein Speichervorgang je Runde, Pause, Aufräumen beim Szenenwechsel
- **Doku-Pflichten:** Debug-Runden und Goldverhalten im Bericht beschreiben
- **Aufwand:** L · **Modell:** opus · **Effort:** high
- **Opus-Grund:** Kern (Szene mit Kollisionen und Speicherung, wie AP-10)
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-33): wire coins, upgrades and new items into round`

#### AP-35 – Neu-Balancing M2b

- **Meilenstein, Lane, Welle:** M2b · SH · W5
- **Ziel:** Gold-Kurve, Upgrades und neue Items passen zusammen. Richtwerte: im Mittel etwa 45 Gold je gewonnenem Level, Stufe 10 eines Upgrades nach etwa 15–20 Spiel-Leveln (Q-15, PE-50). Doppelschuss, Schild und Dauerfeuer sind spürbar, aber nicht dominant. Level 20 bleibt mit Items fordernd (wie AP-15).
- **Pflichtlektüre:** PE-39 bis PE-43, `docs/balancing.md`, `tests/logic/balance.test.ts`, AP-23-Bedingungen, `src/config/*`, `src/logic/{economy,upgrades,coins,weapon,powers}.ts` (nur lesen)
- **Abhängigkeiten:** AP-27, AP-29, AP-30
- **Parallel möglich mit:** AP-32, AP-33
- **Dateien (Eigentum):** `src/config/{levels,enemies,weapon,items,coins,upgrades}.ts`, `tests/config/{levels,enemies,weapon,items,coins,upgrades}.test.ts`, `tests/logic/balance.test.ts`, `docs/balancing.md`
- **Nicht anfassen:** `src/config/{assets,maps,player}.ts`, `src/logic/*` (nur lesen), Szenen, Entities
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. Kennzahlen als reine Rechnung im Test: Gold je Level (Gegnerzahl × 5 % × Münzwert), Upgrade-Kosten bis Stufe 10, Druck-Kennzahl mit Items (Doppelschuss, Dauerfeuer, Schild-Puffer).
  2. Werte anpassen: Gold-Mittel etwa 45 je gewonnenem Level, Schild-Limit, Dauerfeuer-Dauer und Doppelschuss-Stufen nur in der Config. Die Bedingungen aus AP-23 (Druck-Kurve Level 5–20 monoton, Sprünge begrenzt) bleiben grün, die Spawn-Werte von Level 0–4 bleiben gleich.
  3. `docs/balancing.md`: Abschnitt „Gold und Upgrades“ und eine neue Kennzahl-Tabelle, in einfacher Sprache.
  4. Im Bericht nennen: alle vier Upgrades auf Stufe 10 kosten zusammen etwa 2 800 Gold (Q-15).
  5. `tests/logic/balance.test.ts`: Schwelle für Level 20 (`pressure` > 0,8) auf mindestens 0,9 anheben (Review AP-23, Ist-Wert 0,96). Die zwei `it.skip`-Fälle aus AP-27 (`items raise dps step by step`, `level 20 is demanding but fair`) setzt AP-35 neu auf, auf die Werte nach dem Neu-Balancing. Nicht löschen (Auftrag Lead, 2026-10-25). `tests/config/items.test.ts` (prüft `WEAPON_BASE.fireRatePerSec`) gehört bereits zu AP-27 und AP-35. Bei Änderungen an `weapon.ts` dort mit anpassen.
  6. `src/config/upgrades.ts`: Kommentar „Effekt je Stufe: multiplikativ (Faktor je Stufe) oder additiv“ auf „Zuwachs je Stufe, additiv aufsummiert“ klarstellen, Werte unverändert (Befund Lead, Wellenabschluss M2b W3). Die Logik rechnet `1 + perLevel × Stufe`.
- **Schnittstellen:** nur Config, keine Vertragsänderung.
- **Akzeptanzkriterien:**
  - Tests grün, Zahlen in der Doku stimmen mit der Config überein
  - Jede Änderung im Bericht begründet
- **Tests:** `balance.test.ts`: Gold-Mittel im Zielbereich, Stufe 10 bei Mittelwert in 15–20 Leveln, Druck-Bedingungen aus AP-23
- **Review-Schwerpunkte:** nur Daten, Doku-Zahlen gleich Config, Zielwerte aus PE-41
- **Doku-Pflichten:** `docs/balancing.md`
- **Aufwand:** M · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** ja (K7: nur Kennzahltabelle, keine Zielwert-Tests)
- **Commit-Typ:** `feat(AP-35): rebalance for gold, upgrades and new items`

#### AP-36 – Aufräumen alter Waffen-Items

- **Meilenstein, Lane, Welle:** M2b · SH/ASSET · W6
- **Ziel:** Die alten Item-Typen (Feuerrate, Schaden, Größe) und ihre Platzhalter-Sprites entfernen. Verträge und Doku bereinigen.
- **Pflichtlektüre:** PE-42, `src/contracts/{item,weapon}.ts`, `src/logic/{items,weapon,powers}.ts` (Ist-Stand), `src/config/assets.ts`, `docs/guides/*`
- **Abhängigkeiten:** AP-26, AP-33, AP-35 (alle Nutzer sind umgestellt)
- **Parallel möglich mit:** – (W6 enthält nur dieses Paket)
- **Dateien (Eigentum):** `src/contracts/{item,weapon}.ts`, `src/contracts/events.ts` (nur Event `weapon-changed`, Ergänzung Pflege 2026-10-25, §18), `src/logic/{items,weapon}.ts`, `tests/logic/{items,weapon,balance,powers}.test.ts`, `src/config/assets.ts`, `tests/config/assets.test.ts`, `tests/contracts/contracts.test.ts`, `public/assets/sprites/item-{fire-rate,damage,size}-*.png` (nur Platzhalter), `public/assets/LICENSES.md`, `docs/guides/*` (nur Tabellen)
- **Nicht anfassen:** übrige Dateien. Designer-Dateien werden nie gelöscht.
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `ItemEffect` nur noch `doubleShot` | `shield` | `rapidFire` | `heal`. Alte Felder in `WeaponStacks` entfernen, soweit ungenutzt (Suche im Repo vor dem Entfernen). Legacy-Pfade entfernen: `applyItem` (alt, für `fireRate`, `damage`, `size`) in `logic/items`, `emptyStacks`, `legacyStats` und die alte Signatur in `computeWeaponStats`, die `legacy()`-Fälle in den Tests. Nutzt `tests/logic/balance.test.ts` oder `tests/logic/weapon.test.ts` noch die alte Signatur, stellt AP-36 sie um (Planner-Ergänzung, §18). Das Event `weapon-changed` in `src/contracts/events.ts` wird seit AP-33 nicht mehr gesendet. Vor dem Entfernen Repo-Suche, dann entfernen und die Vertragstests anpassen.
  2. Manifest: Einträge `item-fire-rate`, `item-damage`, `item-size` entfernen. Platzhalter-Dateien nur löschen, wenn sie in `.placeholders.json` stehen. Geänderte Designer-Dateien bleiben liegen und werden im Bericht genannt.
  3. Die Tabellen in beiden Anleitungen anpassen.
  4. Optional (Review AP-30, niedrig): In `src/logic/items.ts` die Zahl 2 in `Math.min(def.maxStacks, 2, …)` durch `MAX_DOUBLE_SHOT_STAGE` aus `src/logic/powers.ts` ersetzen. Im Dauerfeuer-Test in `tests/logic/powers.test.ts` das Literal 5000 durch eine benannte Größe ersetzen.
- **Schnittstellen:** keine neue Schnittstelle.
- **Akzeptanzkriterien:**
  - Keine Verweise auf die alten Namen mehr (Suche im Repo)
  - `npm run assets:check` grün, Checks grün
- **Tests:** Asset- und Vertragstests angepasst
- **Review-Schwerpunkte:** nichts Ungewolltes gelöscht, Doku konsistent
- **Doku-Pflichten:** Anleitungen, `LICENSES.md`
- **Aufwand:** S · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** ja (Dateien liegen lassen, nur das Manifest bereinigen)
- **Commit-Typ:** `chore(AP-36): remove old weapon item types and sprites`

#### AP-38 – Fix iPhone-Darstellung, Mitte und HUD-Lesbarkeit

- **Meilenstein, Lane, Welle:** M2b · GAME/OPS · W1
- **Ziel:** Befunde aus dem iPhone-Test (PE-54): Das Spielfeld passt im Querformat in den sichtbaren Bereich, die Astronautin steht genau in der Bildschirmmitte, die Item-Stacks im HUD sind ohne Zoomen lesbar.
- **Pflichtlektüre:** PE-03, PE-54, F-10, F-14, PE-25, §5 (Safe-Area), `index.html`, `src/main.ts`, `src/scenes/{GameScene,HudScene}.ts`, `src/entities/Player.ts` (Ist-Stand)
- **Abhängigkeiten:** keine (M2 abgenommen)
- **Parallel möglich mit:** AP-25, AP-26 (keine gemeinsame Datei)
- **Dateien (Eigentum):** `index.html`, `src/main.ts`, `src/platform/layout.ts` (neu), `tests/platform/layout.test.ts` (neu), `src/scenes/{GameScene,HudScene}.ts`, `src/entities/Player.ts` (nur die Mittelung, falls die Ursache dort liegt)
- **Nicht anfassen:** `src/config/*`, `src/logic/*`, `src/contracts/*`, übrige `src/platform/*`, `src/scenes/{MenuScene,ResultScene,PreloadScene,debug}.ts`, `public/*`. Das Overlay „bitte drehen“ (PE-25) bleibt inhaltlich unverändert.
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. Ursache vor der Änderung im Bericht festhalten: Viewport-Höhe (`100vh` in Safari statt `100dvh`), `viewport-fit`, Safe-Area-Padding, Scale-Modus `FIT` mit Eltern-Größe, Arenagröße (`GAME_SIZE` 640×360) gegen Canvas-Größe, Kamera und Spielerposition.
  2. `src/platform/layout.ts`: reine Funktion `fitArena(viewportW, viewportH, insets, arenaW, arenaH)` gibt Skalierung und Versatz, sodass die Arena im Sicherheitsbereich liegt und dessen Mitte trifft. Dazu `hudScale(viewportH)` mit Untergrenze für Schrift und Icons.
  3. `index.html`: `viewport-fit=cover`, Höhe `100dvh` mit Fallback `100vh`, Safe-Area über `env(safe-area-inset-*)` auf dem Container, nicht auf dem Canvas. `touch-action: none` bleibt.
  4. `src/main.ts` und `GameScene`: Scale-Einstellungen aus `layout.ts`, Neuberechnung bei `resize` und Drehung (`scale.refresh()`). Kamera ohne Versatz auf die Arenamitte.
  5. `HudScene`: Item-Stacks, Zahlen und Icons größer, dunkles Panel für Kontrast, Größen über `hudScale`. Layoutwerte bleiben lokal (Kandidaten für Config, §16).
  6. PC-Darstellung darf sich nicht ändern (Vergleich im Bericht).
- **Schnittstellen:** keine Vertragsänderung. AP-34 (HUD) und AP-39 (Stick) bauen auf dem Stand nach AP-38 auf.
- **Akzeptanzkriterien:**
  - `fitArena` für 844×390 mit 47 px Notch links: Arena ganz sichtbar, Arenamitte gleich Mitte des Sicherheitsbereichs (Abweichung höchstens 1 px). Werte angenommen, Gerät laut Nutzer prüfen
  - Hochformat (390×844) liefert eine gültige Skalierung, ohne Absturz
  - `hudScale` unterschreitet nie die Untergrenze (Schrift mindestens 14 CSS-px, angenommen)
  - Handtest iPhone (Nutzer, M2b-DEP): nichts abgeschnitten, Astronautin in der Mitte, Stacks lesbar. Der Coder nennt im Bericht Ursache und Messwerte
  - Checks grün
- **Tests:** `tests/platform/layout.test.ts`: Querformat mit Notch, Hochformat, Mittelpunkt, Untergrenze `hudScale`
- **Review-Schwerpunkte:** Ursache im Bericht belegt, keine Änderung an Spielregeln, keine Phaser-Importe in `layout.ts`, PC unverändert
- **Doku-Pflichten:** – (README nur, falls sich die Startanleitung ändert)
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `fix(AP-38): fit arena, center player and enlarge hud on iphone`

#### AP-39 – Virtueller Stick für Touch-Geräte

- **Meilenstein, Lane, Welle:** M2b · GAME · W2
- **Ziel:** Auf Touch-Geräten im Querformat ein virtueller Stick unten rechts. Die Stick-Richtung ist die Zielrichtung (360°). Tippen auf das Spielfeld bleibt zusätzlich erhalten. Stick vor Tippen und Maus: solange der Stick gehalten wird, sind Tippen und Mauszielen gesperrt. Verzögerte Drehung und Auto-Schuss bleiben. Am PC erscheint kein Stick (PE-55).
- **Pflichtlektüre:** PE-03, PE-04, PE-55, `src/platform/{input,angle}.ts` (Ist-Stand), `src/logic/rotation.ts` (nur lesen), `src/scenes/GameScene.ts` (Ist-Stand nach AP-38)
- **Abhängigkeiten:** AP-38 (gleiche Datei GameScene, Reihenfolge). Der Stick ist mit V-05 freigegeben (2026-10-25, PE-55, §2 F-01)
- **Parallel möglich mit:** AP-27, AP-28 (keine gemeinsame Datei)
- **Dateien (Eigentum):** `src/platform/stick.ts` (neu), `tests/platform/stick.test.ts` (neu), `src/logic/aimSource.ts` (neu), `tests/logic/aimSource.test.ts` (neu), `src/platform/input.ts` (der einzige Input-Code; Maus und Touch laufen dort über die Zeiger-Eingabe), `src/scenes/controls/VirtualStick.ts` (neu), `src/scenes/GameScene.ts` (nur Einbindung)
- **Nicht anfassen:** `src/logic/*` außer `aimSource.ts`, `src/entities/*`, `src/config/*`, `src/scenes/{HudScene,MenuScene,ResultScene}.ts`, `index.html`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `src/platform/stick.ts` (ohne Phaser): `stickVector(dxPx, dyPx, radiusPx, deadZoneRatio)` begrenzt den Ausschlag auf den Radius und gibt `{ x, y, active }`. In der Totzone ist `active` false. `stickAngleRad(vector)` gibt den Winkel in Radiant, im selben Format wie `AimInput.targetAngle`.
  2. `src/scenes/controls/VirtualStick.ts`: Basis-Kreis unten rechts, Abstand zum Rand plus Safe-Area. Startwerte (angenommen): Durchmesser 140 px, Knopf 56 px, Rand 24 px, Totzone 15 % des Radius. Eigener Pointer (per `pointer.id`), damit Stick und Pause-Taste sich nicht stören. `setScrollFactor(0)`, Transparenz 50 %, Tiefe über dem Spielfeld.
  3. Sichtbar nur bei Touch über `this.sys.game.device.input.touch`. Am PC unsichtbar. Touch-Laptops zeigen den Stick ebenfalls (bestätigt Nutzer 2026-10-25).
  4. `src/logic/aimSource.ts` (ohne Phaser): reine Funktion `resolveAim(state)`. Eingabe: `stickHeld`, `stickAngleRad` (oder null in der Totzone), `pointerAngleRad` (Tippen oder Maus, oder null), `lastAngleRad`. Ausgabe: `{ angleRad, source }` mit `source` ∈ `stick` | `pointer` | `hold`. Regeln: (a) Stick gehalten: Winkel des Sticks, in der Totzone der letzte Stick-Winkel, Quelle `stick`. Tippen und Maus werden dabei ignoriert. (b) Stick nicht gehalten und Tippen oder Maus liefern einen Winkel: Quelle `pointer`. (c) sonst letzter Winkel, Quelle `hold`.
  5. `src/platform/input.ts` (AimInput): Der Zeiger des Sticks wird über seine `pointer.id` erkannt. Tippt während des Haltens ein zweiter Zeiger auf das Feld, meldet er keinen Winkel an `resolveAim`. Das Ergebnis von `resolveAim` ist `targetAngle`. Nach dem Loslassen gilt wieder Tippen bzw. Maus.
  6. `GameScene`: Stick erzeugen, beim Szenenwechsel zerstören, Listener abmelden.
- **Schnittstellen:** keine Vertragsänderung. `AimInput.targetAngle` bleibt die einzige Schnittstelle zu `Player`.
- **Akzeptanzkriterien:**
  - `stickAngleRad` liefert 0°, 90°, 180°, 270° und 45° richtig, Totzone liefert `active` false, Ausschlag über dem Radius wird auf 1 begrenzt
  - Keine Phaser-Importe in `stick.ts`
  - iPhone (Handtest, M2b-DEP): Stick erscheint unten rechts im Querformat, 360°-Zielen, Auto-Schuss läuft, Drehung bleibt verzögert
  - iPhone (Handtest): Tippen auf das Spielfeld zielt weiterhin, solange der Stick nicht gehalten wird
  - `resolveAim`: Stick gehalten schlägt Tippen und Maus, ein zweiter Finger auf dem Feld während des Haltens wird ignoriert, nach dem Loslassen gilt wieder Tippen bzw. Maus
  - PC (Handtest): kein Stick, Maus zielt wie bisher
  - Checks grün
- **Tests:** `tests/platform/stick.test.ts`: Winkel, Totzone, Begrenzung. `tests/logic/aimSource.test.ts`: Stick schlägt Tippen und Maus, Stick in der Totzone hält den letzten Winkel, Tippen gilt ohne Stick, nach Loslassen wieder Tippen, zweiter Zeiger während des Haltens ignoriert. Szene und Pointer nur im Handtest.
- **Review-Schwerpunkte:** Multi-Touch (Stick, zweiter Finger, Pause-Taste), Prioritätsregel nur in `aimSource.ts` und nicht in der Szene, Pointer-Aufräumen, keine Spielwerte in der Szene, Winkel in Radiant
- **Doku-Pflichten:** – (Bedienung in der README nur auf Nutzerwunsch)
- **Aufwand:** M · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** ja (Größe und Totzone fest, keine Anpassung je Gerät)
- **Commit-Typ:** `feat(AP-39): add virtual stick for touch aiming`

#### AP-56 – Nachtrag Handtest M2b-DEP: Rundenstart, Baum-Leben, Balancing der ersten Level

- **Meilenstein, Lane, Welle:** M2b-Nachtrag · SH/LOG · W8 (nach M2b-DEP, vor M2c W1; PE-61)
- **Ziel:** Drei Befunde des Handtests vom 2026-10-25 beheben, nur in Config, Logik und Tests: (c) die ersten Level sind zu einfach, (d) jede Runde beginnt mit spawnenden Gegnern statt mit leerem Feld, (e) der Verfluchte Baum stirbt mit einem Laser. Keine Szene, keine Entity, kein Vertrag ändert sich.
- **Ist-Stand (Planner hat den Code gelesen):** (d) `SpawnDirector` setzt `cooldownMs = level.spawnIntervalMs`, der erste Gegner erscheint also erst nach einem vollen Intervall (Level 0: 3,57 s) und startet auf dem Ring 391 px vom Zentrum (Tempo 30 px/s, etwa 12 s Laufweg). (e) `cursedTree.hp` ist 30, die Grundwaffe macht 10 je Schuss; Doppelschuss Stufe 2 (drei Laser, Fächer) und Schaden-Upgrades (+10 % je Stufe) töten ihn mit einer Salve. (c) Druck (Gegner-HP je Sekunde geteilt durch Basis-DPS) liegt in Level 0 bei 0,27 und in Level 4 bei 0,43 (`docs/balancing.md`).
- **Pflichtlektüre:** PE-61, `src/logic/spawn.ts`, `src/config/{levels,enemies,coins}.ts`, `tests/logic/{spawn,balance}.test.ts`, `tests/config/{levels,enemies,coins}.test.ts`, `docs/balancing.md`, §18 (Erkenntnisse AP-15, AP-23, AP-35: Kennzahl-Tabelle, Gold-Test), Draft „Verbesserungsplan Wellenkonzept“ in §16 (nur Hintergrund, nicht Teil dieses Pakets)
- **Abhängigkeiten:** M2b-DEP (abgenommen). Keine Dateiüberschneidung mit AP-50/AP-51, deshalb technisch auch parallel zu M2c W1 möglich. Vorgabe des Leads: vor M2c W1 mergen
- **Parallel möglich mit:** AP-50, AP-51 (keine gemeinsame Datei)
- **Dateien (Eigentum):** `src/logic/spawn.ts`, `tests/logic/spawn.test.ts`, `src/config/{levels,enemies}.ts`, `src/config/coins.ts` (nur `dropChance`, falls der Gold-Test es verlangt), `tests/config/{levels,enemies,coins}.test.ts`, `tests/logic/balance.test.ts`, `docs/balancing.md`
- **Nicht anfassen:** `src/contracts/**` (`LevelDef` bleibt), `src/scenes/**` (auch `GameScene.ts`: die Anfrage trägt den Radius schon, `pointOnRing` setzt ihn um), `src/entities/**`, `src/logic/round.ts`, `docs/design/**`, alle Dateien aus AP-50/AP-51
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. **Rundenstart (d), `spawn.ts`:** Beim ersten `tick` mit gültigem `dtMs` erzeugt der Director sofort eine **Eröffnungswelle** von `openingCount = clamp(round(level.maxEnemies * 0.15), 3, 8)` Gegnern (Level 0: 4, Level 20: 8), begrenzt durch `maxEnemies - aliveCount`. Die Winkel sind gleichmäßig verteilt (zufälliger Startwinkel aus `SpawnRng`, dann `+ i * 2π / n`), der Typ kommt aus `pickEnemy()`. Der Radius der Eröffnungswelle ist `spawnRadius * OPENING_RADIUS_FACTOR` mit exportierter Konstante `OPENING_RADIUS_FACTOR = 0.65` (Startwert, angenommen; die Gegner erscheinen am Bildrand statt weit außerhalb und sind in unter 10 s bei der Astronautin). Danach läuft der Regelbetrieb wie bisher (erster Regel-Spawn nach einem vollen Intervall, Intervall sinkt auf 60 %). Eröffnungsgegner zählen zu `alive`, `maxEnemies` bleibt Obergrenze. Genau einmal je Director (eine neue Runde oder „Nochmal“ legt einen neuen Director an, die Pause ruft `tick` nicht auf). `GameScene.ts` bleibt unverändert.
  2. **Baum-Leben (e), `enemies.ts`:** `cursedTree.hp` von 30 auf 50 (Startwert, angenommen). Die Grundwaffe braucht dann 5 Treffer. Zusatz: Doppelschuss Stufe 2 bei Schaden-Upgrade Stufe 5 (drei Laser je 15) macht 45 und tötet den Baum nicht mit einer Salve. Mit Schaden-Upgrade Stufe 10 kann eine volle Salve ihn töten, das ist gewollt. Die Werte der anderen Gegner bleiben.
  3. **Balancing der ersten Level (c), `levels.ts`:** Die höheren Baum-HP heben den Druck von selbst (Level 0 etwa 0,44, Level 4 etwa 0,73). Der Coder stellt die Kurve mit der Kennzahl aus `balance.test.ts` neu ein (nur Zahlen in `SPAWN_INTERVAL_MS`, `MAX_ENEMIES`), Zielwerte (Startwerte, angenommen): **Level 0 Druck 0,45 bis 0,55** (Startwert Abstand etwa 3300 ms statt 3570), **Level 4 Druck 0,72 bis 0,80**, Level 4 auf 5 Sprung 1,08 bis 1,12, Level 9 auf 10 Sprung 1,08 bis 1,10, ab Level 5 höchstens +10 % je Stufe, **Level 20 Druck 0,95 bis 1,25** (heute 0,96; ohne Anpassung stiege es durch die Baum-HP auf etwa 1,34, das ist zu viel, Nutzer bewertete die späten Level nicht als zu leicht). Level 5 bis 9 brauchen dafür mehr Spawns (Abstand etwa 1150 ms statt 1330 für Level 5), Level 11 bis 20 etwas weniger. Der Abstand sinkt weiter streng mit jedem Level. Obergrenze `maxEnemies` höchstens 150, Startwerte der Liste nur erhöhen, wenn die Wirkung der zäheren Bäume es verlangt.
  4. **Folgen ausgleichen:** Mehr oder weniger Spawns verändern das Gold. `COIN_RULES.dropChance` (derzeit 0,048) wird nur dann angepasst, wenn der Gold-Test (Mittel 43 bis 47 je gewonnenem Level, Stufe 10 nach 15 bis 20 Leveln, Summe aller Upgrades 2700 bis 2900) sonst rot würde. Die Eröffnungswelle zählt in den Spawn-Zahlen des Tests mit (`spawnCount`). Ein geänderter `dropChance` wird in `tests/config/coins.test.ts` und `docs/balancing.md` nachgezogen.
  5. **Tests anpassen:** `levels.test.ts`: der Test „levels 0-4 keep their fixed spawn values (AP-23)“ wird auf die neuen Werte umgestellt oder durch Bereiche ersetzt (Abstand und Maximum steigen je Level). `balance.test.ts`: „level 0 is easy“ von höchstens 0,4 auf 0,45 bis 0,55 als Bereich, Level 20 mit der neuen Obergrenze, `metrics` und `spawnCount` rechnen die Eröffnungswelle mit. `spawn.test.ts`: „uses the configured radius“ trennt Eröffnungs- und Regel-Spawns (Regel-Spawns auf dem vollen Radius 600, Eröffnungs-Spawns auf `0.65 * 600`).
  6. `docs/balancing.md`: Kennzahl-Tabelle neu, Abschnitt „Änderung nach dem Handtest M2b-DEP (AP-56)“ mit Befund, Ursache und neuen Werten, den Hinweis auf die Eröffnungswelle und `OPENING_RADIUS_FACTOR` im Abschnitt „Nachjustieren“.
- **Schnittstellen:** `SpawnDirector`-API bleibt (`tick`, `currentIntervalMs`), neu exportiert sind `OPENING_RADIUS_FACTOR` und `openingCount(level)`. Keine Vertragsänderung.
- **Akzeptanzkriterien:**
  - (d) Der erste `tick` einer Runde liefert Spawns (mindestens 3), alle auf dem Eröffnungsradius, vor Ablauf des ersten Intervalls. Mit `aliveCount >= maxEnemies` liefert er keine. Gleicher Seed, gleiche Ausgabe (deterministisch). Handtest: Wenige Sekunden nach dem Start sind Gegner am Bildrand sichtbar, kein leeres Feld mit Wartezeit
  - (e) `cursedTree.hp >= 5 * WEAPON_BASE.damage`. Test: Doppelschuss Stufe 2 mit Schaden-Upgrade Stufe 5 (Faktor 1,5, drei Laser) tötet den Baum nicht mit einer Salve. Handtest: ein Laser tötet den Baum nicht
  - (c) Druck-Kennzahlen innerhalb der Zielwerte aus Umsetzung 3, alle bestehenden Kurven-Tests (steigender Druck, steigende Dichte, Sprünge, 5-Minuten-Level härter) bleiben grün, bei geänderten Zielwerten ist die Begründung in `docs/balancing.md` und im Bericht
  - Gold-Mittel bleibt zwischen 43 und 47, Checks grün (lint, typecheck, test, assets:check, build)
- **Tests:** `spawn.test.ts` (Eröffnungswelle: Anzahl, Radius, Winkelverteilung, `maxEnemies`, einmalig, deterministisch), `enemies.test.ts` (Baum-HP, Treffer bis zum Tod), `levels.test.ts`, `balance.test.ts`, `coins.test.ts` (nur bei Änderung)
- **Review-Schwerpunkte:** Eröffnungswelle nur einmal je Director und nicht in der Pause, keine Änderung an `GameScene`/Vertrag, Kurven-Tests sind nicht nur gelockert (Bereiche begründet), Gold-Kette stimmt, `docs/balancing.md` passt zu den Zahlen, keine Konflikte mit dem Draft AP-40 ff. (Hinweis in §18)
- **Doku-Pflichten:** `docs/balancing.md`
- **Design-Review:** nein
- **Aufwand:** M · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein (Nutzerbefund)
- **Commit-Typ:** `fix(AP-56): open rounds with a spawn wave and toughen trees`

#### AP-57 – Lint-Fix: `docs/design/**` von ESLint ausnehmen (PE-62)

- **Meilenstein, Lane, Welle:** M2b-Nachtrag · OPS · W8 (vor M2c W1; PE-62)
- **Ziel:** `npm run lint` ist auf dev wieder grün. Der Design-Commit `5e58bf2` hat die Browser-Skripte `docs/design/assets/fonts.js` und `docs/design/assets/pixel.js` nach dev gebracht. ESLint meldet dort 18 `no-undef`-Fehler für `document` und `window`. Der Ordner wird aus dem Lint ausgenommen, die Designer-Dateien bleiben unverändert.
- **Ist-Stand (Planner hat gelesen):** `eslint.config.js` ist eine Flat-Config mit `ignores: ['dist/', 'node_modules/']`. `package.json` setzt `"lint": "eslint ."`. Eine `.eslintignore` gibt es nicht.
- **Pflichtlektüre:** PE-62, `eslint.config.js`, `package.json` (Skript `lint`), §9 (Eigentum von `eslint.config.js`: AP-57 in W8, AP-55 in W3)
- **Abhängigkeiten:** Design-Commit `5e58bf2` auf dev (erfüllt)
- **Parallel möglich mit:** keine gemeinsame Datei mit anderen Paketen. Merge vor dem Start von M2c W1, damit `npm run lint` als Basis grün ist
- **Dateien (Eigentum):** `eslint.config.js` (nur diese Datei)
- **Nicht anfassen:** `docs/design/**` (nicht ändern, nicht löschen, nicht verschieben), `src/**`, `tests/**`, `package.json`, `tsconfig*.json`
- **Freigegebene Abhängigkeiten:** keine. Keine neuen ESLint-Plugins und keine Erweiterung der Globals
- **Umsetzung:**
  1. In `eslint.config.js` den Eintrag `{ ignores: ['dist/', 'node_modules/'] }` um `'docs/design/**'` ergänzen. Nur diese Zeile, keine neuen Konfigurationsblöcke.
  2. Ein Kommentar über dem Eintrag: Designer-Dateien (Browser-Skripte, PE-62) sind nicht Teil des Projektcodes.
  3. Prüfen: `npm run lint` ohne Fehler, `git status` zeigt nur `eslint.config.js`, keine Änderung unter `docs/design/`.
  4. Gegenprobe, nur manuell und nicht eingecheckt: eine undefinierte Variable in einer Datei unter `src/` anlegen, `npm run lint` muss sie melden, danach die Datei wieder entfernen. Das belegt, dass die Ausnahme eng ist.
- **Schnittstellen:** –
- **Akzeptanzkriterien:**
  - `npm run lint` auf dev ohne Fehler (vorher 18 Fehler)
  - Einzige geänderte Datei: `eslint.config.js`. `git diff dev -- docs/design` ist leer
  - Gegenprobe aus Umsetzung 4 wird gemeldet (manuell geprüft, nicht eingecheckt)
  - Andere Checks unverändert grün: Install, typecheck, Tests, assets:check, build
- **Tests:** – (Konfigurationsänderung, Prüfung über die Checks und die Gegenprobe)
- **Review-Schwerpunkte:** Ausnahme nur `docs/design/**`, keine Regel gelockert, keine Globals-Erweiterung, keine Änderung in `src/`
- **Doku-Pflichten:** –
- **Design-Review:** nein
- **Aufwand:** S · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein (blockiert den Lint-Check auf dev)
- **Commit-Typ:** `fix(AP-57): ignore designer browser scripts in eslint`

### M2c – Design-Umsetzung

Gemeinsame Pflichtlektüre aller M2c-Pakete: `docs/design/design-brief.md` (Abschnitte „Gewählte Richtung“, „Grundsätze“, „Übergabe an den Planner“), PE-59, PE-60. `docs/design/` ist für Coder nur lesbar (Eigentum des Designers). Neue Abhängigkeiten gibt es nicht (Brief, „Neue Abhängigkeiten: keine“). Die Spiellogik und alle Werte in `src/config/` (außer den neuen Design-Dateien) bleiben unverändert.

#### AP-50 – Theme, Waffen-Geometrie und Farben der Hülle (Design)

- **Meilenstein, Lane, Welle:** M2c · OPS/SH/LOG · W1
- **Ziel:** Die Design-Tokens liegen typisiert im Code (`src/config/theme.ts`), die reinen Funktionen für die Waffe (Ausbaustufe, Handpunkt, Mündung, Tiefe, Spiegeln) und die Bewegungseinstellung stehen als Verträge für die UI-Pakete bereit, und die Hülle (HTML, Manifest, Canvas) nutzt `menu.bg`. Keine sichtbare Änderung in den Szenen.
- **Pflichtlektüre:** Brief-Abschnitt „Exporte und Zielorte“ und Zeile `Player.ts` der Tabelle „Anzupassende Screens“ (Maße der Waffe), `docs/design/export/tokens.resolved.json`, `docs/design/tokens.json` (Namen der Tokens), `docs/design/mockups/{sprites,schrift-und-waffe}.html` (Ankerpunkte, Frames der Waffe), `src/main.ts`, `index.html`, `public/manifest.webmanifest`, `src/platform/audio.ts` (nur `addMuteButton`), `src/config/upgrades.ts`, `src/contracts/upgrade.ts`
- **Abhängigkeiten:** M2b-DEP (Reihenfolgekante, PE-60)
- **Parallel möglich mit:** AP-51 (keine gemeinsame Datei; `package.json` gehört nur AP-50)
- **Dateien (Eigentum):** `scripts/build-theme.mjs` (neu), `src/config/theme.ts` (neu, erzeugt), `src/styles/tokens.css` (neu, Kopie von `docs/design/export/tokens.css`), `src/config/weaponMount.ts` (neu), `src/logic/weaponMount.ts` (neu), `src/platform/motion.ts` (neu), `package.json` (nur die Skripte `theme:build` und `fonts:build`), `index.html` (nur Farben und Verweis auf `tokens.css`), `public/manifest.webmanifest`, `src/main.ts` (nur `backgroundColor`), `src/platform/audio.ts` (nur die Signatur von `addMuteButton`), `tests/config/theme.test.ts`, `tests/logic/weaponMount.test.ts`, `tests/platform/motion.test.ts` (alle neu)
- **Nicht anfassen:** `docs/design/**`, `src/scenes/**` (außer den genannten Dateien), `src/entities/**`, übrige `src/logic/*` und `src/config/*`, `package-lock.json` (keine neuen Pakete)
- **Freigegebene Abhängigkeiten:** keine (nur Node-Bordmittel)
- **Umsetzung:**
  1. `scripts/build-theme.mjs`: liest `tokens.resolved.json` und schreibt `src/config/theme.ts` mit Kopfzeile „erzeugt, nicht von Hand ändern“. Die Logik steckt in einer exportierten Funktion `buildTheme(json)`, die Datei wird nur beim direkten Aufruf geschrieben (testbar). Farben als Paar `num` (`0xRRGGBB`) und `css` (`'#rrggbb'`), Alpha-Tokens (`hud.glass`, `menu.scrim`, `hud.scrim`) als Paar aus Farbe und Alpha. Abstände, Größen und Zeiten als Zahlen mit Einheit im Namen. Die Typen sind so, dass ein falscher Tokenname ein Typfehler ist. `export/tokens.ts` und `tokens.css` sind für Phaser nicht nutzbar und werden nicht importiert. Das Skript kopiert zusätzlich `docs/design/export/tokens.css` nach `src/styles/tokens.css` (für `index.html`), der Test prüft beide Dateien auf Gleichheit.
  2. `package.json`: Skripte `theme:build` (`node scripts/build-theme.mjs`) und `fonts:build` (`node scripts/build-fonts.mjs`, das Skript legt AP-51 an). Sonst keine Änderung.
  3. `src/config/weaponMount.ts` (Werte aus dem Brief): Maße 24×16, Griff (7 | 12), Handpunkt (+10 | +9 von der Mitte, gespiegelt −10), Mündung (+15 | −5 vom Griff), Stufengrenzen der Summe der Waffen-Upgrades (0–6, 7–13, 14–20), Tiefenbereich hinter der Figur (−160° bis −20°), Frames je Stufe (zwei Frames je Stufe, Frames 0–1, 2–3, 4–5; weicht `sprites.html` ab, gilt `sprites.html` und der Coder meldet es). `src/logic/weaponMount.ts` (rein, ohne Phaser): `weaponStageForUpgrades(levels)` (Summe der beiden Waffen-Spuren, Ergebnis 0..2), `faceLeft(angleDeg)` (Betrag größer als 90°), `handPoint(centerX, centerY, faceLeft)`, `muzzlePoint(handX, handY, angleDeg, faceLeft)` (mitrotiert, `flipY` beim Zielen nach links berücksichtigt), `weaponBehindFigure(angleDeg)`, `weaponFrame(stage, frameInStage)`.
  4. `src/platform/motion.ts`: `prefersReducedMotion()` über `matchMedia('(prefers-reduced-motion: reduce)')`, ohne Fehler, wenn `matchMedia` fehlt (Standard `false`). Test mit einem Ersatzobjekt. Grundsatz 7 des Briefs.
  5. `index.html`: `theme-color` und Hintergrund aus `menu.bg` (bisher `#0b0b14`), `src/styles/tokens.css` einbinden. Der Hochformat-Hinweis bleibt in dieser Welle unverändert (AP-52). `public/manifest.webmanifest`: `background_color` und `theme_color` aus `menu.bg`. `src/main.ts`: `backgroundColor` aus `THEME`.
  6. `audio.ts`: `addMuteButton(scene, x, y, world: 'menu' | 'hud' = 'menu')`. Der Parameter wird in dieser Welle nur entgegengenommen, das Verhalten bleibt gleich (AP-52 setzt die Optik).
  7. `theme.test.ts`: Datei ist aktuell (Ausgabe von `buildTheme` gleich dem Inhalt von `theme.ts`), `num` und `css` stimmen überein, Pflichtnamen vorhanden (`menu.bg`, `menu.focus`, `hud.focus`, `hud.glass`, `gold.400`, `red.300`, `game.laser-raygun`, `game.shield-ring`, `game.fire-ring`, `game.firefly`, `game.spore`, `biome.*-ground`), Alpha im Bereich 0..1. Die Test-Datei liest `docs/design/export/tokens.resolved.json` (`node:fs` wie im Asset-Test).
- **Schnittstellen:** stellt `THEME`, die Funktionen aus `weaponMount.ts`, `prefersReducedMotion` und die Signatur von `addMuteButton` für AP-52 bis AP-54 bereit.
- **Akzeptanzkriterien:**
  - `npm run theme:build` erzeugt eine identische Datei (kein Diff)
  - Keine Handwerte in `theme.ts`, alle Werte stammen aus `tokens.resolved.json`
  - Stufengrenzen 6/7 und 13/14 sind getestet, Mündung stimmt in den vier Himmelsrichtungen
  - Checks grün, keine sichtbare Änderung in den Szenen außer der Hintergrundfarbe
- **Tests:** `theme.test.ts`, `weaponMount.test.ts` (Stufen, Spiegeln bei ±90°, Handpunkt, Mündung bei 0°, 90°, 180°, −90°, Tiefe), `motion.test.ts`
- **Review-Schwerpunkte:** `theme.ts` ist wirklich erzeugt, Typen sperren falsche Namen, Werte stammen aus dem Brief, keine neuen Pakete
- **Doku-Pflichten:** –
- **Design-Review:** nein (keine sichtbare Oberfläche außer der Hintergrundfarbe)
- **Aufwand:** M · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-50): add design theme tokens and weapon geometry`

#### AP-51 – Schriften, Icons und Asset-Pipeline (Design)

- **Meilenstein, Lane, Welle:** M2c · ASSET · W1
- **Ziel:** Die eigenen Bitmap-Schriften „Astro Kapsel“ und „Astro Funk“, das Waffen-Sprite, die neuen UI-Symbole und die App-Icons liegen als Dateien im Projekt, werden vom Manifest, vom Loader und von `assets:check` erkannt, und die Anleitung für Grafikdesigner ist aktuell. Die Szenen ändern sich nicht.
- **Pflichtlektüre:** Brief-Abschnitte „Schriften und Assets“ und „Exporte und Zielorte“ (Zeilen Schrift, Icon, `assets.ts`), `docs/design/assets/{fonts.js,pixel.js,app-icon.svg}`, `docs/design/mockups/{sprites,schrift-und-waffe}.html`, `src/config/assets.ts`, `src/contracts/assets.ts`, `scripts/{generate-placeholders,check-assets,generate-icons}.mjs`, `src/scenes/PreloadScene.ts`, `docs/guides/grafik-austauschen.md`, `public/assets/LICENSES.md`, §18 (Erkenntnisse AP-02, AP-26: `animKey`, Präfixe, Prettier nie in Pipes)
- **Abhängigkeiten:** M2b-DEP (Reihenfolgekante, PE-60)
- **Parallel möglich mit:** AP-50 (keine gemeinsame Datei)
- **Dateien (Eigentum):** `scripts/build-fonts.mjs` (neu), `scripts/generate-placeholders.mjs`, `scripts/check-assets.mjs`, `scripts/generate-icons.mjs`, `tests/scripts/check-assets.test.ts`, `src/contracts/assets.ts` (nur `AssetKind` um `bitmapFont`), `src/config/assets.ts`, `tests/config/assets.test.ts`, `src/scenes/PreloadScene.ts` (nur Laden der Schriften), `public/assets/fonts/{astro-kapsel,astro-funk}.{png,xml}` (neu), `public/assets/sprites/{weapon-raygun,ui-icons}.png`, `public/assets/.placeholders.json`, `public/assets/LICENSES.md`, `public/icons/icon-{180,192,512}.png`, `docs/guides/grafik-austauschen.md`
- **Nicht anfassen:** `docs/design/**`, `package.json`, `src/scenes/**` (außer `PreloadScene.ts`), `src/entities/**`, `src/logic/**`, `src/platform/**`
- **Freigegebene Abhängigkeiten:** keine (PNG-Ausgabe mit `zlib`, kein Bildpaket)
- **Umsetzung:**
  1. `scripts/build-fonts.mjs`: liest die Glyphen aus `docs/design/assets/fonts.js` (`window.PX_FONTS`; die Datei in einem leeren `vm`-Kontext mit `window = {}` auswerten, kein Netz) und schreibt je Schrift ein PNG (weiße Glyphen, transparent, Atlas) und eine BMFont-XML. Laufweite 1 px, Leerzeichen Kapsel 3 px, Funk 2 px, Funk enthält zusätzlich das kleine `s`. Die Ausgabe ist deterministisch (gleicher Lauf, gleiche Bytes). Prüft der Coder per Suche, welche Zeichen das Spiel in Texten braucht (Großbuchstaben, Umlaute, Ziffern, `/ % : ! . x s`), und meldet fehlende Zeichen dem Lead. Er entwirft selbst keine Glyphen.
  2. `contracts/assets.ts`: `AssetKind` bekommt `'bitmapFont'`, `AssetDef` ein optionales Feld für die XML-Datei. `config/assets.ts`: Einträge `astro-kapsel` und `astro-funk` (deutsche Beschreibung), `weapon-raygun` (Spritesheet 24×16, 6 Frames, zwei Frames je Ausbaustufe), `ui-icons` neu belegt (16×16, 4 Frames: 0 Ton an, 1 Ton aus, 2 Pause, 3 Schloss; das Herz entfällt).
  3. `generate-placeholders.mjs`: erzeugt `weapon-raygun.png` aus den Vorlagen (`pixel.js`, `sprites.html`) und das neue `ui-icons.png`. Die Schriften erzeugt nur `fonts:build`. Echte Designer-Dateien werden nie überschrieben. `check-assets.mjs` und sein Test prüfen Schrift-PNG und XML (Zeichen-IDs eindeutig, jedes Zeichen liegt im Bild).
  4. `PreloadScene.ts`: Der Zweig `else` lädt sonst jede unbekannte Art als Audio. Die Art `bitmapFont` wird mit `load.bitmapFont(key, path, xmlPath)` geladen. Mehr ändert dieses Paket an der Datei nicht (AP-52 übernimmt in W2 das Laden der Schrift in `BootScene`).
  5. `generate-icons.mjs`: rasterisiert `docs/design/assets/app-icon.svg` ohne Zusatzpaket nach 180, 192 und 512 px (Nearest-Neighbor). Das SVG besteht aus `<rect>`, einer `<g transform="translate">` und `opacity`. Ein kleiner eigener Parser genügt. Enthält das SVG Elemente, die er nicht kann, stoppt der Coder und meldet es dem Lead (kein Paket installieren).
  6. `grafik-austauschen.md`: Einträge für `weapon-raygun`, das neue `ui-icons` und die Schriften (Schriften entstehen aus dem Skript, nicht von Hand ersetzen), dazu die Sprite-Regeln aus `sprites.html` (Raster, Palette, Umriss, Ankerpunkte). `LICENSES.md`: Schriften, Icon und Sprites als „eigene Arbeit des Projekts“ (Brief, Tabelle „Schriften und Assets“).
  7. **Bekannter Zwischenzustand:** `audio.ts` (Frame 1 und 2) und `HudScene` (Frame 0, Herz) nutzen `ui-icons` mit der alten Belegung. Bis AP-52 und AP-53 in W2 gemergt sind, zeigt dev dort falsche Symbole. Das ist akzeptiert, W1 und W2 werden direkt hintereinander gemergt.
- **Schnittstellen:** Keys `astro-kapsel`, `astro-funk`, `weapon-raygun`, `ui-icons` (neue Belegung) für AP-52 bis AP-54.
- **Akzeptanzkriterien:**
  - `npm run fonts:build` erzeugt identische Dateien, `npm run assets:check` ist grün
  - Beide Schriften sind in `?assets=1` bzw. im Loader fehlerfrei geladen
  - Die Icons sind scharf (Nearest-Neighbor), das Helm-Motiv entspricht `app-icon-desktop.png` in `docs/design/screenshots/`
  - Checks grün
- **Tests:** `assets.test.ts` (neue Keys, Frame-Zahlen, Art `bitmapFont`), `check-assets.test.ts` (kaputte XML, fehlendes Zeichen), Determinismus von `fonts:build`
- **Review-Schwerpunkte:** Prettier nicht in Pipes (§18), `git diff --stat` auf geleerte Dateien, Binärdateien gegen dev vergleichen, `LICENSES.md` vollständig, Glyphen stimmen mit dem Screenshot `schrift-und-waffe-desktop.png` überein
- **Doku-Pflichten:** Anleitung `grafik-austauschen.md` und `LICENSES.md`
- **Design-Review:** nein (Reviewer vergleicht die erzeugten Bilder mit den Screenshots, der Nutzer prüft in M2c-DEP)
- **Aufwand:** L · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-51): add bitmap fonts, weapon sprite and design icons`

#### AP-52 – Menü, Level-Auswahl, Upgrade-Panel, Laden, Hochformat-Hinweis (Design)

- **Meilenstein, Lane, Welle:** M2c · GAME · W2
- **Ziel:** Alle Menü-Szenen im Kassetten-Stil nach den Mockups: Schrift Astro Kapsel, nur `color.menu.*`, keine Farb-Literale.
- **Pflichtlektüre:** Brief (Grundsätze 1–7, Tabelle „Anzupassende Screens“, Zeilen `Button.ts`, `MenuScene.ts`, `LevelGrid.ts`, `UpgradePanel.ts`, `ConfirmDialog.ts`, `PreloadScene.ts`, `index.html`, Ton-Button), `docs/design/tokens.json`, `docs/design/mockups/hauptmenue.html` (Ansichten 1 bis 4), `docs/design/mockups/ergebnis.html` (Ansicht 3, Hochformat-Hinweis), `docs/design/styleguide.html` („Buttons · Menü“, „Laden“), Screenshots `hauptmenue-desktop.png`, `styleguide-desktop.png`, `src/config/theme.ts`, `src/logic/weaponMount.ts` (AP-50), Ist-Stand aller Dateien, §18 (Erkenntnisse AP-32)
- **Abhängigkeiten:** AP-50, AP-51
- **Parallel möglich mit:** AP-53, AP-54 (keine gemeinsame Datei)
- **Dateien (Eigentum):** `src/scenes/MenuScene.ts`, `src/scenes/menu/{Button,LevelGrid,UpgradePanel,ConfirmDialog}.ts`, `src/scenes/PreloadScene.ts`, `src/scenes/BootScene.ts`, `src/platform/audio.ts` (`addMuteButton`), `index.html` (nur Hochformat-Hinweis), zugehörige Tests (`tests/scenes/levelGroups.test.ts` bleibt grün, `tests/platform/audio.test.ts` falls betroffen)
- **Nicht anfassen:** `src/scenes/{GameScene,HudScene,ResultScene}.ts`, `src/scenes/hud/*`, `src/scenes/controls/*`, `src/entities/**`, `src/logic/*`, `src/config/*`, `docs/design/**`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `Button.ts`: Kassetten-Button mit Fase (2 px hell oben links, dunkel unten rechts), 2-px-Umriss und 4-px-Schatten. Varianten primary, secondary, danger, icon. Zustände hover, active (2 px versetzt), disabled, Fokus (2-px-Ring `menu.focus` mit Abstand). Mindestgröße 32×32. Text in Astro Kapsel 2×, nur ganzzahlig skaliert.
  2. `MenuScene.ts` nach `hauptmenue.html` 1 und 4: Logo (Kapsel-Schriftzug „360“ in Koralle, „SHOOTER“ in Creme), Porträt-Karte (Spielerlevel, XP-Balken, Gold, „Waffe x/20“ mit Waffen-Symbol der Ausbaustufe aus `weaponStageForUpgrades` und `weapon-raygun`, „Anzug x/20“, Button „UPGRADES“ als Hauptaktion in Koralle), Level-Panel, Zurücksetzen, Hinweiszeile, Sternenhimmel und Planet als Hintergrund. Leerer Spielstand: „WILLKOMMEN! STARTE MIT LEVEL 0.“ Die Ton-Taste ruft `addMuteButton(..., 'menu')` auf.
  3. `LevelGrid.ts` (und Daten aus `levelGroups.ts`, unverändert): nach Biom gruppiert mit Aufkleber und Bereich (0–4, 5–9, 10–20), Kachelzustände geschafft (Minze und Stern), aktuell (Koralle, Creme-Ring, Pfeil), gesperrt (Schloss aus `ui-icons`), Legende unten.
  4. `UpgradePanel.ts`: Gruppen WAFFE und ANZUG, je Zeile 10 Pips, „x/10“ und Kaufen-Button mit Preis. Zustände kaufbar, zu teuer (deaktiviert, Text „ZU TEUER“) und „MAX“. Zeigt die nächste Waffen-Ausbaustufe. Kauf-Logik und Storage-Zugriff bleiben unverändert (AP-29, AP-28).
  5. `ConfirmDialog.ts`: Kassetten-Dialog, der Fokus liegt zuerst auf „ABBRECHEN“.
  6. `BootScene.ts` lädt die Einträge der Art `bitmapFont` aus dem Manifest zuerst, `PreloadScene.ts` überspringt sie und zeigt den Ladebalken im Kassetten-Stil „LADE KASSETTE …“ in Astro Kapsel. Fehlt die Schrift, bleibt der Balken ohne Text (kein Absturz).
  7. `audio.ts`: `addMuteButton` zeichnet im Fall `'menu'` einen Kassetten-Icon-Button (Frames 0 und 1 von `ui-icons`), im Fall `'hud'` die Funk-Variante nach `styleguide.html` mit `THEME.hud.*`. Mindestgröße 32×32, Fokus-Ring.
  8. `index.html`: Hochformat-Hinweis im Kassetten-Stil (Astronautin, „BITTE DREHEN“, Symbol Hoch → Quer) als HTML/CSS mit Variablen aus `tokens.css`, kein Bild aus dem Netz, keine externe Schrift (Systemschrift mit Pixel-Anmutung ist erlaubt, wenn die Bitmap-Schrift hier nicht nutzbar ist).
  9. Keine `0x…`- oder `#…`-Literale und keine `monospace`-Angabe in den eigenen Dateien. Bewegungen 80–300 ms in Stufen, bei `prefersReducedMotion()` ohne Animation.
- **Schnittstellen:** nutzt `THEME`, `weaponMount`, `motion` (AP-50) und Keys aus AP-51. Stellt `Button` für künftige Menü-Szenen bereit.
- **Akzeptanzkriterien:**
  - Menü, Level-Raster, Upgrade-Panel, Dialog und Ladebildschirm entsprechen den Mockups, alle Zustände sind sichtbar und nie nur über Farbe erkennbar (Stern, Schloss, „ZU TEUER“, „MAX“)
  - Ziele mindestens 32×32, Fokus-Ring sichtbar
  - Funktion unverändert: Kauf, Reset mit Dialog, Level starten, Gold-Anzeige, Ton-Taste
  - Checks grün
- **Tests:** keine Phaser-Tests; reine Hilfsfunktionen (z. B. Pip-Anzahl) als Funktion mit Test, falls nötig
- **Review-Schwerpunkte:** Grundsätze 1 bis 7, keine doppelten Listener nach Szenenwechsel, Touch-Bedienung, Fokus-Reihenfolge im Dialog, keine Systemschrift
- **Doku-Pflichten:** –
- **Design-Review:** ja (`ma-designer`, Modus Review, zusätzlich zum normalen Review)
- **Aufwand:** L · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-52): restyle menu scenes with cartridge design`

#### AP-53 – Runde: HUD, Pause, Stick, Ergebnis, Maps (Design)

- **Meilenstein, Lane, Welle:** M2c · GAME · W2
- **Ziel:** Alle Runden-Bildschirme im Funkgerät-Stil: Schrift Astro Funk, nur `color.hud.*`, Biom nur in der Welt und als Farbband im Ergebnis. Die Spiellogik bleibt unverändert.
- **Pflichtlektüre:** Brief (Grundsätze 1–8, Zeilen `HudScene.ts` und `hud/*`, `VirtualStick.ts`, `ResultScene.ts`, `maps.ts`), `docs/design/mockups/runde.html` (Ansichten 1 bis 4), `docs/design/mockups/ergebnis.html` (Ansichten 1 und 2), `docs/design/styleguide.html` („Stick“, HUD-Komponenten), Screenshots `runde-desktop.png`, `ergebnis-desktop.png`, `src/config/theme.ts`, `src/platform/{layout,motion}.ts`, Ist-Stand der Dateien, §18 (Erkenntnisse AP-34: HUD liest keinen Startzustand, `hudMath.ts`; AP-38: `hudScale`)
- **Abhängigkeiten:** AP-50, AP-51
- **Parallel möglich mit:** AP-52, AP-54 (keine gemeinsame Datei)
- **Dateien (Eigentum):** `src/scenes/HudScene.ts`, `src/scenes/hud/{CoinCounter,PowerIndicators,ArmourIndicator,hudMath}.ts`, `src/scenes/hud/{FunkPanel,FunkButton}.ts` (neu), `src/scenes/ResultScene.ts`, `src/scenes/controls/VirtualStick.ts`, `src/config/maps.ts`, `src/entities/MapBackground.ts`, `tests/scenes/hud.test.ts`, `tests/config/maps.test.ts`
- **Nicht anfassen:** `src/scenes/{GameScene,MenuScene,PreloadScene,BootScene}.ts`, `src/scenes/menu/*`, `src/platform/*`, `src/entities/` (außer `MapBackground.ts`), `src/logic/*`, übrige `src/config/*`, `docs/design/**`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `FunkPanel` (dunkles Glas `hud.glass`, 1-px-Linien, gepunktete Trenner, Logbuch-Kopf, angeschliffene Ecke oben links) und `FunkButton` (Zustände, Fokus-Ring `hud.focus`, mindestens 32×32) als wiederverwendbare Bausteine. Ergebnis und Pause nutzen sie, nicht `menu/Button.ts`.
  2. `HudScene` nach `runde.html` 1 bis 4: Energie-Panel (Zahl 3× und 10 Segmente, Warnzustand ab 25 % oder weniger mit Label „ENERGIE!“), Timer-Panel (Warnung unter 10 s; Zustand „BOSS!“ als schaltbarer Zustand `setOvertime(on)`, in diesem Meilenstein noch nie aktiv, die Verdrahtung macht AP-20), Chips nur für aktive Kräfte mit Zahl oder Sekunden (kleines „s“, z. B. „4s“), Münz-Anzeige, Feuerring aktiv (Akzentrahmen) bzw. lädt (gepunktet). Größeres HUD (Brief, 5b), Layout mit `hudScale` und Safe-Area. Pause- und Ton-Taste als Funk-Icon-Buttons (`ui-icons` Frame 2 und `addMuteButton(..., 'hud')`). Das Herz-Symbol entfällt (Frame 0 hat jetzt eine andere Bedeutung). **Kein grauer Kasten (Handtest-Befund M2b-DEP, PE-61):** Das halbtransparente schwarze Rechteck `ROW_PANEL_W` (290 px mal `k`, Alpha 0,55) hinter der Power-up-Zeile in `HudScene.ts` entfällt. Die Chips haben nur ihren eigenen Rahmen laut `runde.html`, hinter einer inaktiven Zeile oder zwischen den Chips liegt keine Fläche. Der Schild-Balken in `PowerIndicators.ts` hat einen eigenen schmalen Hintergrund (Rahmen des Balkens), keine breite Fläche.
  3. Pause-Overlay im Funk-Stil mit Level, Biom und Restzeit. Fehlen Biom oder Level in den Szenendaten, leitet der Coder sie aus der Level-ID über `src/config` ab (keine Änderung an `GameScene`, sonst Rückfrage an den Lead).
  4. `ResultScene` nach `ergebnis.html` 1 bis 2: Biom-Farbband oben, Logbuch-Kopf, GEWONNEN/VERLOREN in Astro Funk 4×, Faktenliste (Dauer, Erfahrung, Gold wie bisher), Buttons rechts unten, der Fokus liegt auf der Hauptaktion („NÄCHSTES LEVEL“ oder „NOCHMAL“, Akzentrahmen). Die Regeln aus AP-33 und AP-10 (z. B. „Nächstes Level“ nur nach Sieg) bleiben.
  5. `VirtualStick`: gepunkteter Phosphor-Ring, Knopf mit Phosphor-Rand, aktiv heller. Verhalten aus AP-39 bleibt unverändert. **Größe (Handtest-Befund M2b-DEP „Stick auf dem Handy 10 % zu groß“, PE-61, Q-32):** Durchmesser und Knopf kommen aus den Design-Tokens `size.stick` (88 px) und `size.stick-knob` (28 px) über `THEME`, die Konstanten `BASE_DIAMETER = 140` und `KNOB_DIAMETER = 56` entfallen. Der Fangbereich, in dem ein Finger den Stick startet, ist unabhängig von der gezeichneten Größe und hat mindestens 126 px Durchmesser (10 % unter dem Ist-Stand 140), damit er mit dem Daumen sicher getroffen wird. Hat das Design-Token (theme.ts) die Größe nicht, gilt 126 px für Ring und 50 px für den Knopf (je 10 % weniger) und der Coder meldet es dem Lead.
  6. `maps.ts`: `baseColor` aus `biome.*-ground`, Partikel mit `game.firefly` und `game.spore`. `MapBackground.ts` ohne Farb-Literale.
  7. Reine Hilfsfunktionen (Segmentzahl, Warnschwelle, Sekundentext) in `hudMath.ts` mit Tests. `prefersReducedMotion()`: kein Blinken von Energie und Timer, die Information bleibt über Text und Umriss erhalten.
  8. Listener beim Szenenende abmelden (wie bisher). Keine Zahlen über Gegnern (Grundsatz 8).
- **Schnittstellen:** nutzt `THEME`, `layout`, `motion` und die Keys aus AP-51. Die HUD-Events aus dem Vertrag bleiben unverändert.
- **Akzeptanzkriterien:**
  - HUD, Pause und Ergebnis entsprechen den Mockups, Warnzustände haben ein zweites Merkmal (Text, Umriss)
  - Alle Funktionen der HUD- und Ergebnis-Szenen wie vorher (Pause, Weiterspielen, „Nochmal“, „Nächstes Level“, Menü)
  - Stick (Befund PE-61): gezeichneter Durchmesser aus `size.stick` (88 px, Knopf 28 px) und damit deutlich kleiner als vorher (140 px), Fangbereich mindestens 126 px, Stick startet auf dem iPhone mit dem Daumen sicher, Verhalten (Vorrang vor Tippen, zweiter Finger, Pause) unverändert
  - HUD (Befund PE-61): hinter den Power-up-Anzeigen liegt kein grauer Kasten und keine breite Fläche (weder bei aktiven noch bei inaktiven Kräften), Sichtprüfung am PC und im iPhone-Querformat
  - Keine Farb-Literale und keine `monospace`-Angabe in den eigenen Dateien
  - Checks grün
- **Tests:** `hudMath` (Segmente bei 0, 25, 100 %, Sekundentext mit „s“), `maps.test.ts` an die Tokens angepasst
- **Review-Schwerpunkte:** Grundsätze 1 bis 8, Listener aufräumen, Lesbarkeit auf dem Handy (HUD größer), `ENERGIE!` und `BOSS!` nicht nur über Farbe, Safe-Area
- **Doku-Pflichten:** –
- **Design-Review:** ja (`ma-designer`, Modus Review, zusätzlich zum normalen Review)
- **Aufwand:** L · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-53): restyle hud, pause, result and maps with radio design`

#### AP-54 – Waffe als eigenes Sprite, Spielerin spiegelt, Laser (Design)

- **Meilenstein, Lane, Welle:** M2c · GAME · W2
- **Ziel:** Die Spielerin steht aufrecht und spiegelt sich nach links und rechts, die Strahlenpistole ist ein eigenes Sprite, das um die Hand kreist (360°). Der Laser startet an der Mündung. Laser, Ringe und Treffer-Blitz nutzen Tokens. `facingDeg` und die Logik bleiben unverändert.
- **Pflichtlektüre:** Brief (Grundsätze 1, 3, 7, 8, Zeile `Player.ts` der Tabelle, Zeilen `Laser.ts`/`LaserPool.ts` und „Schild-Ring, Feuerring“), `docs/design/mockups/{sprites,schrift-und-waffe,runde}.html` (Waffe, Ringe), `src/config/theme.ts`, `src/config/weaponMount.ts`, `src/logic/weaponMount.ts`, `src/platform/motion.ts` (AP-50), Ist-Stand der Dateien, §18 (Erkenntnisse AP-08, AP-31: API von `Player`, `LaserPool`; `AimInput`)
- **Abhängigkeiten:** AP-50, AP-51
- **Parallel möglich mit:** AP-52, AP-53 (keine gemeinsame Datei)
- **Dateien (Eigentum):** `src/entities/{Player,Laser,LaserPool,ArmourRing,ItemPickup,ArmourPickup}.ts`, `src/entities/enemies/Enemy.ts` (nur Treffer-Blitz und Aura-Farbe), `src/scenes/GameScene.ts` (nur die Übergabe der Waffen-Ausbaustufe an `PlayerConfig`), `tests/entities/ItemPickup.test.ts`
- **Nicht anfassen:** `src/scenes/{HudScene,ResultScene,MenuScene}.ts`, `src/scenes/hud/*`, `src/logic/*`, `src/config/*`, `src/contracts/*`, `docs/design/**`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `Player`: Die Figur dreht sich nicht mehr (kein `setRotation`), sie spiegelt sich per `flipX` bei Zielwinkel über 90° im Betrag (`faceLeft`). `facingDeg` und `stepRotation` bleiben unverändert. Neues Waffen-Sprite `weapon-raygun` als eigenes GameObject: Origin am Griff, Position am Handpunkt, Rotation gleich dem Zielwinkel, `flipY` beim Zielen nach links, Tiefe hinter der Figur bei −160° bis −20° (alles über die Funktionen aus `weaponMount.ts`). Frame aus der Ausbaustufe (Summe der Waffen-Upgrades 0–6, 7–13, 14–20).
  2. `PlayerConfig` bekommt `weaponStage` (0..2). `GameScene` berechnet sie mit `weaponStageForUpgrades` aus dem geladenen Spielstand und übergibt sie. Mehr ändert dieses Paket in der Szene nicht.
  3. Der Laser startet an der Mündung (`muzzlePoint`) statt bei `MUZZLE_OFFSET` (Konstante entfällt). Doppelschuss-Versätze aus AP-30 bleiben, sie beziehen sich auf die Mündung.
  4. `Laser`/`LaserPool`: Tint `game.laser-raygun`. `Player`: Schild-Ring `game.shield-ring`, Treffer-Tint aus einem passenden Token (gibt es keines, meldet der Coder es dem Lead und erfindet keinen Wert). `ArmourRing`: `game.fire-ring`, gestrichelt (Alpha und Tiefe wie bisher).
  5. `Enemy.ts`: Treffer als weißer Blitz von 120 ms (Grundsatz 8), die Aura-Farbe aus einem Token statt `0x9b59b6`.
  6. `ItemPickup`/`ArmourPickup`: Mit `prefersReducedMotion()` blinken liegende Items nicht (Grundsatz 7), die Restzeit bleibt über einen Umriss erkennbar. Der bestehende Test bleibt grün, Ergänzung für den Fall „reduziert“.
- **Schnittstellen:** nutzt `weaponMount`, `THEME`, `motion`, `weapon-raygun`. Die öffentliche API von `Player` bleibt (Callbacks, `facingDeg`, `takeDamage`), neu ist nur `PlayerConfig.weaponStage`.
- **Akzeptanzkriterien:**
  - Die Astronautin ist nie gedreht, die Waffe kreist in 360° um die Hand, Tiefe und Spiegeln stimmen in allen vier Richtungen (Sichtprüfung gegen `schrift-und-waffe.html`)
  - Der Laser trifft das Ziel in Zielrichtung wie bisher, Feuerrate, Schaden und Doppelschuss unverändert
  - Ausbaustufe 1/2/3 wechselt bei Summe 7 und 14
  - Keine Farb-Literale in den eigenen Dateien, Checks grün
- **Tests:** Die reinen Funktionen sind in AP-50 getestet. Hier nur `ItemPickup.test.ts` angepasst. Handtest-Liste im Bericht.
- **Review-Schwerpunkte:** Grundsätze 1, 3, 7, 8; Waffe wird beim Tod und bei „Nochmal“ aufgeräumt (kein Waffen-Sprite bleibt stehen); Schild-Reihenfolge und Pooling unverändert; Pause friert die Waffe nicht ein, sie folgt weiter dem Ziel
- **Doku-Pflichten:** –
- **Design-Review:** ja (`ma-designer`, Modus Review, zusätzlich zum normalen Review)
- **Aufwand:** M · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-54): add rotating raygun sprite and mirror the player`

#### AP-55 – Design-Abschluss: Lint-Regel gegen Farb-Literale, Restfunde, README

- **Meilenstein, Lane, Welle:** M2c · OPS · W3
- **Ziel:** Grundsatz 1 des Designs wird automatisch erzwungen: Keine `0x…`- und `#…`-Farbliterale und keine Systemschrift in `src/scenes/**` und `src/entities/**`. Restfunde werden behoben, die README nennt die neuen Skripte.
- **Pflichtlektüre:** Brief („Grundsätze“, Punkt 1), `eslint.config.js`, `README.md`, `src/config/theme.ts`
- **Abhängigkeiten:** AP-52, AP-53, AP-54, AP-57 (Reihenfolge wegen `eslint.config.js`, PE-62: der `docs/design/**`-Eintrag aus AP-57 bleibt erhalten)
- **Parallel möglich mit:** –
- **Dateien (Eigentum):** `eslint.config.js`, `README.md`, Restfunde in `src/scenes/**` und `src/entities/**` (nur das Ersetzen von Farb-Literalen durch Tokens), `docs/guides/*` (nur Verweise)
- **Nicht anfassen:** `docs/design/**`, `src/config/**`, `src/logic/**`, `package.json`
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. ESLint-Regel (`no-restricted-syntax` mit Selektoren auf Zeichenketten `#rrggbb` und Zahlenliterale `0xRRGGBB`, dazu `monospace`) für `src/scenes/**` und `src/entities/**`. `src/config/theme.ts` ist ausgenommen. Die Meldung nennt `src/config/theme.ts`.
  2. `npm run lint` zeigt dann alle Restfunde. Der Coder ersetzt sie durch Tokens. Fehlt ein passendes Token, meldet er es dem Lead (kein Wert erfunden) und lässt die Stelle mit einer begründeten Ausnahme stehen.
  3. README: Abschnitt „Design“ (Verweis auf `docs/design/`, Skripte `theme:build`, `fonts:build`, Regel „nur Tokens“).
- **Schnittstellen:** –
- **Akzeptanzkriterien:**
  - `npm run lint` meldet kein Farb-Literal in Szenen und Entities, die Regel schlägt bei einem absichtlichen Test-Literal an (manuell geprüft, nicht eingecheckt)
  - Checks grün
- **Tests:** –
- **Review-Schwerpunkte:** Regel ist nicht zu breit (keine Fehlalarme bei Hash-Konstanten), Ausnahmen begründet
- **Doku-Pflichten:** README
- **Design-Review:** nein
- **Aufwand:** S · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** ja (nur Restfunde ohne Regel; die Regel kann später folgen)
- **Commit-Typ:** `chore(AP-55): enforce theme tokens with a lint rule`

### M3 – Bosse

#### AP-16 – Boss-Rahmen

- **Meilenstein, Lane, Welle:** M3 · SH/LOG · W1
- **Ziel:** Alles Gemeinsame für Bosse:
  - Vertrag, Daten mit Varianten je Level, Logik für Bossphase und Angriffstakt
  - Basis-Entity mit Warnanzeigen
  - Platzhalter-Assets und Anleitungs-Zeilen

  Die drei Boss-Pakete bauen nur noch ihr Verhalten.
- **Pflichtlektüre:** PE-18, PE-31, PE-33, PE-34, `src/contracts/*`, `src/logic/{round,spawn}.ts`, `src/config/{levels,assets}.ts`, `docs/guides/*`
- **Abhängigkeiten:** M2c-DEP (PE-46: M3 startet nach M2b, damit Schild und Münzen von Anfang an gelten; PE-60: und nach dem Design-Umbau M2c, weil `config/assets.ts` und die Szenen sonst doppelt angefasst würden). Zusätzliche Pflichtlektüre aus dem Design: `src/config/theme.ts`, `docs/design/mockups/sprites.html` (Sprite-Regeln für die Boss-Platzhalter), Brief-Grundsätze 1 und 4. Telegraph-Farben (Warnrot `red.300`) nur aus `theme.ts`.
- **Parallel möglich mit:** –
- **Dateien (Eigentum):** `src/contracts/{boss,events,index}.ts`, `src/config/{bosses,levels,assets}.ts`, `src/logic/{boss,round,spawn}.ts`, `src/entities/bosses/{BossBase,Telegraph}.ts`, `public/assets/sprites/boss-*`, `public/assets/sounds/boss-*`, `public/assets/.placeholders.json`, `docs/guides/{grafik,sound}-austauschen.md`, zugehörige Tests unter `tests/`
- **Nicht anfassen:** `src/scenes/*`, `scripts/*`, übrige Entities
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. Vertrag `boss.ts`:
     - `BossId` (`rootMonster` | `forestGhost` | `giantStone`)
     - `BossAttackDef` mit `id`, `cooldownMs`, `telegraphMs`, `damage`, `extraOnly`
     - `BossDef` mit `id`, `baseHp`, `baseDamage`, `spriteKey`, `attacks`
     - `BossVariant` mit `hpMultiplier`, `damageMultiplier`, `tint`, `extraAttack`
     - Events `boss-warning`, `boss-spawned`, `boss-hp-changed`, `boss-defeated`
  2. `bosses.ts`: drei `BossDef` nach PE-34. `levels.ts`: `bossId` für alle 21 Level je Batch setzen.
  3. `logic/boss.ts`:
     - `variantForLevel(levelId)`:
       - Index im Batch, HP +15 % und Schaden +10 % je Index
       - Tönung je Index
       - `extraAttack` ab Index 2
     - `AttackScheduler`: wählt Angriffe nach Cooldown und liefert Warnzeit und Ausführungszeitpunkt. Rein und getestet.
  4. `round.ts`:
     - `requiresBossDefeat` wird `true`, wenn das Level einen `bossId` hat
     - Warnung bei 63 s Restzeit, Boss bei 60 s
     - nach Timer-Ende Zustand `bossFight`, Sieg erst mit `bossDefeated()`, Niederlage hat Vorrang
     - `spawn.ts`: Während des Bosses halbiert sich die Rate normaler Spawns.
  5. `BossBase`:
     - HP, sanftes Aufblinken (PE-31), Varianten-Tönung, Callbacks für HP und Tod
     - Hooks `onAttack(attackId)` für die Unterklassen
  6. `Telegraph`: wiederverwendbare Warnanzeigen (Kreis, Linie, Ring), die sich in `telegraphMs` füllen. Jeder Boss-Angriff wird vorher angezeigt (Fairness).
  7. Assets im Manifest ergänzen, danach `npm run assets:placeholders` und `npm run assets:check`:
     - Sprites: `boss-root-monster` 64×64 ×4, `boss-root-spike` 16×32 ×3, `boss-forest-ghost` 48×48 ×4, `boss-ghost-orb` 8×8 ×2, `boss-giant-stone` 64×64 ×4
     - Sounds: `boss-warning`, `boss-defeated`
     - Den Eintrag `boss-placeholder` entfernen und alle Verweise darauf anpassen
  8. Beide Anleitungen um die neuen Dateien ergänzen, im gleichen einfachen Stil.
- **Akzeptanzkriterien:**
  - Alle 21 Level haben einen passenden Boss
  - Varianten steigen monoton
  - Rundenregeln laut PE-18 sind getestet
  - Bisherige Tests bleiben grün
- **Tests:** `boss.test.ts` (Varianten, Scheduler); `round.test.ts` und `spawn.test.ts` erweitert (Bossphase, Timer-Ende mit lebendem Boss, Niederlage im Bosskampf); Config-Test für `bossId`
- **Review-Schwerpunkte:** Abwärtskompatibilität der Verträge, keine Szenenänderung, Fairness (Warnzeit ≥ 700 ms)
- **Doku-Pflichten:** Anleitungen ergänzen, `LICENSES.md` ergänzen
- **Aufwand:** L · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-16): add boss framework`

#### AP-17 – Boss Baummonster (Wald 0–4)

- **Meilenstein, Lane, Welle:** M3 · GAME · W2
- **Ziel:** Das verwurzelte Baummonster nach PE-34.
- **Pflichtlektüre:** PE-34 (Baummonster), PE-31, `src/entities/bosses/{BossBase,Telegraph}.ts`, `src/logic/boss.ts`, `src/config/bosses.ts`, `src/config/theme.ts` (keine Farb-Literale, Lint-Regel AP-55)
- **Abhängigkeiten:** AP-16
- **Parallel möglich mit:** AP-18, AP-19
- **Dateien (Eigentum):** `src/entities/bosses/{RootMonster,RootSpike}.ts`
- **Nicht anfassen:** alle anderen Dateien
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. Steht verwurzelt am Ring-Rand im Sichtfeld und bewegt sich nicht.
  2. Angriff „Wurzelstoß“: Warnkreis unter der Astronautin, nach der Warnzeit bricht `RootSpike` hervor.
  3. Angriff „Ruf des Waldes“: meldet über Callback 3–5 `cursedTree` zum Spawnen.
  4. Zusatzangriff (nur `extraAttack`): Ring aus Wurzeln mit einer sichtbaren Lücke.
- **Akzeptanzkriterien:**
  - Alle Angriffe angekündigt
  - Werte nur aus Config
  - Checks grün
- **Tests:** keine Phaser-Tests; fehlende reine Logik meldet der Coder (nicht selbst in `src/logic` ändern)
- **Review-Schwerpunkte:** Fairness, Lesbarkeit, Aufräumen der Spikes
- **Doku-Pflichten:** –
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-17): add root monster boss`

#### AP-18 – Boss Waldgeist (Wald bei Nacht 5–9)

- **Meilenstein, Lane, Welle:** M3 · GAME · W2
- **Ziel:** Der Waldgeist nach PE-34.
- **Pflichtlektüre:** PE-34 (Waldgeist), PE-31, `src/entities/bosses/{BossBase,Telegraph}.ts`, `src/logic/boss.ts`, `src/config/bosses.ts`, `src/config/theme.ts` (keine Farb-Literale, Lint-Regel AP-55)
- **Abhängigkeiten:** AP-16
- **Parallel möglich mit:** AP-17, AP-19
- **Dateien (Eigentum):** `src/entities/bosses/{ForestGhost,GhostOrb}.ts`
- **Nicht anfassen:** alle anderen Dateien
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. Schwebt auf einer Kreisbahn um die Mitte.
  2. Phasenweise halbtransparent und dann unverwundbar. Laser gehen durch, das ist deutlich sichtbar. Die Phase wird 1 s vorher angekündigt.
  3. Angriff „Geisterfächer“: Warnlinien, danach 5 `GhostOrb` im Fächer auf die Mitte.
  4. Zusatzangriff: teilt sich für einige Sekunden in 2 Trugbilder. Nur das echte nimmt Schaden, die Trugbilder schießen nicht.
- **Akzeptanzkriterien:**
  - Unverwundbarkeit klar erkennbar
  - Alle Angriffe angekündigt
  - Checks grün
- **Tests:** wie AP-17
- **Review-Schwerpunkte:** Fairness, Lesbarkeit bei Nacht-Hintergrund
- **Doku-Pflichten:** –
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** ja (Trugbilder weglassen)
- **Commit-Typ:** `feat(AP-18): add forest ghost boss`

#### AP-19 – Boss Riesen-Stein (Elfenwald 10–20)

- **Meilenstein, Lane, Welle:** M3 · GAME · W2
- **Ziel:** Der Riesen-Stein nach PE-34.
- **Pflichtlektüre:** PE-34 (Riesen-Stein), PE-31, `src/entities/bosses/{BossBase,Telegraph}.ts`, `src/logic/boss.ts`, `src/config/bosses.ts`, `src/config/theme.ts` (keine Farb-Literale, Lint-Regel AP-55)
- **Abhängigkeiten:** AP-16
- **Parallel möglich mit:** AP-17, AP-18
- **Dateien (Eigentum):** `src/entities/bosses/GiantStone.ts`
- **Nicht anfassen:** alle anderen Dateien
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. Angriff „Rollen“:
     - Eine Warnlinie zur Mitte erscheint.
     - Der Stein rollt los. Trifft er die Astronautin, gibt es Schaden, danach prallt er zurück an den Rand.
  2. Panzerung: Normal nimmt er halben Schaden. Kurz nach dem Aufprall nimmt er für ca. 2 s vollen Schaden, sichtbar durch Risse oder ein Aufleuchten.
  3. Zusatzangriff: Bei 50 % HP zerbricht er in 2 kleinere Steine.
     - Halbe Größe, gleiches Verhalten.
     - Der Boss gilt erst als besiegt, wenn beide kleinen Steine besiegt sind.
     - Die HP-Leiste zeigt die Summe.
- **Akzeptanzkriterien:**
  - Panzerphase gut erkennbar
  - Sieg erst nach allen Teilen
  - Checks grün
- **Tests:** wie AP-17
- **Review-Schwerpunkte:** Fairness, korrektes Sieg-Callback beim Zerbrechen
- **Doku-Pflichten:** –
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** ja (Zerbrechen weglassen)
- **Commit-Typ:** `feat(AP-19): add giant stone boss`

#### AP-20 – Boss-Einbindung

- **Meilenstein, Lane, Welle:** M3 · GAME · W3
- **Ziel:** Bosse im Spiel: Warnung, Erscheinen, Kollisionen, HP-Leiste, Sieg nach Boss, Ergebnis.
- **Pflichtlektüre:** PE-18, PE-31, PE-33, PE-34, `src/contracts/{boss,events}.ts`, `src/logic/{round,boss}.ts`, Boss-Entities aus AP-16 bis AP-19, Design: Brief-Grundsätze, `docs/design/mockups/runde.html` (Ansicht 3, Boss-Lebensleiste), `src/config/theme.ts`, `src/scenes/hud/{FunkPanel,FunkButton}.ts` (AP-53)
- **Design-Review:** ja (Boss-Lebensleiste, Timer-Label und Ergebnis sind sichtbare Oberfläche)
- **Abhängigkeiten:** AP-17, AP-18, AP-19
- **Parallel möglich mit:** –
- **Dateien (Eigentum):** `src/entities/bosses/createBoss.ts`, `src/scenes/{GameScene,HudScene,ResultScene}.ts`
- **Nicht anfassen:** `src/logic/*`, `src/config/*`, übrige Boss-Dateien
- **Freigegebene Abhängigkeiten:** keine
- **Umsetzung:**
  1. `createBoss(scene, bossId, variant)`: Fabrik für die drei Bosse.
  2. `GameScene`:
     - Bei `boss-warning` zeigt sie „Boss kommt!“ für 3 s und spielt `boss-warning`.
     - Bei Boss-Start erscheint der Boss aus einer zufälligen Richtung.
     - Kollisionen:
       - Laser ↔ Boss und Boss-Teile
       - Boss-Angriffe ↔ Spielerin
       - Spawn-Callbacks (Baummonster)
     - `bossDefeated` an `RoundState`, dazu der Sound `boss-defeated`.
  3. `HudScene`: Boss-HP-Leiste oben mit Namen (deutsch: „Verwurzeltes Baummonster“, „Waldgeist“, „Riesen-Stein“) im Funk-Stil nach `runde.html` 3 (Vorschlag des Designers für M3), mit `FunkPanel` aus AP-53, Farben nur aus `theme.ts`. Das Timer-Panel hat seit AP-53 den Zustand `setOvertime(on)` mit dem Label „BOSS!“. AP-20 schaltet ihn ein, sobald der Timer abgelaufen ist und der Boss lebt. Der Text des Labels ist „BOSS!“ laut Design (statt „Boss besiegen!“), vom Nutzer bestätigt am 2026-10-25 (Q-31).
  4. `ResultScene`: zeigt „Boss besiegt“.
- **Akzeptanzkriterien:**
  - Alle Smoke-Test-Punkte von M3-DEP
  - Keine doppelten Listener nach „Nochmal“
  - Checks grün
- **Tests:** keine Phaser-Tests; Handtest-Checkliste im Bericht
- **Review-Schwerpunkte:** Rundenende-Regeln, Aufräumen, Sound über `SoundService`
- **Doku-Pflichten:** –
- **Aufwand:** M · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-20): integrate bosses into game`

---

## 13. Menschliche Schritte

| ID | Schritt | Ab wann nötig | Blockiert | Erledigt |
|---|---|---|---|---|
| H-01 | Node.js 24 und npm vorhanden (geprüft: Node v24.21.0, npm 11.19.0) | sofort | AP-01 | ☑ |
| H-02 | Lizenzfrage für öffentliches Repo entscheiden (Q-12) | vor M2-DEP | – | ☑ (PE-27) |
| H-03 | iPhone im selben WLAN; Windows-Firewall erlaubt Node im privaten Netz (Abfrage beim ersten `npm run preview -- --host` mit „Zulassen“ bestätigen) | M2-DEP | M2-DEP | ☑ (PC und iPhone, 2026-10-25) |
| H-04 | Bosse beschreiben (Q-04); angenommenes Verhalten PE-34 vor M3-Freigabe prüfen | vor M3 | AP-16–AP-20 | ☑ Namen / ☐ PE-34 prüfen |
| H-05 | Optional: eigene Grafiken und Sounds nach den Anleitungen aus AP-07 austauschen | ab M1 | – | ☐ |
| H-06 | Abnahmen M0–M3 (Pull Requests und Smoke-Tests) | je Meilenstein | nächster Meilenstein | ☑ M0–M2b (2026-10-25) / ☐ M2c, M3 |
| H-07 | Freigabe Umfang, Verträge und Reihenfolge M2b: V-01 bis V-04 (in §16, inzwischen übernommen) | vor M2b | AP-25, AP-26 | ☑ (2026-10-24) |
| H-08 | Abnahme M2b: Smoke-Test am PC und auf dem iPhone (M2b-DEP) | nach M2b | M2c (AP-50, AP-51), danach M3 | ☑ (2026-10-25, PC und iPhone; Befunde in PE-61) |
| H-09 | Rüstungen klären: Q-19 (Katalog), Q-20 (Auslöser, Abklingzeit), Q-21 (Feuerring-Werte) beantworten | vor AP-37a | AP-37a, AP-37c | ☑ (Pilot PE-52, Katalog spätere Planung; Umsetzung PE-58) |
| H-10 | Freigabe Umfang: V-05 (Stick, §2 F-01) und V-06 (F-17 nach „Optional“, §2) entscheiden. Erst danach trägt der Planner die §2-Änderungen ein | vor AP-39 bzw. §2 | AP-39 | ☑ V-05 übernommen (2026-10-25), V-06 abgelehnt, F-17 bleibt Pflicht (PE-56) |
| H-11 | Reihenfolge bestätigen: Design-Umsetzung (M2c) nach M2b-DEP und vor M3 (PE-60) | vor M2c W1 | AP-50, AP-51 | ☑ (bestätigt 2026-10-25) |
| H-12 | Abnahme M2c: Smoke-Test am PC und auf dem iPhone (M2c-DEP), inklusive Lesbarkeit von Funk 1× und Kapsel 1× im Querformat | nach M2c | M3 (AP-16 ff.) | ☐ |
| H-13 | Optional: die 30 Platzhalter-Sprites (Astronautin, Gegner, Items, Bosse) nach `docs/design/mockups/sprites.html` und der Anleitung `docs/guides/grafik-austauschen.md` neu zeichnen. Reiner Dateiaustausch ohne Code. Kein Paket geplant (Brief, Reihenfolge-Empfehlung 5) | jederzeit nach M2c W1 | – | ☐ |

---

## 14. Budget und Kürzungen

| Meilenstein | Pakete | Agent-Aufwand | Geschätzte 5-h-Fenster bei 30 % Team-Budget |
|---|---|---|---|
| M0 | 4 | ≈ 4,5 h (+ Review ≈ 6 h) | ≈ 2–3 |
| M1 | 7 | ≈ 10 h (+ Review ≈ 13 h) | ≈ 4–5 |
| M2 | 5 | ≈ 6,75 h (+ Review ≈ 9 h) | ≈ 3–4 |
| M2b | 16 | ≈ 23,75 h (+ Review ≈ 30 h) | ≈ 11–12 |
| M2c | 6 | ≈ 11,25 h (+ Review inkl. 3 Design-Reviews ≈ 15 h) | ≈ 5–6 (bei 45 % Zielwert ≈ 4) |
| M3 | 5 | ≈ 8,5 h (+ Review ≈ 11 h) | ≈ 4–5 |
| **Gesamt** | **43** | **≈ 65 h (+ Review ≈ 84 h)** | **≈ 29–35** |

Annahme (angenommen): Bei 30 % des 5-Stunden-Limits schafft das Team pro Fenster etwa 2,5 h Paketarbeit inklusive Review. Der Wert wird nach M0 mit echten Zahlen nachgeschärft (§18). Die Summe aus den Einzelzeilen ergibt 24–29 Fenster. Die M2b-Zeile enthält AP-38 und AP-39 (je M, ca. 1,5 h Agent-Zeit, angenommen) sowie die Rüstungspakete AP-37a und AP-37c (je M, ca. 1,5 h, angenommen). Die Einbindung der Rüstung in AP-33 und die Anzeige in AP-34 sind im bisherigen Aufwand dieser Pakete enthalten, das Risiko steht in RI-16. Der Katalog weiterer Rüstungen ist nicht enthalten, er wird nach Klärung geschätzt. Optionale Kürzung K8 (Ring ohne Pulsieren, AP-37c) spart ca. 0,3 h. Die Fensterzahlen oben gelten noch für 30 % Zielwert. Bei 45 % sinkt die Zahl rechnerisch auf etwa zwei Drittel, Neuberechnung nach M2b-DEP (§18). Die M2c-Zeile (PE-59) enthält AP-50 und AP-54 (je M, ca. 1,5 h), AP-51, AP-52 und AP-53 (je L, ca. 2,5 h) und AP-55 (S, ca. 0,75 h), alle angenommen. Dazu kommen drei Design-Reviews durch `ma-designer`, deren Kosten als Review-Zuschlag gerechnet sind. Optional sind die Pakete AP-55 (Regel kann später folgen) und H-13 (Sprites, Mensch). Das Risiko steht in RI-17.

**Zeit des Nutzers:** Abnahmen und Smoke-Tests ≈ 0,5–1 h je Meilenstein, Freigaben pro Meilenstein, Boss-Beschreibung (Q-04), optional Grafik und Sound. Zusammen ≈ 4–6 h ohne Grafik.

**Ehrliche Einschätzung:**
- **Das Budget ist der Engpass, nicht die Zahl der Coder.** 3 parallele Coder erreichen den 30-%-Zielwert schneller, danach pausiert das Team bis zum nächsten Fenster.
- **Dauer:** Realistisch sind M0–M2 in etwa 9–12 Fenstern, also über mehrere Tage verteilt.
- **M3:** Mit drei Bossen in Varianten (PE-33) ist der Aufwand überschaubar. Das Boss-Verhalten ist angenommen (PE-34). Ändert der Nutzer es stark, wird AP-17 bis AP-19 neu geschätzt.

| Stufe | Kürzung | Ersparnis | Betroffene Pakete |
|---|---|---|---|
| K1 | Balancing nur als Kennzahlen-Tabelle, ohne Monotonie-Tests | ≈ 0,5 h | AP-15 |
| K2 | Maps ohne Partikel | ≈ 0,3 h | AP-12 |
| K3 | AP-10 mit sonnet statt opus | Budget pro Stunde deutlich geringer, höheres Risiko für Nachbesserung | AP-10 |
| K4 | Zusatzangriffe der Bosse weglassen (Trugbilder, Zerbrechen, Wurzelring) | ≈ 1–1,5 h | AP-17–AP-19 |
| K5 | Doppelschuss nur Stufe 1 (zwei Laser), keine Fächer-Stufe 2 | ≈ 0,3 h | AP-30, AP-31 |
| K6 | Dauerfeuer weglassen (dann entfällt auch die Obergrenze 20 Schuss/s, Q-16) | ≈ 0,5 h | AP-27, AP-30, AP-34 |
| K7 | Neu-Balancing nur als Kennzahltabelle, ohne Zielwert-Tests | ≈ 0,5 h | AP-35 |
| K8 | Feuerring ohne Pulsieren, nur statische Linie (Rüstung bleibt Pflicht, F-17) | ≈ 0,3 h | AP-37c |
| K9 | AP-55 nur als Restfunde-Bereinigung ohne ESLint-Regel (Grundsatz 1 prüft dann nur das Review) | ≈ 0,3 h | AP-55 |
| nie | Sicherheit, Datenschutz, robustes Laden, Asset-Lizenzen, Designer-Anleitungen | – | – |

---

## 15. Risiken

| # | Risiko | Gegenmaßnahme | Betroffene Pakete |
|---|---|---|---|
| RI-1 | Parallele Pakete ändern dieselbe Datei | Eigentum §8, Prüfung durch den Lead | alle |
| RI-2 | Vertrag aus derselben Welle wird genutzt | Verträge eine Welle früher | Vertragsnutzer |
| RI-3 | Budget reicht nicht für die geplante Parallelität | Parallelität §7.2, Kürzungen §14 | alle |
| RI-4 | Prompt-Injection über Abhängigkeiten, Doku oder Daten | Wächter, Review-Punkt „Verdächtige Inhalte“, nur freigegebene Abhängigkeiten | alle |
| RI-5 | iPhone-Safari: Ton erst nach Antippen, kein Service Worker über `http://`, Eigenheiten der Homescreen-App | AP-13/AP-14 behandeln es ausdrücklich; Test auf dem iPhone in M2-DEP | AP-13, AP-14 |
| RI-6 | Leistung auf dem Handy bei vielen Gegnern | Pools, `maxEnemies` in Config, `?fps=1`, Partikel sparsam | AP-08–AP-12 |
| RI-7 | Platzhalter-Grafik macht das Spiel weniger reizvoll, bis echte Sprites da sind | Anleitungen schon in M1 (AP-07), Austausch ohne Code | AP-02, AP-07 |
| RI-8 | Öffentliches Repo: versehentlich Secrets oder fremde Assets veröffentlicht | PE-26, Review-Punkt, `LICENSES.md`, keine Secrets nötig | alle |
| RI-9 | Boss-Verhalten ist vom Planner angenommen (PE-34) und trifft evtl. nicht die Vorstellung des Nutzers | Nutzer prüft PE-34 vor M3-Freigabe; Kürzung K4 | AP-16–AP-20 |
| RI-10 | Phaser 3 ist nicht die neueste Hauptversion | bewusst festgelegt (PE-11), Version im Lockfile fixiert; Umstieg nur als eigene Entscheidung | AP-01 |
| RI-11 | Gemeinsame Szenendateien werden in mehreren Wellen geändert | Eigentum je Welle in §8 festgelegt, Merge-Reihenfolge | AP-10, AP-12, AP-14 |
| RI-12 | Schild und Dauerfeuer greifen in Schadens- und Feuerpfad, Fehler wirken in allen Szenen | Schaden läuft nur über `Player.takeDamage` und `absorbDamage`, Zeiten über `playTimeMs`; Handtest mit Boss-Vorbereitung, Tests in AP-30 | AP-30, AP-31, AP-33 |
| RI-13 | Gold-Kurve trifft das Ziel nicht (zu viel oder zu wenig Gold, Upgrades zu schnell oder zu langsam) | Kennzahl-Tabelle und Zielwert-Test in AP-35, nur Config; Nutzer prüft nach M2b-DEP | AP-35 |
| RI-14 | Rüstungen (PE-47) erweitern den Umfang, bevor der Katalog feststeht (Scope Creep) | Pilot Feuerring fest (PE-52), Katalog weiterer Rüstungen offen. Nur Daten (`ArmourDef` in Config, PE-58), kein Katalog in M2b. Weitere Rüstungen erst nach Klärung in der Planung | AP-37a, AP-37c |
| RI-15 | Touch-Stick: Multi-Touch-Konflikte mit der Pause-Taste, Fehlklicks am Bildschirmrand, Safari-Vollbild ändert die Höhe beim Drehen | Eigener Pointer je Stick, Winkelfunktion als reine Funktion getestet, Handtest auf dem iPhone in M2b-DEP | AP-38, AP-39 |
| RI-17 | Design-Umbau (M2c) berührt fast alle Szenen und Entities. Fehler könnten Funktion brechen, Pakete sind mit L groß, und Schrift (Bitmap), Waffen-Sprite und Lesbarkeit auf dem iPhone sind noch nie am Gerät geprüft | Logik bleibt unverändert, reine Funktionen für die Waffe mit Tests (AP-50), Szenen in drei getrennten Paketen mit Design-Review, Lint-Regel AP-55, Handtest-Punkt „Funktion unverändert“ in M2c-DEP, Fix-Reserve für Schrift 2× | AP-50–AP-55 |
| RI-16 | AP-33 wird groß (opus, L): Spielszene, Drop, Pickup und Ringschaden in einem Paket, dazu das Rundenende. Ein Fehler in der Szene trifft alle Runden | Feuerring-Logik ist in AP-37a getestet, AP-33 verdrahtet nur. Review-Punkt Rundenende-Reihenfolge. Falls AP-33 zu groß wird, ist eine Aufteilung nur mit Freigabe des Nutzers möglich, weil PE-58 die Einbindung spätestens in W5 verlangt | AP-33, AP-37a, AP-37c |

---

## 16. Planungsentscheidungen und offene Fragen

### Planungsentscheidungen

| ID | Entscheidung | Begründung | Quelle |
|---|---|---|---|
| PE-01 | Kommerzialisierung später möglich (App Store), nicht im ersten Stich | Wunsch „im besten Fall App Store“ | Nutzer (`idee.txt`), 2026-10-23 |
| PE-02 | Erster Stich nur lokal: keine Veröffentlichung, kein Login, keine Server-DB | „Fokus ist erstmal, dass alles lokal geht“ | Nutzer (`idee.txt`), 2026-10-23 |
| PE-03 | Steuerung per Maus und Touch: Zeigen gibt die Zielrichtung vor, die Pistole schießt immer in Blickrichtung | Antwort 1 | Nutzer am 2026-10-23 |
| PE-04 | Drehung in beide Richtungen, aber mit begrenzter Drehgeschwindigkeit (kein sofortiger Sprung). Startwert 270°/s (angenommen), als Konstante einstellbar | Antwort 1, Wert vom Planner | Nutzer am 2026-10-23 / Wert angenommen vom Planner |
| PE-05 | Rundendauer: erste Hälfte 3 min, zweite Hälfte 5 min, bei ungerader Anzahl wird die erste Hälfte aufgerundet | Antwort 2 | Nutzer am 2026-10-23 |
| PE-06 | Im ersten Stich nur die Startwaffe Laserpistole, keine Waffenauswahl | Antwort 3 | Nutzer am 2026-10-23 |
| PE-07 | Jedes Level hat einen Boss | Antwort 4 | Nutzer am 2026-10-23 |
| PE-08 | Die Astronautin läuft nicht, sie steht fest in der Mitte und dreht sich nur | Q-01, Antwort 1a | Nutzer am 2026-10-23 |
| PE-09 | „Erste Hälfte“ bezieht sich auf die Level eines Batches | Q-03, Antwort 2a | Nutzer am 2026-10-23 |
| PE-10 | Batch-Grenzen: Wald 0–4, Wald bei Nacht 5–9, Elfenwald 10–20 | Q-05, Antwort 3a | Nutzer am 2026-10-23 |
| PE-11 | Tech-Stack: Phaser 3 + TypeScript + Vite, Handy über Capacitor | Antwort 4a | Nutzer am 2026-10-23 |
| PE-12 | Waffen-Upgrades kommen als zufällige Item-Drops von Gegnern, keine Erfahrungskristalle und keine Auswahl | Q-06, Antwort 2 | Nutzer am 2026-10-23 |
| PE-13 | Spielerlevel wird nur angezeigt. Rüstungen und Power-ups kommen im nächsten Stich, Level werden nacheinander freigeschaltet | Q-06, Antwort 3a | Nutzer am 2026-10-23 |
| PE-14 | iPhone im ersten Stich per PWA über das lokale WLAN, Capacitor/native iOS-App später | Q-07, Antwort 1a (alter Mac) | Nutzer am 2026-10-23 |
| PE-15 | Höchstens 3 Coder parallel, Freigabe pro Meilenstein (Lead arbeitet autonom bis zum freigegebenen Meilenstein) | Antwort 4 | Nutzer am 2026-10-23 |
| PE-16 | Items werden durch Anschießen eingesammelt. Wirkung bis Rundenende, Stapel bis 5, Drop ca. 8 %, Verfall nach 10 s | Q-08, Antwort 1b; Zahlenwerte angenommen vom Planner | Nutzer am 2026-10-23 / Werte angenommen |
| PE-17 | 100 HP, bei 0 HP Niederlage mit anteiliger Erfahrung, Heilung nur als seltenes Item | Antwort 2a | Nutzer am 2026-10-23 |
| PE-18 | Boss erscheint in der letzten Minute, die Runde endet erst mit seinem Sieg. Boss-Pakete bilden einen eigenen, späteren Meilenstein | Antwort 3a | Nutzer am 2026-10-23 |
| PE-19 | Kein Termin | Antwort 4a | Nutzer am 2026-10-23 |
| PE-20 | GitHub-Remote `origin` vorhanden, `stage` = Teststand auf PC und iPhone, `master` = abgenommener Stand | Antwort 4b, 4c | Nutzer am 2026-10-23 |
| PE-21 | Architektur §4: Daten in `src/config`, reine Logik in `src/logic` ohne Phaser, Verträge in `src/contracts` | Entwurf, bestätigt | Nutzer am 2026-10-23 |
| PE-22 | Sicherheit §5: keine personenbezogenen Daten, kein Tracking, keine öffentliche Seite → R3 erst vor einer Veröffentlichung | Entwurf, bestätigt | Nutzer am 2026-10-23 |
| PE-23 | Grafik: Agents bauen Platzhalter-Sprites und eine Sprite-Liste. Dazu kommt eine Anleitung `docs/guides/grafik-austauschen.md` für Grafikdesigner ohne Programmierkenntnisse: Schritt für Schritt, Dateiformat, Größen, Frames, Dateinamen | Antwort 1a + Wunsch Anleitung | Nutzer am 2026-10-23 |
| PE-24 | Sound: nur Platzhalter-Effekte, keine Musik. Der Nutzer ersetzt die Sounds selbst; Anleitung `docs/guides/sound-austauschen.md` wie bei der Grafik. Stummschalt-Taste | Antwort 3 | Nutzer am 2026-10-23 |
| PE-25 | Querformat, im Hochformat Hinweis „bitte drehen“ | Q-10, Antwort 2 | Nutzer am 2026-10-23 |
| PE-27 | Keine Open-Source-Lizenz: keine `LICENSE`-Datei, README-Hinweis „© Cem Dogan, alle Rechte vorbehalten“ (in AP-01) | Q-12, Antwort 3a | Nutzer am 2026-10-23 |
| PE-28 | Zuschnitt M0 (AP-01–AP-04) bestätigt | Antwort 1 | Nutzer am 2026-10-23 |
| PE-29 | Pause-Taste und automatische Pause, wenn die App in den Hintergrund geht | wichtig auf dem Handy | Nutzer am 2026-10-23 |
| PE-32 | Zuschnitt M2 (AP-11–AP-15) bestätigt | Antwort 1 | Nutzer am 2026-10-23 |
| PE-33 | Ein Boss pro Batch mit Varianten je Level: Wald = verwurzeltes Baummonster, Wald bei Nacht = Waldgeist, Elfenwald = Riesen-Stein. Varianten: HP und Schaden steigen pro Level im Batch, Tönung verändert sich, ab dem 3. Level des Batches kommt ein Zusatzangriff dazu | Antwort 2a + Boss-Beschreibung; Variantenregel vom Planner | Nutzer am 2026-10-23 / Variantenregel angenommen |
| PE-34 | Boss-Verhalten (angenommen vom Planner, Nutzer kann ändern). **Baummonster:** steht verwurzelt, bewegt sich nicht; Wurzeln brechen nach 1 s Warnmarkierung unter der Astronautin hervor; ruft verfluchte Bäume herbei; Zusatzangriff: Ring aus Wurzeln. **Waldgeist:** schwebt im Kreis um die Mitte, wird zeitweise halbtransparent und dann unverwundbar; schießt Geisterkugeln im Fächer; Zusatzangriff: teilt sich kurz in 2 Trugbilder. **Riesen-Stein:** rollt nach einer Warnlinie auf die Mitte zu und prallt zurück; nimmt nur halben Schaden, außer kurz nach dem Aufprall; Zusatzangriff: zerbricht bei 50 % HP in 2 kleinere Steine | Boss-Beschreibung, Details vom Planner | angenommen vom Planner |
| PE-30 | Zuschnitt M1 (AP-05–AP-10) bestätigt | Antwort 1 | Nutzer am 2026-10-23 |
| PE-31 | Treffer-Feedback: nur sanftes, angenehmes Aufblinken; kein Bildschirmwackeln, keine Schadenszahlen | Antwort 3 | Nutzer am 2026-10-23 |
| PE-26 | Repository ist öffentlich. Folge: niemals Secrets, keine fremden Assets ohne Lizenz, Plan und Idee sind öffentlich lesbar | Antwort 4 | Nutzer am 2026-10-23 |
| PE-35 | `highestUnlockedLevel` ist der Index des höchsten freigeschalteten Levels. Startwert 0 (nur Level 0 frei), Bereich 0..20 (`LEVEL_COUNT - 1`). Sieg in Level n schaltet `min(20, n+1)` frei. Der Fehler aus AP-04 (Standard 1, Bereich 1..1000) wird in AP-21 behoben. Kein Migrationsbedarf, da nichts ausgeliefert ist | Detailfrage ohne Auswirkung auf Sicherheit oder Umfang, Entscheidung des Leads (Wellenabschluss M1 W1) | Lead am 2026-10-23 |
| PE-37 | Spieler-Laser zerstören gegnerische Geschosse (Wald-Hexe, später Boss-Geschosse). Der Laser verschwindet dabei ebenfalls, kein Durchschlag: ein Laser trifft genau ein Ziel (AP-24) | Auftrag Lead, Umfang aus Nutzer-Freigabe; Regel „Laser verschwindet, kein Durchschlag“ angenommen | Nutzer am 2026-10-24 (Paket), Regel (angenommen) |
| PE-38 | Balancing-Nachbesserung nach Nutzer-Handtest (AP-23): Ab Level 5 kippt das Spiel, Level 12 ist zu schwer. Gegner ab Level 5 langsamer (Zombie-Eichhörnchen, Verfluchter Baum), Feuerrate der Startwaffe erhöhen, Kurve 5–20 glätten. Level 0–4 bleiben in den Spawn-Werten. Richtwerte Feuerrate 3 → 4/s und Zombie-Eichhörnchen 110 → 80 px/s (angenommen). Verfluchter Baum ab Level 5: offen, siehe §16 Vorschläge | Befund Nutzer-Handtest am 2026-10-24, Richtwerte angenommen vom Planner | Nutzer am 2026-10-24 (Befund und Freigabe), Werte (angenommen) |
| PE-36 | Überholt durch PE-49 (Q-13). Debug-Direktstart `?level=n` (AP-22): Der Start führt direkt in `GameScene` mit dem Level und schreibt den Spielstand nicht. Der Freischaltstand spielt dabei keine Rolle. Runden mit Debug-Level werden wie jede Runde gespeichert (Erfahrung, Freischaltung nur steigend). Ein Debug-Sieg kann höhere Level freischalten. Das ist akzeptiert, weil `GameScene` unverändert bleibt. Eine Sperre für Debug-Runden braucht `GameScene` im Paket, siehe Q-13 | Befund Nutzer-Handtest (M1-DEP); Umgang mit dem Spielstand vom Planner angenommen | Lead am 2026-10-24 (Pflege), Detail angenommen vom Planner |
| PE-39 | Währung sind Gold-Münzen. Jeder Gegner lässt mit 5 % Chance eine Münze fallen (`COIN_RULES`). Stärkere Gegner geben mehr Gold (Münzwert je Gegner), ab Wert 5 erscheint eine größere Münze. Münzen fliegen automatisch zur Astronautin, ohne Lebensdauer, Laser gehen durch Münzen | Antwort Nutzer zu Gold-Münzen; Magnet-Reichweite über das Spielfeld, keine Lebensdauer und Durchgang der Laser bestätigt (Q-17) | Nutzer am 2026-10-24 (Q-17 bestätigt) |
| PE-40 | Gold aus einer Runde: Sieg behält 100 %, Niederlage 50 % (abgerundet). Die Gutschrift erfolgt am Rundenende in demselben Speichervorgang wie das Rundenergebnis | Vorschlag Planner zu 50 % vom Nutzer bestätigt („dein Vorschlag ist gut“); 100 % bei Sieg bestätigt (Q-18) | Nutzer am 2026-10-24 (Q-18 bestätigt) |
| PE-41 | Dauerhafte Upgrades auf zwei Spuren: Waffe (Feuerrate, Schaden) und Spielerin (max. HP, Drehgeschwindigkeit), je 10 Stufen, Preis steigt mit jeder Stufe. Richtwerte: Feuerrate und Schaden je +10 % pro Stufe, max. HP +10 pro Stufe, Drehgeschwindigkeit +15 °/s pro Stufe. Preis Stufe k → k+1 = round(10 × 1,4^k), Summe je Spur 698, alle vier zusammen ca. 2 800 Gold. Ziel: Stufe 10 nach ca. 15–20 Spiel-Leveln (Q-15 bestätigt). Kauf im Hauptmenü über „Upgrade“. Reset löscht Gold und Upgrades | Antworten Nutzer zu Spuren, Stufen, Preisanstieg, Ziel und Reset; Zahlenwerte und Preisformel angenommen | Nutzer am 2026-10-24, Zahlen (angenommen) |
| PE-42 | Items wirken weiter nur in der Runde (F-07, PE-12, PE-16). Die bisherigen Waffen-Items (Feuerrate, Schaden, Größe) werden ersetzt durch Doppelschuss, Schild (Schadens-Puffer) und Dauerfeuer (Feuerrate für einige Sekunden). Heilung bleibt als seltenes Item. Die Änderung an F-07 ist freigegeben (H-07, 2026-10-24) | Antwort Nutzer zu Items in der Runde; Heilung bleibt bestätigt (Q-18) | Nutzer am 2026-10-24 (Q-18 bestätigt) |
| PE-43 | Richtwerte Items (angenommen): Doppelschuss 2 Stufen (Stufe 1 zwei Laser versetzt um ±4 px, Stufe 2 drei Laser im Fächer ±8°). Schild 60 Schadenspunkte je Stufe, max. 3 Stufen (180), ist der Puffer aufgebraucht, ist er kaputt. Dauerfeuer 5 s, neue Aufnahme setzt die Zeit neu. Feuerrate im Dauerfeuer auf 20 Schuss/s begrenzt (technische Obergrenze statt „unendlich“, Q-16 bestätigt). Drop-Gewichte 30/30/30/10 (Doppelschuss, Schild, Dauerfeuer, Heilung) | Planner-Vorschlag | Planner (angenommen) |
| PE-44 | Spielstand Version 2 mit `gold` und `upgrades`. Version 1 bleibt ohne Verlust lesbar (Gold 0, Stufen 0). Ungültige Gold- oder Stufenwerte werden nur auf 0 gesetzt, der übrige Fortschritt bleibt. Keine neuen personenbezogenen Daten (R2) | Robustes Laden nach §5, Ergänzung zu PE-35 | Planner (angenommen, §5) |
| PE-45 | Upgrade-Auswahl als Overlay im Hauptmenü, keine neue Szene, keine Änderung an `src/main.ts` | Vermeidet Änderungen am Startpfad, Planner-Vorschlag | Planner (angenommen) |
| PE-46 | M2b liegt zwischen M2-DEP und M3. M3 startet erst nach M2b-DEP, weil Schild und Münzen alle Schadens- und Einsammelpfade betreffen, bevor die Bosse sie nutzen. Folge: M3 verschiebt sich um ca. 8–9 Fenster | Abhängigkeit der Schadens- und Einsammelpfade, Planner-Vorschlag, freigegeben (V-04) | Planner (Vorschlag), Nutzer am 2026-10-24 freigegeben (H-07) |
| PE-47 | Rüstungen als eigene Kategorie mit passiven, zeitlich begrenzten Effekten, z. B. ein Feuerring um die Spielerin für 5 s. Auslöser: Aktivierung durch Einsammeln, Wirkung beginnt sofort. Abklingzeit: 20 s nach Ende. Werte Feuerring: Radius 72 px, Schaden 20 je Sekunde an Gegnern im Ring, Dauer 5 s, nur in der Runde (Q-21). Pilot ist der Feuerring, weitere Rüstungen sind spätere Planung (Q-19). AP-37 bleibt Platzhalter | Ergänzung Nutzer zu Q-14; Auslöser, Abklingzeit und Werte bestätigt (Q-19 bis Q-21) | Nutzer am 2026-10-24 (Idee und Antworten Q-19 bis Q-21) |
| PE-48 | Verfluchter Baum (`cursedTree`) bleibt unverändert, auch ab Level 5 (Option c aus den Vorschlägen). Die Tempo-Senkung ab Level 5 trifft nur das Zombie-Eichhörnchen, das erst ab Level 5 erscheint (F-04). Eine Tempo-Senkung nur für den Baum bräuchte eine Änderung in Entities und Szene und ist nicht umgesetzt | Entscheidung zum Vorschlag Baum-Tempo (AP-23-Befund, PE-38) | Nutzer am 2026-10-24 |
| PE-49 | Debug-Runden (`?level=n`) schreiben keinen Spielstand: keine Erfahrung, keine Freischaltung, kein Gold. Der Direktstart bleibt ohne Speichern. Umsetzung in AP-33 (Rundenende, Debug-Kennzeichen in den Szenendaten), statt eines eigenen Folgepakets. Ersetzt PE-36. Gold-Einschluss ist die Folge der Empfehlung (angenommen) | Empfehlung Q-13 („Ja“, Folgepaket mit GameScene) | Nutzer am 2026-10-24 (Q-13 „alles wie vorgeschlagen“) |
| PE-50 | Stufe 10 der Upgrades bezieht sich auf das Spiel-Level (0–20), nicht auf das Spielerlevel. Richtwert: Stufe 10 nach etwa 15–20 Spiel-Leveln | Empfehlung Q-15 | Nutzer am 2026-10-24 |
| PE-51 | Dauerfeuer ist auf 20 Schuss/s begrenzt (`RAPID_FIRE_MAX_PER_SEC`), statt „unendlich“ | Empfehlung Q-16 | Nutzer am 2026-10-24 |
| PE-52 | Rüstungs-Pilot ist nur der Feuerring: 5 s, Radius 72 px, 20 Schaden je Sekunde, Aktivierung durch Einsammeln, 20 s Abklingzeit nach Ende, nur in der Runde, nicht im Menü. Der Katalog weiterer Rüstungen ist spätere Planung. Umsetzung in AP-37a und AP-37c (PE-58) | Q-19 bis Q-21 | Nutzer am 2026-10-24 |
| PE-53 | Freigabe M2b: F-07 neu, F-15 bis F-17 und Backlog „Später“ in §2, Datenmodell in §4, M2b vor M3 (PE-46). V-01 bis V-04 sind übernommen und aus §16 entfernt | H-07 | Nutzer am 2026-10-24 |
| PE-54 | Befunde iPhone-Test (M2, 2026-10-25): Spielfeld größer als der sichtbare Bereich, Astronautin nicht mittig, HUD-Item-Stacks zu klein. Fix als AP-38 in M2b W1. Keine Umfangsänderung, es ist eine Fehlerbehebung zu F-10 und F-14 | Befund Nutzer-Test am iPhone, über Lead | Nutzer am 2026-10-25 |
| PE-55 | Virtueller Stick auf Touch-Geräten im Querformat unten rechts für 360°-Zielen (Stick-Richtung ist die Zielrichtung). Erscheint nur bei Touch, nicht am PC. Verzögerte Drehung und Auto-Schuss bleiben. Die bestehende Touch-Steuerung (Tippen auf das Spielfeld, Astronautin dreht dorthin) bleibt zusätzlich erhalten. Priorität: Stick vor Tippen und Maus. Solange der Stick gehalten wird, ist Tippen und Mauszielen gesperrt (die Maus-Zielrichtung wird ignoriert). Tippt während des Haltens ein zweiter Finger auf das Feld, wird der Tipp ignoriert. Nach dem Loslassen gilt wieder Touch bzw. Maus. Startwerte: Durchmesser 140 px, Knopf 56 px, Rand 24 px, Totzone 15 %. Umfang in §2 F-01 übernommen (V-05 freigegeben 2026-10-25), AP-39 wartet nur noch auf AP-38 | Befund Nutzer-Test (Stick-Wunsch), Präzisierung Nutzer (Priorität) | Nutzer am 2026-10-25 (Befund, Präzisierung und Freigabe V-05); Startwerte (angenommen) |
| PE-56 | F-17 Rüstungen (Pilot Feuerring) bleiben Pflicht. Der Vorschlag, F-17 nach „Optional“ zu verschieben (V-06), ist abgelehnt. Der Katalog weiterer Rüstungen ist spätere Planung, der Pilot bleibt wie in PE-52 | Lead-Auftrag 2026-10-25 (V-06) | Nutzer am 2026-10-25 (V-06 abgelehnt) |
| PE-57 | Feuerring-Regeln: Drop-Chance 2 % je besiegtem Gegner (Richtwert). Eingesammelt wird das Pickup durch Anschießen wie ein Item. Es verfällt nach `ITEM_RULES.lifetimeMs`. Aufnahme während aktiver Rüstung oder Abklingzeit wirkt nicht. Die Zeit ist die pausierbare Spielzeit (PE-29). Der Ring fügt Gegnern im Radius Schaden über den bestehenden Todespfad zu. Eigener Zustand `ActiveArmour`, getrennt von `ActivePowers`. Bosse nehmen in M2b keinen Ringschaden. Bosse ab M3 nur nach Entscheidung mit PE-34 (Q-23) | Umsetzung der Regeln aus PE-47 und PE-52, Planer-Vorschlag, bestätigt (Q-23) | Nutzer am 2026-10-25 (Q-23) |
| PE-58 | Rüstungs-Priorität: Der Feuerring kommt zeitnah in M2b. AP-37a (W3, Vertrag, Config, Logik), AP-37c (W4, Entity, Pickup-Sprite), Anzeige in AP-34 (W4), Einbindung in AP-33 (W5). AP-32 wird dafür nach W5 verschoben. Weitere Rüstungen sind später reine Daten in `src/config/armour.ts` | Nutzer-Auftrag Priorität, Konflikt Wellenlimit (max. drei Pakete je Welle, PE-15) | Nutzer am 2026-10-25 |
| PE-59 | Design übernommen (Brief vom 2026-10-25, Status `freigegeben`, Richtung „Außen die Spielkassette, innen das Funkgerät im Anzug“). Umsetzung als Meilenstein M2c mit AP-50 bis AP-55: Tokens als `src/config/theme.ts` (erzeugt aus `tokens.resolved.json`), eigene Bitmap-Schriften Astro Kapsel und Astro Funk, Menü im Kassetten-Stil, Runde im Funk-Stil, Waffe als eigenes kreisendes Sprite mit drei Ausbaustufen, Lint-Regel „nur Tokens“. Keine neuen Abhängigkeiten, Spiellogik unverändert. Angenommen im Brief: Laserfarbe Korallenrosa, „s“ bei Sekunden, Logo-Schriftzug, kein Fließtext-Font. Kein Impressum nötig (R3 erst bei Veröffentlichung, Brief) | Lead-Auftrag „Design übernehmen“, Übergabe im Brief | Nutzer (Design freigegeben am 2026-10-25), Paketschnitt Planner |
| PE-60 | (bestätigt 2026-10-25, H-11) Reihenfolge: M2c (Design) läuft nach M2b-DEP und vor M3. Gründe: M2b-DEP prüft Funktion und Passform, nicht Optik, und findet Fehler noch in der alten Optik. Die Design-Pakete besitzen `HudScene`, `ResultScene`, `config/assets.ts` und `Player.ts`, M3 besitzt dieselben Dateien (AP-16, AP-20), das Design muss deshalb vorher fertig sein. AP-16 hängt von M2c-DEP ab. M2b-DEP-Checkliste unverändert, nur mit Hinweis | Planner-Empfehlung, Nutzer bestätigt am 2026-10-25 (H-11) | Nutzer (bestätigt) |
| PE-61 | Handtest M2b-DEP (PC und iPhone) am 2026-10-25 abgenommen, fünf Befunde: (a) Stick auf dem Handy etwa 10 % zu groß, (b) grauer Kasten hinter den Power-up-Anzeigen im HUD, (c) die ersten Level sind zu einfach, (d) jede Runde soll mit spawnenden Gegnern beginnen, nicht mit leerem Feld, (e) der Baum stirbt mit einem Laser. Umsetzung: (a) und (b) als Akzeptanzkriterien in AP-53 (M2c W2), weil AP-53 `VirtualStick.ts` und `HudScene.ts` ohnehin neu baut, kein separates Vorab-Paket (Begründung in §18). (c) bis (e) als M2b-Nachtrag AP-56 vor M2c W1 (Balancing und Rundenstart, Dateien ohne Überschneidung mit AP-50/AP-51). Umfang §2 unverändert (Fehlerbehebung und Balancing). Stick-Größe: Das Design gibt `size.stick` 88 px vor (heute 140 px, also deutlich mehr als 10 % kleiner), siehe Q-32 | Handtest-Befunde, Wortlaut Nutzer über Lead | Nutzer am 2026-10-25 (Befunde); Zahlen in AP-56 (Startwerte, angenommen) |
| PE-62 | Lint-Fix auf dev: `npm run lint` (`eslint .`) ist seit dem Design-Commit 5e58bf2 rot, 18 Fehler `no-undef` (`document`, `window`) nur in `docs/design/assets/{fonts,pixel}.js`, Browser-Skripte des Designers. Umsetzung AP-57 (M2b-Nachtrag W8, vor M2c W1): `docs/design/**` in `eslint.config.js` ignorieren, Designer-Dateien bleiben unverändert. Keine Globals-Erweiterung und keine Regel gelockert, `src/` bleibt voll geprüft. AP-55 (W3) ändert `eslint.config.js` danach, die Ignore-Zeile bleibt | Lead-Auftrag „Fix-Paket“ am 2026-10-25 (Pflege, kein Umfang, keine Architektur- oder Sicherheitsänderung) | Lead (Auftrag 2026-10-25), Planner-Vorschlag Paket und Reihenfolge |

### Offene Fragen

| ID | Frage | Priorität | Betrifft | Empfehlung | Status |
|---|---|---|---|---|---|
| Q-01 | Bewegt sich die Astronautin auch über die Map, oder steht sie fest und dreht sich nur? | K | F-01, §4 | fest in der Mitte, nur Drehen (wie `idee.txt`) | geklärt (PE-08) |
| Q-02 | Gibt es einen Termin für den ersten Stich? | K | §1, §14 | keiner | geklärt (PE-19) |
| Q-03 | „Erste Hälfte“ bezogen auf was: die Level eines Batches oder die Level 0–20 insgesamt? | K | F-03 | pro Batch | geklärt (PE-09) |
| Q-04 | Boss je Level: Aussehen, Verhalten, wann erscheint er (bei Timer-Ende, zur Halbzeit)? Muss er besiegt werden? | W (blockiert nur G2 des Boss-Meilensteins) | F-05 | Ablauf geklärt (PE-18); offen sind Aussehen und Verhalten je Boss | geklärt (PE-33, Verhalten angenommen PE-34) |
| Q-05 | Batch-Grenzen überlappen (Wald 0–5, Nacht 5–10, Elfenwald 10–20). Zu welchem Batch gehören Level 5 und 10? | W | F-06 | 0–4 Wald, 5–9 Nacht, 10–20 Elfenwald | geklärt (PE-10) |
| Q-06 | Wie gibt es Upgrades in der Runde, was bringt das Spielerlevel im ersten Stich (Rüstungen, Power-ups?), wie werden Level freigeschaltet? | K | F-07–F-09 | Erfahrungskristalle sammeln → Auswahl aus 3 Upgrades; Level nacheinander freischalten | geklärt (PE-12, PE-13) |
| Q-07 | iOS: Der Mac ist sehr alt, das iPhone hat das neueste iOS. Wie kommt das Spiel aufs iPhone? Welches Mac-Modell und welche macOS-Version? | K | §3, §6 | Stich 1: iPhone spielt per Safari/PWA über das lokale WLAN vom PC. Native iOS-App erst später | geklärt (PE-14) |
| Q-08 | Item-Drops: Wie kommt das Item zur Astronautin (sie läuft nicht)? Wie lange wirkt es, stapelt es sich, wie oft droppt es? | K | F-07 | Item fliegt nach 1 s von selbst zu ihr; wirkt bis Rundenende; stapelt bis Stufe 5 je Eigenschaft; Drop-Chance ca. 8 % | geklärt (PE-16) |
| Q-09 | Grafik: Woher kommen die Pixel-Sprites (Astronautin, 4 Gegner, 3 Maps, Items, Bosse)? | K | F-04–F-06, §5 Lizenzen | Platzhalter + Sprite-Liste + Anleitung | geklärt (PE-23) |
| Q-10 | Bildschirm: Hochformat, Querformat oder beides? | W | §4, Szenen | Querformat | geklärt (PE-25) |
| Q-11 | Sound und Musik im ersten Stich? | W | Umfang | nur einfache Effekte | geklärt (PE-24) |
| Q-12 | Lizenz des öffentlichen Repos: Soll eine `LICENSE` festlegen, dass Code und Grafiken nicht frei genutzt werden dürfen? | W | §5, Kommerzialisierung | ohne Lizenzdatei gilt „alle Rechte vorbehalten“; zusätzlich kurzer Hinweis im README | geklärt (PE-27) |
| Q-13 | Sollen Debug-Runden (`?level=n`) den Spielstand gar nicht verändern, also weder Erfahrung noch Freischaltung schreiben? | W | AP-22, AP-10 (`GameScene`) | Ja: Folgepaket mit `GameScene` (Debug-Kennzeichen in den Szenendaten, Speichern überspringen). Bis zur Umsetzung in AP-33 gilt PE-36 | geklärt (PE-49), Umsetzung in AP-33 |
| Q-14 | Dauerhafte Waffen- und Charakter-Upgrades mit Gold-Münzen. Stand: Gold-Münzen als Währung, zufällig von Gegnern gedroppt, fliegen automatisch zur Spielerin. Offen: was ist upgradebar, Shop-Ort, Preise, Spielstand-Schema, Verhältnis zu F-07 und PE-12 (Items pro Runde bleiben?), Neu-Balancing | K | §2 (Umfang), F-07, PE-12, PE-13, §4 (`SaveGame`), §8 | keine Empfehlung, Umfangsänderung gegenüber F-07/PE-06. Erst klären, dann Paket anlegen | geklärt (PE-39–PE-47, PE-52), Umfang freigegeben (H-07) |
| Q-15 | Stufe 10 nach „15–20 Leveln“: zählt das Spiel-Level (0–20) oder das Spielerlevel? Alle vier Upgrades auf Stufe 10 kosten zusammen ca. 2 800 Gold. | W | PE-41, AP-35 | Spiel-Level, eine Spur pro Runde spürbar | geklärt (PE-50) |
| Q-16 | Dauerfeuer „unendlich“ als Obergrenze 20 Schuss/s akzeptieren? | W | PE-43, AP-30 | Ja | geklärt (PE-51) |
| Q-17 | Münzen: Magnet über das ganze Spielfeld, keine Lebensdauer, Laser gehen durch Münzen | O | PE-39, AP-31 | so, wie angenommen | bestätigt (PE-39) |
| Q-18 | Heilung bleibt seltenes Item, bei Sieg 100 % Gold, bei Niederlage 50 % | O | PE-40, PE-42 | so, wie angenommen | bestätigt (PE-40, PE-42) |
| Q-19 | Rüstungen (PE-47): Welche Rüstungen soll es geben (Anzahl, Namen, Effekte)? Ist der Feuerring der erste Eintrag? | K | PE-47, AP-37a, AP-37c, §2 (F-17) | Nur Feuerring als Pilot, weitere später | geklärt (PE-52) |
| Q-20 | Rüstungen: Auslöser und Abklingzeit. Vorschlag: Aktivierung durch Einsammeln, Wirkung sofort, Abklingzeit 20 s nach Ende | K | PE-47, AP-37a, AP-37c | so, wie angenommen | geklärt (PE-52) |
| Q-21 | Rüstungen: Richtwerte Feuerring (Radius 72 px, Schaden 20/s, Dauer 5 s). Gelten die Richtwerte oder soll der Nutzer sie festlegen? Gilt die Rüstung nur in der Runde, nicht im Menü? | K | PE-47, AP-37a, AP-37c | Richtwerte gelten, nur in der Runde | geklärt (PE-52) |
| Q-22 | Auf Touch-Geräten: Bleibt das Tippen auf das Spielfeld als Zielen erhalten, wenn der Stick dazukommt? | W | PE-03, PE-55, AP-39 | Ja, der Stick hat Vorrang vor Tippen und Maus | geklärt (PE-55, Nutzer am 2026-10-25) |
| Q-23 | Feuerring: Drop-Chance je Gegner (Richtwert 2 %, angenommen) und trifft der Ring ab M3 auch Bosse? In M2b trifft er keine Bosse | W | PE-57, AP-37a, AP-33, M3 (AP-16 ff.) | 2 % je Gegner, Bosse ab M3 nur nach Entscheidung mit PE-34 | geklärt (PE-57), Nutzer am 2026-10-25 |
| Q-31 | Timer-Label nach Ablauf bei lebendem Boss: „BOSS!“ (Design-Brief, Grundsatz 4) oder „Boss besiegen!“ (bisheriger Text in AP-20)? | O | AP-20, AP-53 (Zustand `setOvertime`) | „BOSS!“ laut Design, weil es zum Funk-HUD und zu den Mockups passt | geklärt: „BOSS!“ (Nutzer am 2026-10-25), AP-20 trägt „BOSS!“ |
| Q-32 | Stick-Größe auf dem Handy: Befund „10 % zu groß“ (140 px, also etwa 126 px) oder Designvorgabe `size.stick` 88 px und `size.stick-knob` 28 px (-37 %)? 88 px ist als Zielfläche für den Daumen klein | W | PE-61, AP-53 | AP-53 nimmt die Token-Größe 88/28 (Vorgabe des Leads: Design vor Befund), Fangbereich zum Starten des Sticks bleibt bei 126 px (Durchmesser), damit der Daumen ihn trifft. Der Nutzer prüft in M2c-DEP; ist 88 px zu klein, wird nur der Token-Wert geändert (eine Zeile in `docs/design/tokens.json` durch den Designer plus `theme:build`) | offen (AP-53 mit Empfehlung eingetragen, angenommen) |

### Vorgeschlagene Änderungen (brauchen Freigabe des Nutzers)

| Was | Änderung | Grund | Vorgeschlagen von |
|---|---|---|---|
| AP-01 `Dateien (Eigentum)` | `.gitignore` aus dem Coder-Eigentum nehmen. `node_modules/` und `dist/` sind bereits auf dev (c53f075, Lead). Nur für künftige Pakete gedacht, AP-01 bleibt unverändert | Coder-role-guard blockt `.gitignore`, Wellenabschluss M0 W1 | Lead (Wellenabschluss) |
| Testabdeckung AP-05 (≥ 90 %) | Ein Coverage-Werkzeug (z. B. Vitest-Coverage) freigeben, damit das Akzeptanzkriterium belegt werden kann. Bisher nur manuell geprüft | Nachweis fehlt, neues Paket braucht Freigabe (Regel Abhängigkeiten) | Lead (Erkenntnis AP-05) |
| §4 Datenmodell Rüstungen (Vorschlag) | In die Datenmodell-Tabelle von §4 aufnehmen: `ArmourDef` (Config, Vertrag) mit `id`, `label`, `durationMs`, `cooldownMs`, `radiusPx`, `damagePerSec`; `ArmourRules` mit `dropChance`; `ActiveArmour` mit `id`, `activeMsLeft`, `cooldownMsLeft`, flüchtig und nicht gespeichert. Ereignis `armour-changed`. Die Angaben stehen so in AP-37a, §4 bleibt bis zur Freigabe unverändert | PE-47, PE-58, AP-37a (Datenmodell für Rüstungen fehlt in §4) | Planner (Pflege, Lead-Auftrag 2026-10-25) |
| Arena-Auflösung als Konstante `GAME_SIZE` (640×360) | `ARENA_CENTER` (320,180) steht lokal in `Enemy.ts` und ist nur per `ctx.center` überschreibbar. Die Zahl steckt damit an zwei Stellen. Vorschlag: Konstante in `src/config` anlegen und von Gegnern, Spielszene und Kamera nutzen. Eigentum: AP-15 (`src/config`), AP-10 nutzt sie nur. Alternativ AP-10 übernimmt es, bräuchte aber Config-Freigabe | Erkenntnis AP-09, Hinweis aus Review | Lead (Wellenabschluss M1 W2) |
| Prüfung LICENSES.md (Vorschlag) | Ein Prüfpunkt oder Test, der `public/assets/LICENSES.md` auf Vollständigkeit gegen das Asset-Manifest prüft (jeder Eintrag einmal, Datei nicht leer). Heute prüft `assets:check` die Datei nicht. Vorschlag: eigenes kleines Paket nach M2b oder Erweiterung von `tests/config/assets.test.ts` in einem späteren Asset-Paket. Entscheidung Nutzer | Review-Befund AP-26 (Datei durch Prettier-Pipe geleert) | Lead (Wellenabschluss M2b W1) |
| `ActivePowers.doubleShotStage` (Typ-Schärfung) | AP-25 spezifiziert `0–2`, Ist-Typ ist `number`. Vorschlag: auf `0 \| 1 \| 2` schärfen. Eigentum: `src/contracts/weapon.ts` (AP-25-Datei), nur mit Freigabe und vor AP-30 | Review-Hinweis AP-38, niedrig | Lead (Wellenabschluss M2b W1) |
| §11 Abhängigkeitsgraph | Kanten AP-29 → AP-35 und AP-30 → AP-35 ergänzen. §10 nennt beide Abhängigkeiten, der Graph zeigt nur AP-27 → AP-35. Keine Auswirkung auf die Wellen, AP-35 ist W5 | Prüfung Eigentum und Wellen W3 | Planner (Pflege, Wellenabschluss M2b W2) |
| Lead-Skript: Paket-IDs mit Buchstabe (Werkzeug) | Das Skript akzeptiert im Branch und im Commit-Betreff nur `AP-<nr>`. AP-37a und AP-37c werden deshalb als `AP-37` geführt (`agent/AP-37-c<n>`, `feat(AP-37): ...`). Vorschlag: das Skript auf `AP-<nr>[a-z]?` erweitern, danach gelten Branch und Commit-Betreff wie im Paket (`feat(AP-37c): ...`). Bis zur Entscheidung bleibt das Workaround-Schema. Nicht geändert, Werkzeug-Mangel für den Nutzer | Befund Wellenabschluss M2b W3 (AP-37a) | Lead (Wellenabschluss M2b W3) |
| Design: Kandidaten für den Backlog (Product Owner) | Tastatur-Navigation im Menü (Fokus-Ring ist gestaltet, aber heute keine Funktion) als neue Anforderung an `docs/backlog.md`. Boss-Lebensleiste (`runde.html` 3) ist in AP-20 eingeplant, nicht Teil von M2c | Brief, „Offene Punkte für spätere Pakete“. Der Planner schreibt das Backlog nicht | Planner (Pflege, Auftrag „Design übernehmen“) |
| Design: Sprites neu zeichnen (H-13) | Die Platzhalter der Astronautin, Gegner, Items und Bosse nach `sprites.html` neu zeichnen. Als Dateiaustausch durch den Nutzer (H-13) oder als späteres Coder-Paket mit eigener Planung. Nicht in M2c geplant | Brief, Reihenfolge-Empfehlung 5 (optional) | Planner (Pflege, Auftrag „Design übernehmen“) |
| Design: Tokenquelle im Repo | `src/styles/tokens.css` ist eine Kopie von `docs/design/export/tokens.css`. Ändert der Designer die Tokens, laufen `npm run theme:build` und ein Kopieren von `tokens.css` neu. Vorschlag: `theme:build` kopiert die CSS-Datei mit (in AP-50 vorgesehen) und ein Test meldet Abweichungen | Brief, Zielorte | Planner (Pflege, Auftrag „Design übernehmen“) |

#### Verbesserungsplan Wellenkonzept (Entwurf, nicht freigegeben)

Stand 2026-10-25, Sonderauftrag des Nutzers. Keine Pakete in §10/§12, keine Statusänderung. Umsetzung erst nach Freigabe und Aufnahme in §9/§10/§12.

**Kurzfazit.** Der Nutzerbefund (ab Level 5 kippt das Spiel) hat zwei Ursachen: In Level 5 steigen gleichzeitig die Spawn-Rate (+63 %, 35 auf 57 Spawns/Min) und die Zahl der Typen (Hexe, Eichhörnchen). Danach bleibt der Mix von Level 10 bis 20 gleich, nur Menge und Obergrenze wachsen. Die Referenzspiele steuern Druck über Phasen (Aufbau, Spitze, Ruhe), Ereignisse zu festen Zeitpunkten, Elite-Varianten und Budgets, nicht über ein linear sinkendes Intervall. Der `SpawnDirector` ist deterministisch testbar und kann um Phasen und Budget erweitert werden.

**Belegte Erkenntnisse (Quellen sind Spielwikis, Entwicklerdokus und Presse; GDC-Folien selbst wurden nicht gefunden).**

| # | Erkenntnis (eigene Worte) | Quelle |
|---|---|---|
| E1 | Left 4 Dead: Der Director wechselt zwischen Aufbau, Spitze und Ruhe. Mobs entstehen nur in der Aufbauphase, Spitze und Ruhe haben einstellbare Zeiten | https://developer.valvesoftware.com/wiki/L4D2_Director_Scripts |
| E2 | Booth: Ruhige Phasen löst der Director durch Angriffe ab, zu lange Intensität durch eine Pause. Reines Skripting wird vermieden, weil Spieler Abläufe auswendig lernen | https://www.shacknews.com/article/46443/left-4-dead-interview ; https://gamesradar.com/making-left-4-dead |
| E3 | L4D hält nur etwa 30 Zombies gleichzeitig in der Welt und tauscht sie außerhalb der Sicht aus (Obergrenze statt Masse) | https://gamesradar.com/making-left-4-dead |
| E4 | Vampire Survivors (Fan-Wiki): Wellen etwa minütlich mit Mindestanzahl und Intervall, bei Unterschreitung wird aufgefüllt; ab 300 Gegnern stoppt das Spawnen; Map-Events (Schwarm, Umzingelung) kommen zu festen Sekunden und sind erwartbar | https://vampire-survivors.fandom.com/wiki/Enemies |
| E5 | Brotato (Fan-Wiki): Gegner-HP wächst je Welle, Elite-/Horde-Welle um Welle 11/12 (ein Elite aus drei möglichen), Boss in Welle 20, höchstens 100 Gegner gleichzeitig; Spieler berichten von fehlenden großen Sprüngen zwischen Wellen | https://brotato.wiki.spellsandguns.com/Elite_Wave ; https://brotato.wiki.spellsandguns.com/Waves |
| E6 | Risk of Rain 2: Ein Director erhält Credits, jeder Gegner kostet Credits, hat Gewicht und frühestes Level (Spawn Card). Das ist ein Budget-System mit gestaffelter Einführung | https://riskofrain2.wiki.gg/wiki/Directors |
| E7 | Risk of Rain (1): Der Director wählt eine Karte und spawnt sie je nach Budget normal oder als Elite | https://riskofrain.wiki.gg/wiki/Enemies |
| E8 | Tower-Defense-Leitfäden: Neue Gegnertypen sollen bestehende Strategien herausfordern (Variation statt nur Menge); schnelle schwache, langsame gepanzerte, fliegende Gegner als Mix; Vorschau der nächsten Welle | https://bugnet.io/blog/how-to-design-a-tower-defense-game ; https://abratabia.com/game-genres/tower-defense.php |
| E9 | PaceMaker (Forschung): Intensität wird aus Schaden und Zustand der Spieler geschätzt, Ziel sind Spitzen und Täler | https://arxiv.org/pdf/2408.15001 |

**Unbelegt (nicht gefunden, nur Gedächtnis oder Annahme):** konkrete Wellenmuster von Halls of Torment, 20 Minutes Till Dawn, Nuclear Throne und Enter the Gungeon; GDC-Folien zu L4D; Telegraphing-Dauern; Lesbarkeit auf kleinen Bildschirmen (nur Spielerkommentare zu Kontrast gefunden, nicht belastbar); Richtwerte für die Länge von Ruhephasen. Diese Zahlen unten sind Startwerte und per Handtest zu prüfen.

**Priorisierte Maßnahmen (Paketvorschläge, Kurzform).**

| ID | Prio | Ziel | Dateien | Abhängigkeiten | Aufwand | Modell | Wirkung |
|---|---|---|---|---|---|---|---|
| AP-40 | hoch | SpawnDirector um Phasen erweitern: Aufbau, Spitze, Ruhe (Startwerte z. B. 40 s, 10 s, 6 s, unbelegt) mit Spawn-Rate-Faktor je Phase, deterministisch über SpawnRng. Wahlweise Spawns/Min als Test-Metrik | `src/logic/spawn.ts`, `src/config/waves.ts` (neu), `tests/logic/spawn.test.ts` | AP-35 nicht nötig, aber vor AP-16 (Eigentum `spawn.ts` M3 W1) | M, medium | sonnet | Hoch: bricht den Dauerstrom, entschärft Level 5 |
| AP-41 | hoch | Typen gestaffelt einführen: Hexe Level 5, Eichhörnchen Level 6 oder 7 (Gewicht der Neuen im Einführungslevel niedrig, steigend). Ab Level 10 Typmix nach Level variieren statt nur Menge | `src/config/levels.ts`, `tests/config/levels.test.ts`, `docs/balancing.md` | nach AP-35 (Eigentum `levels.ts` W5), vor AP-16; braucht Freigabe zu Q-24 | S, medium | sonnet | Hoch: entkoppelt die zwei Hebel in Level 5 |
| AP-42 | hoch | Druck-Kennzahl um Schwarm-Faktor (Spawns/Min und Anzahl schneller Gegner) ergänzen, Test: Sprung Level 4 auf 5 und je Level begrenzt | `tests/logic/balance.test.ts`, `docs/balancing.md` | AP-40, AP-41 | S, low | haiku | Mittel: verhindert Rückfall, macht Befund messbar |
| AP-43 | mittel | Budget-System: jeder Typ hat Kosten, der Director erhält Credits je Phase (RoR2-Prinzip) statt gewichtetem Zufall; Obergrenze bleibt `maxEnemies` | `src/logic/spawn.ts`, `src/config/{waves,enemies}.ts`, Tests | AP-40, AP-35 | M, high | sonnet | Mittel: faire Mischung, gut testbar |
| AP-44 | mittel | Spawn-Muster: Ring (Umzingelung), Schwarm von einer Seite, Cluster, Flanken; zeitlich fest in der Spitzenphase | `src/logic/spawn.ts`, `src/config/waves.ts`, Tests | AP-40 | M, medium | sonnet | Mittel: Abwechslung statt Menge |
| AP-45 | mittel | Elite-Varianten bestehender Gegner (mehr HP, größer, getönt, keine neuen Assets), 1 Elite in der Spitzenphase ab Level ca. 8 | `src/config/{enemies,waves}.ts`, `src/contracts/enemy.ts` (nur Feld `variant`, eigenes Vertragspaket eine Welle vorher), `src/entities/Enemy.ts` | AP-40, AP-33 (Szene), Q-26 | M, medium | sonnet | Mittel: Abwechslung ohne neue Typen |
| AP-46 | mittel | Telegraph-Marker für Muster (kurz blinkender Rand-Marker, ca. 0,6 s, unbelegt) | `src/entities/SpawnMarker.ts` (neu), `src/scenes/GameScene.ts` | AP-44, nach AP-33 (Szene), vor AP-20 | S, medium | sonnet | Mittel: Fairness, iPhone-Lesbarkeit |
| AP-47 | niedrig | Sanfte Pro-Level-HP-/Tempo-Skalierung ab Level 10 (Brotato-Prinzip), Eichhörnchen-Tempo bleibt gedeckelt | `src/config/{levels,enemies}.ts`, Tests | AP-41 | S, low | haiku | Niedrig bis mittel: ersetzt Menge durch Stärke |
| AP-48 | niedrig | Pre-Boss-Ruhe (ca. 8 s ohne Spawns, bestehende Gegner abräumen) und Boss-Zustandsautomat im SpawnDirector, F-05 bleibt (Runde läuft bis der Boss tot ist) | `src/logic/{spawn,round}.ts`, Tests | AP-40, in AP-16 integrieren, nicht danach | S, medium | sonnet | Niedrig: Dramaturgie |
| AP-49 | niedrig | Obergrenze gleichzeitiger Gegner auf iPhone prüfen und ggf. senken (L4D-Prinzip, Q-27) | `src/config/levels.ts` | AP-41, Messung | S, low | haiku | Niedrig: Lesbarkeit |

**Einordnung und Konflikte.**
- AP-27 (M2b W2) besitzt `src/config/enemies.ts`: AP-43/AP-45/AP-47 laufen erst danach. Kein Konflikt für AP-40 (`spawn.ts` ist in M2b frei).
- AP-35 (M2b W5) besitzt `levels.ts` und `balance.test.ts` und verlangt dort „Spawn-Werte von Level 0–4 bleiben gleich“. AP-41/AP-42 und AP-47 gehören deshalb nach AP-35 (neue Welle W6, nach Freigabe) oder werden in AP-35 aufgenommen. Beides ändert das Balancing, daher Freigabe des Nutzers nötig. AP-35 Schritt 5 (Schwelle `pressure` > 0,9 für Level 20) muss mit AP-42 abgestimmt werden.
- AP-16 (M3 W1) besitzt `spawn.ts`, `round.ts`, `levels.ts`. Alle hohen und mittleren Pakete müssen vor M3 W1 gemergt sein, sonst muss AP-16 sie auf eine neue Grundlage stellen. Empfehlung: AP-40 bis AP-42 in M2b nach AP-35, AP-43 bis AP-46 optional als M2c oder zwischen M2b und M3; AP-48 in AP-16 einarbeiten (Planänderung dort).
- AP-33 (M2b W5) und AP-20 (M3 W3) besitzen `GameScene.ts`: AP-46 liegt dazwischen. AP-37a/AP-37c (Feuerring) berühren nur Rüstung, kein Konflikt. AP-39 (Stick) berührt keine Spawn-Dateien.
- `docs/balancing.md` und PE-05 schützen „Gegner-Ab-Level aus `idee.txt`, nicht ändern“ und Rundendauer. AP-41 ändert die Ab-Level und braucht deshalb eine ausdrückliche Entscheidung (Q-24).
- Aufwand gesamt hoch+mittel etwa 6 mittelgroße Pakete; Budget gegen §14 prüfen, falls freigegeben.

**Offene Fragen an den Nutzer (Entwurf, noch ohne Q-Nummer in der Tabelle oben).**
1. (Q-24) Dürfen die Einführungslevel der Gegner gestaffelt werden (z. B. Hexe Level 5, Eichhörnchen Level 7), obwohl `docs/balancing.md` „nicht ändern“ sagt und die Werte aus `idee.txt` stammen?
2. (Q-25) Sind Ruhephasen (einige Sekunden ohne neue Spawns) gewünscht, oder soll das Spiel durchgehend dicht bleiben?
3. (Q-26) Sind Elite-Varianten bestehender Gegner (größer, getönt, mehr HP, ohne neue Assets) gewünscht?
4. (Q-27) Gegnerzahl auf dem iPhone: Soll `maxEnemies` dort niedriger sein als auf dem Desktop?
5. (Q-28) Telegraph-Marker: Soll ein kurzer Warn-Marker am Rand vor Ring- und Schwarmspawns erscheinen?
6. (Q-29) Boss-Verhalten: Pre-Boss-Ruhe und Spawn-Stopp, bis der Boss tot ist, oder laufen normale Spawns weiter (F-05 sagt nur, dass die Runde bis zum Tod des Bosses läuft)?
7. (Q-30) Soll der Entwurf vor M3 (als M2c) umgesetzt werden, oder erst nach M3 mit Boss-Daten?

---

## 17. Abdeckungsmatrix

| Anforderung oder Regel | Pakete |
|---|---|
| F-01 Steuerung (Drehen, Maus/Touch) | AP-04, AP-05, AP-08, AP-10; Stick auf Touch (PE-55, §2 F-01): AP-39 |
| F-02 Automatischer Schuss | AP-05, AP-08, AP-23 (Feuerrate) |
| F-03 Runde mit Timer | AP-03, AP-06, AP-10 |
| F-04 Gegner | AP-03, AP-09, AP-15, AP-23 (Tempo, Kurve 5–20), AP-24 (Geschosse abschießbar) |
| F-05 Boss je Level | AP-16–AP-20 |
| F-06 Level und Maps 0–20 | AP-03, AP-12 |
| F-07 Waffen-Items (geändert, PE-42, H-07) | AP-03, AP-05, AP-08, AP-10 (alt, ersetzt in M2b); neu: AP-25, AP-27, AP-30, AP-31, AP-33, AP-34, AP-36 |
| F-08 Spielerlevel | AP-06, AP-10, AP-11 |
| F-09 Hauptmenü und Freischaltung | AP-06, AP-11, AP-21, AP-22 (Direktstart `?level=n` am Menü vorbei) |
| F-10 iPhone über PWA | AP-13, M2-DEP; Vollbild, Mitte, HUD auf dem iPhone (PE-54): AP-38 |
| F-11 HP und Niederlage | AP-05, AP-10 |
| F-12 Grafik austauschbar + Anleitung | AP-02, AP-07 |
| F-13 Sounds austauschbar + Anleitung | AP-02, AP-07, AP-14 |
| F-14 Querformat | AP-01, AP-13, AP-38 (Darstellung im Querformat) |
| F-15 Gold-Münzen (PE-39, PE-40) | AP-25, AP-26, AP-27, AP-29, AP-31, AP-33, AP-35 |
| F-16 Dauerhafte Upgrades (PE-41, PE-45) | AP-27, AP-28, AP-29, AP-32, AP-33, AP-35 |
| F-17 Rüstungen mit passiven Effekten (PE-47, PE-52, PE-56, PE-58; Pflicht, V-06 abgelehnt) | AP-37a, AP-37c, AP-34, AP-33, M2b-DEP (Pilot Feuerring fest, Katalog offen) |
| Rüstung Feuerring: Drop, Aktivierung, Ring-Schaden, Abklingzeit, Pause (PE-52, PE-57) | AP-37a (Logik), AP-37c (Entity, Pickup), AP-33 (Verdrahtung), M2b-DEP (Handtest) |
| iPhone-Befunde M2: Vollbild im Querformat, Astronautin mittig, HUD lesbar (PE-54) | AP-38, M2b-DEP (Handtest) |
| Virtueller Stick auf Touch-Geräten, 360°-Zielen, Stick vor Tippen und Maus (PE-55, §2 F-01) | AP-39 (`logic/aimSource`), M2b-DEP (Handtest) |
| Handtest-Befunde M2b-DEP (PE-61): Stick zu groß, grauer Kasten hinter Power-ups | AP-53 (Akzeptanzkriterien), Q-32, M2c-DEP |
| Handtest-Befunde M2b-DEP (PE-61): erste Level zu einfach, Rundenstart mit leerem Feld, Baum stirbt mit einem Laser | AP-56 (Balancing, Rundenstart), M2b-Nachtrag vor M2c W1 |
| Schild gilt für alle Schadensquellen (PE-42, PE-43) | AP-30, AP-31, AP-33 |
| §5 Spielstand v2, robustes Laden (PE-44) | AP-28 |
| R1 Asset-Lizenzen M2b | AP-26, AP-36 |
| PE-29 Pause (inkl. Dauerfeuer, Magnet, Münz-Timer) | AP-10, AP-30, AP-33 |
| PE-31 sanftes Treffer-Feedback | AP-08, AP-09, AP-10 |
| §5 Robustes Laden des Spielstands | AP-04, AP-21 |
| §5 Dev-Server nur im Heimnetz | AP-13 |
| R1 Recht (Asset-Lizenzen, Lizenzhinweis PE-27) | AP-01, AP-02, AP-07 |
| R2 DSGVO (keine personenbezogenen Daten, kein Tracking) | AP-04, Review aller Pakete |
| R3 Impressum | entfällt im ersten Stich (PE-22); vor Veröffentlichung neues Paket |
| R4 Secrets | alle (Review), PE-26 |
| R5 Rollen | alle (Wächter, Lead) |
| R6 Prompt-Injection, Abhängigkeiten | AP-01 (`npm audit`), Review aller Pakete |
| Design (PE-59): Tokens als `theme.ts`, Hülle (`index.html`, Manifest, `backgroundColor`) | AP-50 |
| Design: Bitmap-Schriften Astro Kapsel und Funk, App-Icons, Waffen-Sprite und `ui-icons`, Anleitung (F-12) | AP-51 |
| Design: Menü, Level-Auswahl, Upgrade-Panel, Dialog, Laden, Hochformat-Hinweis, Ton-Taste (F-09, F-10, F-14) | AP-52 |
| Design: HUD, Pause, Stick, Ergebnis, Maps (F-03, F-11, F-01) | AP-53 |
| Design: Waffe als eigenes Sprite, 360° um die Hand, drei Ausbaustufen, Laser, Ringe, Treffer-Blitz (F-02, F-12, F-17) | AP-50 (reine Funktionen), AP-54 (Darstellung) |
| Design-Grundsatz 1 „Nur Tokens“ | AP-50, AP-52, AP-53, AP-54, AP-55 (Lint-Regel), Review |
| Design-Grundsatz 4 „Nie nur Farbe“, 5 „Ziele mindestens 32×32“ | AP-52, AP-53, Design-Review, M2c-DEP |
| Design-Grundsatz 7 „Bewegung abschaltbar“ (`prefers-reduced-motion`) | AP-50 (`motion.ts`), AP-52, AP-53, AP-54, M2c-DEP |
| Design-Grundsatz 8 „Keine Zahlen über Gegnern“ (Treffer-Blitz 120 ms) | AP-54 (PE-31 gilt schon) |
| R1 Asset-Lizenzen M2c (eigene Schriften, Icons, Sprites) | AP-51 (`LICENSES.md`) |
| Design für M3: Boss-Lebensleiste, Timer-Label, Telegraph-Farben | AP-16, AP-20 (Q-31), AP-17–AP-19 (Tokens) |

---

## 18. Änderungsprotokoll

| Datum | Änderung | Grund | Betroffene Pakete | Freigabe |
|---|---|---|---|---|
| 2026-10-23 | Planversion 1: §1 und §2 aus `idee.txt` und den ersten Antworten befüllt, PE-01–PE-07, Q-01–Q-06 | Interview-Start | – | Nutzer |
| 2026-10-23 | PE-08–PE-11: Bewegung, Rundendauer pro Batch, Batch-Grenzen, Tech-Stack. §3 befüllt, Q-07 (iOS) neu | Interview Runde 2 | – | Nutzer |
| 2026-10-23 | PE-12–PE-15: Item-Drops, Spielerlevel, iPhone per PWA, 3 Coder mit Freigabe pro Meilenstein. F-10 neu, Q-08 neu | Interview Runde 3 | – | Nutzer |
| 2026-10-23 | PE-16–PE-22: Items anschießen, HP, Boss-Ablauf, kein Termin, Remote. §4–§6 als Entwurf befüllt, Q-09–Q-11 neu | Interview Runde 4 | – | Nutzer / Entwurf Planner |
| 2026-10-23 | PE-23–PE-26 (Grafik, Sound, Querformat angenommen, öffentliches Repo), §4/§5 bestätigt, G1 erfüllt. §8–§11, §13 und M0-Pakete AP-01–AP-04 geschnitten, M1–M3 grob | Interview Runde 5, Paketierung | AP-01–AP-19 | Nutzer / Planner |
| 2026-10-23 | M0 bestätigt (PE-28), Querformat (PE-25), Lizenzhinweis (PE-27), M1-Pakete AP-05–AP-10 detailliert, PE-29 Pause angenommen | Interview Runde 6 | AP-01, AP-05–AP-10 | Nutzer / Planner |
| 2026-10-23 | M1 bestätigt (PE-30), Pause bestätigt, PE-31 sanftes Feedback. M2-Pakete AP-11–AP-15 detailliert, §1 Abnahme, §14 Budget, §15 Risiken, §17 Matrix, Lagebericht | Interview Runde 7 | AP-08–AP-15 | Nutzer / Planner |
| 2026-10-23 | M2 bestätigt (PE-32), Bosse je Batch (PE-33), Boss-Verhalten angenommen (PE-34), M3 neu geschnitten: AP-16–AP-20 | Interview Runde 8 | AP-16–AP-20 | Nutzer / Planner |
| 2026-10-23 | Wellenabschluss M0 W1: AP-01 gemergt (2fdf9c4, Review Runde 2 bestanden, lint/typecheck/test/build grün, `npm audit` 0). AP-01 `fertig`, AP-02–AP-04 `bereit` | Wellenabschluss | AP-01–AP-04 | Lead (Pflege) |
| 2026-10-23 | Erkenntnis: Review Runde 1 fand Phaser 4.2.1 statt 3.x. Coder hat auf exakt 3.90.0 fixiert. Pakete mit `npm install` dürfen `phaser` nicht ändern | Review-Befund AP-01 | AP-02–AP-20 | Lead (Pflege) |
| 2026-10-23 | Erkenntnis: Coder-role-guard blockiert `.gitignore`. Lead hat `node_modules/` und `dist/` auf dev ergänzt (c53f075). Vorschlag in §16 | Wellenabschluss M0 W1 | AP-01 | Lead (Pflege) |
| 2026-10-23 | Erkenntnis: Entscheidungen aus AP-01 (Ist-Stand): `bossId` und `ItemDef.id` sind `string`, `LevelDef.id` ist `number`. Event-Payloads: hp-changed `{hp, maxHp}`, timer-tick `{remainingSec}`, weapon-changed `{stacks}`, round-ended `{result, xpGained}`, mute-changed `{muted}`. Prettier: singleQuote, printWidth 100. vite `server.host: true`. Hilfstypen `EnemyPoolEntry`, `EnemyProjectileDef`, `EnemyAuraDef`. Vitest-Config aus `vitest/config` | Wellenabschluss M0 W1 | AP-02–AP-20 (Verträge und Konfiguration) | Lead (Pflege) |
| 2026-10-23 | Wellenabschluss M0 W2: AP-02 (eb025c8), AP-03 (1763ba4), AP-04 (248c4d6) gemergt, Review Runde 1 bestanden. Checks auf dev grün: lint, typecheck, 53/53 Tests in 7 Dateien, build, `npm audit` 0. AP-02–AP-04 `fertig`, AP-05, AP-06, AP-07 `bereit` | Wellenabschluss M0 W2 | AP-02–AP-07 | Lead (Pflege) |
| 2026-10-23 | Erkenntnis AP-02: Sound-Keys tragen Präfix `sfx-` (z. B. `sfx-laser`), weil Sprite `laser` sonst kollidiert. `src/config/assets.ts` exportiert `ASSETS` und `animKey(key)` = `<key>-anim`. Manifest-Pfade relativ zu `public/`. `ui-icons` Frames: 0 Herz, 1 Ton an, 2 Ton aus. Datei `public/assets/.placeholders.json` (SHA-256-Liste für den Generator). Debug-Ansicht über `?assets=1` | Wellenabschluss M0 W2 | AP-07–AP-14 (Asset-Keys, Sound) | Lead (Pflege) |
| 2026-10-23 | Erkenntnis AP-03: `src/config/index.ts` exportiert `assets.ts` nicht. Konsumenten importieren `src/config/assets` direkt. Zugriff über `src/config` (LEVELS, ENEMIES, ITEMS, ITEM_RULES, WEAPON_BASE, PLAYER, PROGRESSION). `getLevel` liefert `undefined` bei unbekannter ID | Wellenabschluss M0 W2 | AP-05, AP-06, AP-08–AP-15 | Lead (Pflege) |
| 2026-10-23 | Startwerte aus AP-03 für Balancing (AP-15), Ausgangspunkt, kein Balancing-Ergebnis: Pool-Gewichte cursedTree 10, forestWitch 5, zombieSquirrel 8, forestSpirit 4. spawnIntervalMs = 1500−50·id. maxEnemies = min(150, 30+6·id). xp 5/10/4/8. Witch contactDamage 5, Spirit 0. heal maxStacks 1 | Wellenabschluss M0 W2 | AP-09, AP-15 | Lead (Pflege) |
| 2026-10-23 | Erkenntnis AP-04: `new AimInput(scene, cx, cy)` mit `targetAngle` und `destroy()`. Storage-API: `loadSave`, `writeSave` (gibt boolean zurück, schreibt nur validierte Felder), `resetSave`, `parseSave`, `defaultSave`, `SAVE_KEY`. Wertebereiche: playerXp 0..1e9 (`MAX_XP`), Level 1..1000 (`MAX_LEVEL`) | Wellenabschluss M0 W2 | AP-10, AP-11 | Lead (Pflege) |
| 2026-10-23 | Erkenntnis Tooling M0 W2: Kein `@types/node` im Projekt. Der Asset-Test lädt `node:fs` per Variablen-Import. Der Generator nutzt Node-24-Type-Stripping; Mindestversion Node 24 laut Lead in README/engines dokumentiert, noch nicht geprüft. Coder brauchen im Worktree `npm ci`. Keine `.gitattributes` (CRLF-Warnungen unter Windows, harmlos) | Wellenabschluss M0 W2 | AP-05–AP-20 (Tooling) | Lead (Pflege) |
| 2026-10-23 | Wellenabschluss M1 W1: AP-05 (a619aec), AP-06 (9358ef9), AP-07 (79b2246, mit Doku-Nachbesserung 38c9bfe) gemergt. Reviews in Runde 1 bestanden. Checks auf dev grün: lint, typecheck, 114/114 Tests in 17 Dateien, build, `assets:check`, `npm audit` 0. AP-05–AP-07 `fertig`, AP-08 und AP-09 `bereit`, AP-10 `offen` | Wellenabschluss M1 W1 | AP-05–AP-10 | Lead (Pflege) |
| 2026-10-23 | Neues Fix-Paket AP-21 (M1, W2): `highestUnlockedLevel` als Index, Standard 0, Bereich 0..20 (PE-35). AP-04 hatte Standard 1 und Bereich 1..1000 geprüft. AP-10 und M1-DEP hängen jetzt zusätzlich von AP-21 ab | Entscheidung Lead, Wellenabschluss M1 W1 | AP-04, AP-06, AP-10, AP-21 | Lead (Pflege) |
| 2026-10-23 | Erkenntnis AP-05: Drehwinkel in `rotation.ts` sind Grad, normalisiert auf (-180, 180]. `angle.ts` und `pointOnRing` nutzen Radiant, AP-08 rechnet um. Item-Wirkung relativ: Basis × (1 + perStack × Stacks). Zuordnung: fireRate → fireRatePerSec, damage → damage, size → projectileScale. `applyItem` gibt `{stacks, heal}` zurück (`heal` = perStack bei Typ heal). `rollDrop` zieht erst dropChance, dann gewichtet. `FireTimer.reset()` und `emptyStacks()` in `weapon.ts`, `createRng(seed)` (mulberry32) in `rng.ts` | Wellenabschluss M1 W1 | AP-08, AP-09, AP-10 | Lead (Pflege) |
| 2026-10-23 | Erkenntnis AP-05: Testabdeckung ≥ 90 % ist nur manuell belegt, es gibt kein freigegebenes Coverage-Werkzeug. Vorschlag in §16 | Wellenabschluss M1 W1 | AP-05 | Lead (Pflege) |
| 2026-10-23 | Erkenntnis AP-06: `xpForLevel(n, rules)` = kumulative Schwelle round(base·(n−1)^exp), Level 1 = 0. `levelForXp(xp, rules)`. `roundXp` und `applyRoundResult` nehmen `rules` als letzten Parameter. `SpawnDirector(level, rng, spawnRadius)`, `rng` braucht nur `next()`. `RoundState`: `status`, `remainingMs`, `elapsed`, `isFinalMinute`, `requiresBossDefeat` (fest `false`, M3/AP-16 macht es pro Level setzbar), `bossDefeated()`. Niederlage hat nur Vorrang, wenn `playerDied()` vor `tick()` im selben Frame aufgerufen wird. AP-10 muss diese Reihenfolge einhalten | Wellenabschluss M1 W1 | AP-10, AP-16 | Lead (Pflege) |
| 2026-10-23 | Erkenntnis AP-07: `check-assets.mjs` liest das Manifest per direktem TS-Import (Node 24). Verweise für AP-13 im README: `docs/guides/grafik-austauschen.md`, `docs/guides/sound-austauschen.md`, `npm run assets:check`, `npm run assets:placeholders`, `?assets=1`. Die Guides nennen `http://localhost:5173/`, bei Port-Änderung anpassen | Wellenabschluss M1 W1 | AP-13 | Lead (Pflege) |
| 2026-10-23 | Erkenntnis Wächter: Commit-Nachrichten dürfen kein `>` enthalten, role-guard lehnt Umleitungszeichen ab | Wellenabschluss M1 W1 | alle Coder, Lead, Planner | Lead (Pflege) |
| 2026-10-23 | Wellenabschluss M1 W2: AP-08 (a061f1a, Review Runde 1), AP-09 (843ded5, Review Runde 2 nach Fix d488b63), AP-21 (11fee13, Review Runde 1) gemergt. Checks auf dev grün: lint, typecheck, 117/117 Tests in 17 Dateien, build, `npm audit` 0. AP-08, AP-09, AP-21 `fertig` (Coder c8, c9, c21), AP-10 `bereit` | Wellenabschluss M1 W2 | AP-08, AP-09, AP-10, AP-21 | Lead (Pflege) |
| 2026-10-23 | Erkenntnis AP-08 (Ist-API): `new LaserPool(scene)` mit `.group`, `.fire(x,y,rad,stats)`, `.release(laser)`, `.update()` pro Frame, `.destroy()`. `Laser.damage`, `.deactivate()`. `new Player(scene,x,y,lasers)` mit `update(dtMs, targetAngleRad)`, `takeDamage(n)`, `heal(n)`, `applyItem(def)`, Felder `hp`, `stats`, `stacks`, `facingDeg`, `isDead`. Callbacks über `player.callbacks` (`onHpChange(hp,maxHp)`, `onStatsChange(stats,stacks)`, `onShoot`, `onHurt`, `onDeath`). Player legt die Anims `astronaut-anim-idle` und `astronaut-anim-shoot` an. `new ItemPickup(scene,x,y,def,ITEM_RULES)` mit `update(nowMs)` (gibt `false` zurück, wenn weg), `collect()` löst `onCollected(def)` aus. AP-10 macht Laser-gegen-Item-Overlap, `pool.release(laser)`, `item.collect()` und `player.applyItem(def)` selbst | Wellenabschluss M1 W2 | AP-10 | Lead (Pflege) |
| 2026-10-23 | Erkenntnis AP-08 Kleinigkeiten: `ItemPickup` baut den Anim-Key von Hand statt über `animKey`. Die Tönung bleibt nach dem Tod stehen. Lokale Darstellungskonstanten: Blink 3000 ms, Tint 120 ms, Mündungsversatz 14 px. Kandidaten für eine Config-Datei (AP-15) | Wellenabschluss M1 W2 | AP-10, AP-15 | Lead (Pflege) |
| 2026-10-23 | Erkenntnis AP-09 (Ist-API): `new EnemyPool(scene, { boltPool, onDeath(x,y,xp) })` mit `spawn(id,x,y)`, `update(time,delta)` pro Frame, `clear()`, `enemies`. `createEnemy(scene,id,ctx)` wählt per `ENEMIES[id].behavior`. Enemy: `takeDamage(n)` (true bei Tod), `contactDamageFor(dtMs)`, `auraDamageAt(px,py,dtMs)`, `def`, `hp`, `active`. `new WitchBoltPool(scene)` mit `bolts`, `update()`, `clear()`. Spielerin-gegen-Bolt-Overlap und `bolt.despawn()` macht AP-10. Pool-Gegner sind inaktiv, bis `spawn()`. Dateiliste in §12 angeglichen: `EnemyPool` liegt in `createEnemy.ts`, Klassen je Verhalten (`ChaseEnemy`, `AuraEnemy`) statt je Gegnertyp | Wellenabschluss M1 W2 | AP-10 | Lead (Pflege) |
| 2026-10-23 | Review-Lehre AP-09: Fabriken per Daten auf Erweiterbarkeit prüfen. Review Runde 1 fand eine Auswahl per Id-switch. Fix d488b63 wählt die Klasse über `behavior`, damit Level 21+ nur Daten und höchstens ein neues Verhalten brauchen | Review-Befund AP-09 | AP-09, künftige Gegnerpakete | Lead (Pflege) |
| 2026-10-23 | AP-10 ergänzt um Schnittstellen-Hinweise (Ist-API aus AP-08/AP-09) und die Reihenfolge `playerDied()` vor `tick()` je Frame. Ziele und Umfang unverändert. Arena-Konstante als Vorschlag in §16 | Wellenabschluss M1 W2 | AP-10 | Lead (Pflege) |
| 2026-10-24 | Wellenabschluss M1 W3: AP-10 (f1000c0, Coder c10, Review Runde 2 bestanden) gemergt. Checks auf dev grün: lint, typecheck, 129/129 Tests in 19 Dateien, build, `npm audit` 0. AP-10 `fertig`, M1-DEP `bereit`, AP-11, AP-12, AP-13 `bereit` (M2 W1) | Wellenabschluss M1 W3 | AP-10, M1-DEP, AP-11–AP-13 | Lead (Pflege) |
| 2026-10-24 | Erkenntnis AP-10 (Ist-API): `GameScene` exportiert `emitGameEvent`, `HudInitData`, `ResultSceneData`. `debug.ts` exportiert `resolveLevelId`, `isValidLevelId`, `MAX_LEVEL_ID` (AP-11 nutzt sie für die Levelauswahl). Debug-Parameter: `?level=n` (nicht ganzzahlig → 0, sonst auf 0..20 begrenzt; eine gültige `levelId` in den Szenendaten hat Vorrang), `?fps=1` (FPS unten rechts im HUD) | Wellenabschluss M1 W3 | AP-11, AP-13 (README), AP-14 | Lead (Pflege) |
| 2026-10-24 | Erkenntnis AP-10: Pause hat kein Vertrags-Event. Das HUD hört auf die Phaser-Events PAUSE und RESUME der GameScene. Kontakt- und Aura-Schaden per `physics.overlap` je Frame, dt-skaliert, dt auf 100 ms begrenzt. Laser- und Hexen-Geschoss über Collider. Drops werden gesammelt und im Update gespawnt. Lokale Konstante `SPAWN_MARGIN_PX` = 24 und HUD-Layoutwerte (Kandidaten für Config, AP-15) | Wellenabschluss M1 W3 | AP-14, AP-15 | Lead (Pflege) |
| 2026-10-24 | Ausnahmen aus dem Review AP-10, vom Lead erlaubt: (a) `MenuScene.ts` enthält die Zeile `this.scene.start('GameScene')` als temporären Einstieg. AP-11 muss sie durch das echte Menü ersetzen; bis dahin startet die Menü-Taste der ResultScene sofort ein neues Level. (b) `ItemPickup.ts` bekam einen optionalen 6. Konstruktorparameter `spawnedAtMs`. GameScene führt eine pausierbare `playTimeMs`, damit Items in Pause nicht ablaufen (PE-29) | Wellenabschluss M1 W3 | AP-11, AP-08 (Datei) | Lead (Pflege) |
| 2026-10-24 | Review-Lehre AP-10: Zeitbasierte Entities über pausierbare Spielzeit statt Rohzeit prüfen. Gilt für künftige Pakete mit Zeitlogik (z. B. AP-16–AP-19) | Review-Befund AP-10 | AP-16–AP-19 | Lead (Pflege) |
| 2026-10-24 | Erkenntnis AP-10: Nicht im Browser geprüft. Erste Laufzeitprüfung ist M1-DEP. Handtest-Liste des Leads: Drehung verzögert, Auto-Feuer, Level 0 Bäume von allen Seiten, Timer 3:00 bis Gewonnen, Item erhöht Stack im HUD, 0 HP = Verloren, `?level=12` mit vier Gegnertypen, Pause per Taste, Esc, P oder Tab, Nochmal ohne doppelte Events, Nächstes Level nur nach Sieg, Fortschritt bleibt nach Reload, `?fps=1`. Abweichung: §10 nennt Esc und P, die Liste nennt zusätzlich Tab | Wellenabschluss M1 W3 | M1-DEP, AP-11 | Lead (Pflege) |
| 2026-10-24 | Wellenabschluss M2 W1: AP-11 (260c646, Coder c11), AP-12 (e382bd6, c12), AP-13 (df1c19e, c13) gemergt. Review in Runde 1 bestanden. Checks auf dev grün: lint, typecheck, 136/136 Tests in 21 Dateien, build, `npm audit` 0. AP-11–AP-13 `fertig`, AP-14 und AP-15 `bereit` | Wellenabschluss M2 W1 | AP-11–AP-15 | Lead (Pflege) |
| 2026-10-24 | Vom Lead freigegebene Detailkorrekturen ohne Scope- oder Security-Wirkung: §9.2 M1-DEP-Smoke-Test um Pause, „Nochmal“, Level-Freischaltung, Fortschritt und `?fps=1` ergänzt. AP-11 Dateieigentum um `levelGroups.ts` und Test erweitert. AP-10 präzisiert: Browser-Tab-Wechsel pausiert über `visibilitychange`, ohne Taste | Wellenabschluss M2 W1 | M1-DEP, AP-10, AP-11 | Lead (Pflege) |
| 2026-10-24 | Erkenntnis AP-11: Das Menü liest bei jedem `create()` `loadSave()`. Die Idle-Animation `astronaut-idle` (Frames 0–1) wird in `MenuScene` angelegt. Reset läuft über `resetSave()` und `scene.restart()`. `Button` erzwingt mindestens 32 px, Level-Zellen sind 40×40 | Wellenabschluss M2 W1 | AP-14, AP-15 | Lead (Pflege) |
| 2026-10-24 | Erkenntnis AP-11, niedrig: Der Hover bleibt nach einem Touch-Tap bis `pointerout` stehen. `Button` löst `pointerup` auch ohne vorheriges `pointerdown` aus | Wellenabschluss M2 W1 | AP-14 (Stumm-Taste im Menü), künftige Button-Nutzung | Lead (Pflege) |
| 2026-10-24 | Erkenntnis AP-12: Tileset-Frame 0 ist Boden, Frames 1..n sind Deko (das Manifest nennt 4 Frames je Tileset). `TILE_PX` = 32 ist im Code fest eingetragen, Designer-Sheets mit anderer Frame-Größe hinterlassen Lücken. Seed je Level `levelId*7919+1`, Tiefe -100. Partikel höchstens 30 (Nacht 24, Elfenwald 30). Vignette als gecachte Canvas-Textur. Platzhalter-Kacheln sind deckend mit Hash-Farben, Gegner-Lesbarkeit mit Platzhaltern per Handy-Smoke-Test prüfen | Wellenabschluss M2 W1 | M2-DEP, AP-15 (Konstanten), künftige Tilesets | Lead (Pflege) |
| 2026-10-24 | Erkenntnis AP-13: Kein Service Worker, kein Offline-Betrieb (steht im README). `preview:lan` = `build` und danach `vite preview --host`, die IP steht unter „Network:“. Das Inline-Script blockiert `gesturestart`, `gesturechange` und `contextmenu`; bei einer späteren CSP ist ein Hash nötig. Das Overlay „Bitte drehen“ erscheint auch in schmalen Desktop-Fenstern, das Spiel pausiert dabei nicht (Kandidat für ein späteres Paket). Bei neuem Icon das Symbol vom Homescreen löschen und neu hinzufügen. Safe-Area-Padding auf `#game` mit `Scale.FIT` ist nur am iPhone mit Notch prüfbar (H-03) | Wellenabschluss M2 W1 | M2-DEP, künftige CSP | Lead (Pflege) |
| 2026-10-24 | Erkenntnis AP-14: `getSoundService(game)` liefert einen Service pro Game. Das Event `mute-changed` läuft über `game.events`. `addMuteButton(scene,x,y)` in `audio.ts` (32×32, `ui-icons` Frame 1 Ton an, 2 Ton aus). MenuScene ruft `reload()` nach dem Reset. Laser-Drosselung 80 ms, BASE_VOLUME 0,5. Lokal in GameScene `HURT_SOUND_GAP_MS` = 250 (Kandidat für Config). Eine Scene darf kein privates Feld `sound` nennen (kollidiert mit `Phaser.Scene.sound`), das Feld heißt `sfx`. Sound-Keys in Szenen sind String-Literale. `setMuted` überschreibt einen korrupten Save mit dem defaultSave (Randfall) | Wellenabschluss M2 W2 | AP-15 (Config-Kandidat), M2-DEP (Ton-Test am iPhone) | Lead (Pflege) |
| 2026-10-24 | Erkenntnis AP-15: Kennzahl „Druck“ = Gegner-HP/s geteilt durch Basis-DPS 30. Werte: Level 0 0,36; Level 4 0,58; Level 5 0,71 (+22 %); Level 10 1,12 (+17 %); Level 20 1,59. Volle Items ca. 4,5× DPS (135). Spawn-Intervall und Max-Gegner jetzt als Tabellen pro Level (21 Einträge) in `levels.ts`. `WEAPON_BASE.fireRatePerSec` von 2 auf 3. Die Kennzahlentabelle in `docs/balancing.md` ist handkopiert und kann beim Nachjustieren veralten. Die Obergrenze `maxEnemies` (kein Nachholen) fließt nicht in die Kennzahlen ein, beim Handtest beobachten | Wellenabschluss M2 W2 | M2-DEP (Handtest), `docs/balancing.md` | Lead (Pflege) |
| 2026-10-24 | Befund Nutzer-Handtest (Dev-Server am PC): `?level=12` wirkungslos seit AP-11. Ursache: `PreloadScene` startet immer `MenuScene`, `GameScene` liest `?level` nur ohne Level-Daten. Folge: Level 5–20 ohne Freispielen nicht testbar. Fix als AP-22 (M2 W3, Eigentum `PreloadScene.ts`, `debug.ts`, Test). M1-DEP-Punkt `?level=12` erst nach AP-22 erfüllbar. M2-DEP wandert nach W4, wartet auf AP-22 und ist `offen`. Umgang mit dem Spielstand: PE-36, offene Frage Q-13 | Befund Nutzer-Handtest | AP-22, M1-DEP, M2-DEP | Lead (Pflege) |
| 2026-10-24 | Befund Nutzer-Handtest: Smoke-Test M1-DEP präzisiert. Statt „verändert die Waffe sichtbar“ jetzt „erhöht den Stack im HUD“, weil es keine Waffengrafik gibt. Sichtbar ist nur der Item-Stack im HUD. M2-DEP enthält diesen Punkt nicht, dort kam ein `?level=12`-Punkt hinzu | Befund Nutzer-Handtest | M1-DEP, M2-DEP | Lead (Pflege) |
| 2026-10-24 | Erkenntnis Handtest: `localhost:5173` war nach Reload auf dem PC des Nutzers nicht erreichbar, `127.0.0.1:5173` ging. Kein Spielfehler, vermutlich IPv6-/IPv4-Auflösung. Für Handtests `127.0.0.1` verwenden. Die Guides und die Doku nennen weiterhin `localhost`, bei Bedarf anpassen | Befund Nutzer-Handtest | M1-DEP, M2-DEP (Handtest), Doku-Hinweise | Lead (Pflege) |
| 2026-10-24 | Wellenabschluss M2 W3: AP-22 (96bdfc9, Coder c22, Merge 9f8a2f8) gemergt. Review in Runde 1 bestanden. Checks auf dev grün: lint, typecheck, 153/153 Tests in 23 Dateien, build, assets:check, `npm audit` 0. AP-22 `fertig`, M2-DEP `bereit` (AP-14, AP-15, AP-22 fertig) | Wellenabschluss M2 W3 | AP-22, M2-DEP | Lead (Pflege) |
| 2026-10-24 | Erkenntnis AP-22: `resolveStartTarget(search)` in `debug.ts` ist rein und liest nur die Query-Zeichenkette. `PreloadScene` priorisiert `?assets=1`, danach `resolveStartTarget`. Der Direktstart umgeht die Freischaltung und schreibt keinen Spielstand. Runden mit Debug-Level werden normal gespeichert (PE-36, Q-13 offen). Im Coder-Worktree fehlte `node_modules`, der Coder führte `npm ci` aus. Handtest `?level=12` (Elfenwald, vier Gegnertypen) steht beim Nutzer aus | Wellenabschluss M2 W3 | M1-DEP, M2-DEP, Q-13 | Lead (Pflege) |
| 2026-10-24 | Fix-Pakete aus dem Nutzer-Handtest (Freigabe im Chat): AP-23 Balancing-Nachbesserung Level 5–20 (PE-38) und AP-24 gegnerische Geschosse abschießbar (PE-37, Regel angenommen) in M2 W4 angelegt, beide `bereit`. M2-DEP wandert von W4 auf W5 und hängt an AP-23 und AP-24 (`offen`). Q-14 (Gold-Münz-Upgrades) eingetragen, nicht als Paket angelegt. Vorschlag §16 zum Verfluchten Baum (Tempo nur ab Level 5). Die höhere Feuerrate macht Level 0–4 ebenfalls leichter, das prüft der Nutzer im Handtest | Befund Nutzer-Handtest | AP-23, AP-24, M2-DEP, §8–§11, §16, §17 | Nutzer (Chat) / Lead (Pflege) |
| 2026-10-24 | Erkenntnis Planung (Ist-Code): `Enemy` liest das Tempo aus `ENEMIES[id].speed` ohne Level-Kontext. Ein levelabhängiges Tempo braucht deshalb eine Änderung in Entities und Szene, nicht nur in `src/config`. Wald-Hexe-Geschosse sind `WitchBoltPool.bolts` (Array für Physics-Overlap), Kreisprüfung in `logic/geometry.ts` (`circlesOverlap`). Die Druck-Kennzahl nutzt `WEAPON_BASE` und ändert sich mit der Feuerrate | Planung AP-23/AP-24 | AP-23, AP-24, künftige Gegnerpakete | Planner (Pflege) |
| 2026-10-24 | Pflegeauftrag Q-14 (Gold-Münzen): Q-14 geklärt (PE-39–PE-45). Neuer Meilenstein M2b (AP-25–AP-36, M2b-DEP) zwischen M2-DEP und M3, Status offen, Freigabe ausstehend. AP-16 hängt jetzt an M2b-DEP (PE-46). §2 nicht geändert, F-07 und Ergänzungen als V-01/V-02 in §16. Verträge und Config in W1 und W2 additiv. Aufräumen der alten Item-Typen in AP-36 (W6) | Pflegeauftrag Lead, Nutzer-Entscheidungen 2026-10-24 | AP-16, AP-25–AP-36, M2b-DEP | Planner (Pflege) |
| 2026-10-24 | Erkenntnis Planung (Ist-Code, Q-14): Der Schadenspfad läuft nur über `Player.takeDamage` (Schild davor), Zeitabläufe (Dauerfeuer, Münz-Timer) über `playTimeMs`. Doppelschuss ändert die Druck-Kennzahl aus AP-23, daher Neu-Balancing in AP-35. Upgrade-Faktoren gehen als Parameter in `computeWeaponStats` und `Player`, damit AP-30 nicht von `upgrades.ts` abhängt | Planung Q-14 | AP-25–AP-36 | Planner (Pflege) |
| 2026-10-24 | Hinweis Planung: Stufe-10-Ziel (15–20 Level) und Gold-Richtwert (ca. 45 je gewonnenem Level) sind angenommen. Alle vier Upgrades auf Stufe 10 kosten zusammen ca. 2 800 Gold. Q-15 offen, AP-35 kalibriert danach | Planung Q-14 | AP-35 | Planner (Pflege) |
| 2026-10-24 | Ergänzung Nutzer zu Q-14: Rüstungen mit passiven, zeitlich begrenzten Effekten (Feuerring um die Spielerin 5 s). PE-47 mit angenommenem Auslöser und Abklingzeit, Richtwerten für Radius und Schaden. Neue Fragen Q-19 bis Q-21 (Katalog, Auslöser und Abklingzeit, Werte). Platzhalter AP-37 in §10, kein Paket vor Klärung. §2-Ergänzung nur als V-02 in §16 | Ergänzung Lead am 2026-10-24 (Nutzer-Auftrag) | AP-37 (Platzhalter), V-02 | Planner (Pflege) |
| 2026-10-24 | Wellenabschluss M2 W4: AP-23 (Commit e31c9fd, Merge 820c31f, Coder c23) und AP-24 (3be77c6, Merge f4885d9, Coder c24) gemergt. Review in Runde 1 bestanden. Checks auf dev grün: lint, typecheck, 162/162 Tests in 25 Dateien, build, assets:check, `npm audit` 0. AP-23 und AP-24 `fertig`, M2-DEP `bereit` (AP-14, AP-15, AP-22, AP-23, AP-24 fertig) | Wellenabschluss M2 W4 | AP-23, AP-24, M2-DEP | Lead (Pflege) |
| 2026-10-24 | Entscheidung Nutzer: Verfluchter Baum bleibt unverändert, auch ab Level 5 (Option c). Vorschlag zum Baum-Tempo in §16 geschlossen, PE-48 | Befund Handtest, Entscheidung im Chat | AP-23 (Doku), keine Paketänderung | Nutzer (Chat) / Planner (Pflege) |
| 2026-10-24 | Erkenntnis AP-23 (Ist-Werte, Basis-DPS 40, nicht vergleichbar mit AP-15 mit Basis 30): Level 4 0,43, Level 5 0,48 (+11 %), Level 12 0,69, Level 20 0,96. Ab Level 5 je Schritt +3,4 % bis +5,5 %, Schritt 9 zu 10 +9 %. Zombie-Eichhörnchen 80 px/s, Feuerrate 4/s. Spawn-Intervall und Max-Gegner für Level 5–20 neu in `src/config/levels.ts`, Level 0–4 unverändert | Wellenabschluss M2 W4 | AP-35, `docs/balancing.md` | Lead (Pflege) |
| 2026-10-24 | Erkenntnis AP-23: Coder c23 musste `tests/config/items.test.ts` anfassen (Zeile `fireRatePerSec` von 3 auf 4). Die Datei gehört künftig zum Eigentum der Balancing-Pakete, die `weapon.ts` ändern. Betroffen AP-27 und AP-35: Dateieigentum vor deren Welle prüfen | Wellenabschluss M2 W4 | AP-27, AP-35 | Lead (Pflege) |
| 2026-10-24 | Erkenntnis Tooling M2 W4: Im Coder-Worktree fehlte `node_modules` (wie bei AP-22), der Coder führte `npm ci` aus. `npm ci` im Hauptcheckout scheitert, solange ein Dev-Server läuft (rolldown-Binding gesperrt), und lässt `node_modules` halb abgebaut zurück. Vor dem Integrationspunkt Dev-Server stoppen | Wellenabschluss M2 W4 | alle Integrationen | Lead (Pflege) |
| 2026-10-24 | Erkenntnis AP-24 (Ist-API): `canLaserDestroyBolt` in `src/logic/projectiles.ts` nimmt `{active, x, y, radius}` und ist für Boss-Geschosse wiederverwendbar. Overlap in `GameScene.addColliders`, Treffer-Ton `sfx-hit`. Kreisprüfung ist enger als die Rechteck-Überlappung (PE-37). Keine Szenentests, Handtest in M2-DEP | Wellenabschluss M2 W4 | M2-DEP, AP-16–AP-20 (Boss-Geschosse) | Lead (Pflege) |
| 2026-10-24 | Review-Hinweis AP-23, niedrig: Die Schwelle für Level 20 im Balance-Test (> 0,8, Ist 0,96) ist lockerer als nötig. Anhebung auf 0,9 soll in AP-35 mit erledigt werden, im Paket-Text noch nicht vermerkt | Review-Befund AP-23 | AP-35 | Lead (Pflege) |
| 2026-10-24 | Freigabe Nutzer („alles wie vorgeschlagen“): V-01 bis V-04 in §2, §4, §8, §9, §11, §12 übernommen und aus §16 entfernt, Backlog „Später“ in §2. Q-13, Q-15, Q-16, Q-19 bis Q-21 entschieden (PE-49 bis PE-52), Q-17/Q-18 bestätigt, PE-53. AP-33 um Debug-Verhalten (PE-49) ergänzt, AP-35 um Level-20-Schwelle 0,9 und Hinweis `items.test.ts`. H-07 und H-09 erledigt. Erledigte Zeilen aus „Vorgeschlagene Änderungen“ (idee.txt, verfluchter Baum, SaveGame-Bedeutung) entfernt | Pflegeauftrag Lead, Freigabe Nutzer 2026-10-24 | §2, §4, §8–§12, §13, §16, §17, AP-33, AP-35 | Planner (Pflege) |
| 2026-10-24 | Prüfung Reihenfolge M2-DEP → AP-25/AP-26: keine Code-Abhängigkeit. Beide Pakete berühren keine Datei, die in M2 noch offen ist (M2 hat kein offenes Code-Paket, M3 ist nicht begonnen). Die Kante bleibt als Reihenfolgekante, bis der Nutzer entscheidet. `src/entities/Laser.ts` hat in M2b kein Eigentum, AP-31 könnte es für Schaden je Laser brauchen. Zu klären vor AP-31 | Pflegeauftrag Lead | §11, AP-31 (offen) | Planner (Pflege) |
| 2026-10-25 | Abnahme Nutzer M0-DEP, M1-DEP und M2-DEP (PC und iPhone). H-03 erledigt, H-06 für M0–M2 erledigt. Die drei DEP-Pakete sind `fertig`. AP-25 und AP-26 sind `bereit`, weil M2b nicht mehr an M2-DEP als Reihenfolgekante hängt. Ausnahme: Der Punkt „Notch“ in M2-DEP bleibt offen, weil der Befund „Grafik zu groß im Querformat“ dem widerspricht. Er wird in AP-38 und M2b-DEP erneut geprüft | Pflegeauftrag Lead, Abnahme Nutzer 2026-10-25 | §0, §9.2, §10, §13, M2-DEP, AP-25, AP-26 | Planner (Pflege) |
| 2026-10-25 | Befunde Nutzer-Handtest iPhone: Spielfeld zu groß, HUD-Stapel zu klein, Astronautin nicht mittig. Neues Paket AP-38 (M2b W1, GAME/OPS, sonnet medium, `bereit`) mit Vollbild, Safe-Area, Viewport, HUD und Zentrierung. Neues Paket AP-39 (M2b W2, GAME, sonnet high, `offen` bis V-05 freigegeben ist und AP-38 gemergt ist): virtueller Stick unten rechts im Querformat, nur auf Touch-Geräten. Eigentum W1: AP-38 besitzt `index.html`, `src/main.ts`, `src/platform/layout.ts` (neu), `src/scenes/{GameScene,HudScene}.ts`, `src/entities/Player.ts` nur zum Zentrieren. Eigentum W2: AP-39 besitzt `src/platform/stick.ts`, `src/logic/aimSource.ts`, `src/platform/input.ts` (einziger Input-Code), `src/scenes/controls/VirtualStick.ts`, `GameScene.ts` nur zur Einbindung. Keine Datei doppelt in einer Welle. AP-38 und AP-39 teilen `GameScene.ts`, daher AP-38 zuerst. AP-25 und AP-26 laufen parallel zu AP-38 in W1 (keine gemeinsamen Dateien), AP-39 nicht parallel in W1. Vorschlag Wellen: W1 AP-25, AP-26, AP-38; W2 AP-27, AP-28, AP-39. Präzisierung Nutzer zu AP-39 (PE-55): Tippen bleibt zusätzlich erhalten, Stick hat Vorrang, zweiter Finger ignoriert, Priorität in reiner Funktion `resolveAim` (`src/logic/aimSource.ts`), eigene Tests. M2b-DEP-Handtest um sechs Zeilen erweitert | Befund Nutzer-Handtest, PE-54, PE-55 | §2 (V-05), §8, §9, §10, §11, §12, §14, §16, §17, AP-38, AP-39 | Planner (Pflege) |
| 2026-10-25 | Wellenabschluss M2b W1: AP-25 (merge 925a1ce, Coder c25, Review Runde 1 bestanden), AP-26 (merge a9a84c2, Coder c26, Review Runde 2 bestanden), AP-38 (merge cd39a61, Coder c38, Review Runde 1 bestanden) gemergt. Checks auf dev grün: 172/172 Tests in 26 Dateien, lint, typecheck, build, assets:check, `npm audit` 0. dev auf origin (cd39a61). AP-25, AP-26, AP-38 `fertig`. AP-27, AP-28, AP-39 `bereit` (W2). AP-37a `bereit` (W3), weil seine einzige Abhängigkeit AP-25 erfüllt ist | Wellenabschluss M2b W1 | AP-27, AP-28, AP-37a, AP-39 | Lead (Pflege) |
| 2026-10-25 | Erkenntnis AP-25 (Ist-Stand): `applyItem` in `src/logic/items.ts` lässt bei doubleShot, shield und rapidFire die Stacks unverändert. Das ist eine minimale Typeinengung, sonst wäre der Typecheck rot. Abweichung vom Eigentum („Nicht anfassen: src/logic/*“), Review bestanden. Testfall in `tests/logic/items.test.ts`. AP-30 muss die drei Effekte echt umsetzen, AP-36 räumt auf | Wellenabschluss M2b W1 | AP-30, AP-36 | Lead (Pflege) |
| 2026-10-25 | Review-Lehre AP-25: Erweitert man eine Union (ItemEffect), können abhängige Switch- und Record-Stellen brechen. Verträge-Pakete müssen abhängige Stellen mitprüfen. Gilt für künftige Erweiterungen (AP-30, AP-36, AP-37a) | Review-Befund AP-25 (Beobachtung) | AP-30, AP-36, AP-37a | Lead (Pflege) |
| 2026-10-25 | Erkenntnis AP-26 (Ist-Assets): Sounds liegen als `sounds/coin.wav` und `sounds/shield-break.wav`, Keys `sfx-coin` und `sfx-shield-break` (nicht `sfx-coin.wav`). Neue Sprite-Keys: `item-double-shot`, `item-shield`, `item-rapid-fire` (16×16, 2 Frames), `coin-small` (8×8, 4 Frames), `coin-big` (16×16, 4 Frames). Drehung über `animKey(key)`. `scripts/generate-placeholders.mjs` ist additiv um die Tabelle SOUNDS erweitert und gehört künftig zum Eigentum der Asset-Pakete | Wellenabschluss M2b W1 | AP-31, AP-34, AP-36, AP-37c | Lead (Pflege) |
| 2026-10-25 | Review-Befund AP-26: Coder c26 hat `prettier --write` mit einer Pipe nach `tail` ausgeführt (EPIPE). Dabei wurde `public/assets/LICENSES.md` geleert. `assets:check` prüft die Datei nicht, der Reviewer fand es. Regeln für alle Coder: Prettier nie in Pipes nutzen, `git diff --stat` auf geleerte Dateien prüfen. Reviewer prüfen Binär- und Doku-Dateien per Diff gegen dev. Vorschlag für einen Test in §16 | Review-Befund AP-26 | alle Coder, Reviewer, Asset-Pakete | Lead (Pflege) |
| 2026-10-25 | Erkenntnis AP-38 (Ist-Code): `src/platform/layout.ts` mit `fitArena` und `hudScale`. `index.html` mit Padding-Sonde `#safe`, `#game` ohne Padding. `main.ts` setzt Position und Größe per `layoutArena` bei resize und orientationchange. Ursache des iPhone-Befunds (aus dem Code abgeleitet, nicht am Gerät gemessen): Safe-Area-Padding lag auf dem Phaser-Parent, FIT maß es mit. `GameScene.ts` und `Player.ts` blieben unverändert. Handtest iPhone steht in M2b-DEP aus | Wellenabschluss M2b W1 | AP-34, AP-33, AP-39, M2b-DEP | Lead (Pflege) |
| 2026-10-25 | Review-Hinweise AP-38, niedrig: `HudScene` berechnet `k` nur einmal in `create()` (bei Größenänderung veraltet, Orientierungswechsel prüfen). `ActivePowers.doubleShotStage` ist `number` statt `0 \| 1 \| 2` (Vorschlag §16). Der HUD-Punkt gehört zu AP-34 (HUD-Datei, W4) | Review-Befund AP-38 | AP-34, AP-30 | Lead (Pflege) |
| 2026-10-25 | Umfang-Vorschläge nur in §16 (V-05 Stick in F-01, V-06 F-17 nach Optional), §2 unverändert, Freigabe Nutzer offen. F-17 (Rüstungen) als Optional, `(angenommen)`, PE-56. Budget M2b rechnerisch ca. 9–10 Fenster, Gesamtplan ca. 22–27 Fenster bei 2,5 h je Fenster (30 % Team-Budget, Annahme). RI-15 ergänzt (Multitouch am Stick, Vollbild in Safari) | Planner (Pflege) | §2 (Vorschlag), §14, §15, §16 | Planner (Pflege) |
| 2026-10-25 | Hinweis Git: Der Hauptcheckout steht auf `stage`, nicht auf `dev`. Die Planänderung ist deshalb unkommittiert im Arbeitsbaum (Inhalt von `stage` und `dev` für diese Datei identisch). Der Lead wechselt auf `dev` und committet mit `plan: ...`. Der Planner hat nicht selbst gewechselt | Pflegeauftrag Lead | Git | Planner (Pflege) |
| 2026-10-25 | Nutzer-Freigabe V-05 übernommen (Stick in §2 F-01; Touch-Laptops zählen als Touch-Geräte, bestätigt). V-06 abgelehnt: F-17 bleibt Pflicht. Rüstungs-Priorität: AP-37a (W3), AP-37c (W4), Anzeige in AP-34 (W4), Einbindung in AP-33 (W5), AP-32 nach W5 | Lead-Auftrag und Nutzer-Entscheidung 2026-10-25 | §2, §9, §10, §11, §12, §16 | Planner (Pflege) |
| 2026-10-25 | Wellen und Pakete: AP-37 (Platzhalter) entfällt, ersetzt durch AP-37a und AP-37c. AP-32 von W4 nach W5. M2b jetzt 16 Pakete, ca. 23,75 h Agent-Zeit, ca. 11–12 Fenster. Gesamt 37 Pakete, ca. 24–29 Fenster | Planung Rüstungs-Priorität | §9, §10, §14 | Planner (Pflege) |
| 2026-10-25 | Erkenntnis Planung: Regel „keine Abhängigkeit auf einen Vertrag aus derselben Welle“ und Wellenlimit (drei Pakete, eine Datei je Welle). AP-37a (W3) braucht nur AP-25, deshalb keine Kante zu AP-29 und AP-30. AP-34 zeigt den Feuerring als Kreis-Grafik, nicht als Sprite aus AP-37c (gleiche Welle). Einbindung in AP-33 (W5), weil GameScene dort frei ist. Folge: AP-33 wird groß (RI-16) | Planung Rüstungs-Priorität | AP-33, AP-34, AP-37a, AP-37c | Planner (Pflege) |
| 2026-10-25 | Status: AP-25, AP-26, AP-38 auf `in Arbeit` (W1 läuft), AP-39 `offen` bis AP-38 gemergt. H-09 erledigt (PE-52), H-10 erledigt (V-05 übernommen, V-06 abgelehnt). Feuerring-Regeln PE-57 angenommen, Q-23 offen | Lead-Auftrag 2026-10-25 | §10, §13, §16 | Planner (Pflege) |
| 2026-10-25 | Wellenabschluss M2b W2: AP-27 (merge 890b5ab, Coder c27), AP-28 (merge 1bcce22, Coder c28) und AP-39 (merge 85b50d3, Coder c39) gemergt. Review Runde 1 bestanden bei AP-27 und AP-28, AP-39 nach Runde 2 (Runde 1 nicht bestanden, Fix b30d435). Checks auf dev grün: 195 Tests bestanden, 2 übersprungen, 30 Dateien, lint, typecheck, build, assets:check. AP-27, AP-28, AP-39 `fertig`. AP-29, AP-30 `bereit` (AP-25 und AP-27 fertig), AP-37a `bereit` (W3). Eigentum W3 geprüft: AP-29 (`logic/{economy,upgrades,coins}`), AP-30 (`logic/{items,weapon,powers}`), AP-37a (`contracts/{armour,events,index}`, neue Config- und Logikdateien) haben keine gemeinsame Datei | Wellenabschluss M2b W2 | AP-27, AP-28, AP-29, AP-30, AP-37a, AP-39 | Lead (Pflege) |
| 2026-10-25 | Erkenntnis AP-27: Abweichung vom Eigentum. `tests/logic/items.test.ts` hat eine Legacy-Hilfe für die alten Effekte (fireRate, damage, size). `tests/logic/balance.test.ts` hat zwei Fälle als `it.skip` mit TODO AP-35: `items raise dps step by step` und `level 20 is demanding but fair`. AP-35 setzt sie neu auf. Die Legacy-Defs können entfallen, sobald AP-36 die Effekte fireRate, damage, size aus `ItemEffect` und `applyItem` entfernt (Eigentum offen, §16). `UPGRADES` ist `Record<UpgradeTrack, {label, mode, perLevel}>`. Die Preisformel round(COST_BASE × COST_GROWTH^k) steht nur im Test | Wellenabschluss M2b W2 | AP-29, AP-35, AP-36 | Lead (Pflege) |
| 2026-10-25 | Erkenntnis AP-28: `parseSave` liefert immer `version` 2, auch für v1-Stände (sie werden beim Lesen gehoben). `SAVE_KEY` bleibt `360shooter.save.v1`. `MAX_GOLD` ist in `src/platform/storage.ts` definiert und exportiert, nicht in `src/config` (AP-27 hat es dort nicht angelegt). `SaveGame.gold` und `SaveGame.upgrades` sind im Typ optional, nach `loadSave` und `defaultSave` immer gesetzt | Wellenabschluss M2b W2 | AP-29 (MAX_GOLD), AP-32, AP-33 | Lead (Pflege) |
| 2026-10-25 | Erkenntnis AP-39 (Ist-Code): `AimInput` bekommt als 4. Parameter `StickSource`. `targetAngle` ist ein Getter mit Seiteneffekt (er berechnet `resolveAim` neu) und muss jeden Frame gelesen werden. Tippen innerhalb der Stick-Basis zielt nie. Der Stick nutzt `input.addPointer(2)`. Review Runde 1 nicht bestanden: Der Stick blieb nach einer Pause „gehalten“, und das Ziel sprang nach dem Loslassen auf den alten Tipp-Winkel. Fix b30d435 setzt den Stick bei Pause zurück und hält den Winkel nach dem Loslassen. Runde 2 bestanden. PAUSE- und RESUME-Verdrahtung hat keinen Unit-Test, der Handtest in M2b-DEP prüft sie (inkl. Pause mit gehaltenem Stick) | Wellenabschluss M2b W2 | AP-33 (AimInput-Schnittstelle, Stick), M2b-DEP | Lead (Pflege) |
| 2026-10-25 | Lead-Auftrag: §9 M2b-DEP um einen Handtest-Punkt ergänzt (Pause mit gehaltenem Stick). §12 AP-29: eine Preisfunktion (`upgradeCost`), keine zweite Formel (Hinweis Review AP-27); MAX_GOLD-Ort offen (§16). §12 AP-35: die zwei `it.skip`-Tests aus AP-27 werden neu aufgesetzt. Keine Änderung an §2, §4, §5 | Lead-Auftrag Wellenabschluss M2b W2 | AP-29, AP-35, M2b-DEP | Planner (Pflege) |
| 2026-10-25 | Wellenabschluss M2b W3: AP-29 (merge 7a3faa0, Coder c29), AP-30 (merge bf40477, Coder c30) und AP-37a (merge 08be401, Coder c37) gemergt. Review Runde 1 bestanden bei allen drei. Checks auf dev grün: 246 Tests bestanden, 2 übersprungen (AP-35), 36 Dateien, lint, typecheck, build, assets:check. AP-29, AP-30, AP-37a `fertig`. AP-31, AP-34, AP-37c `bereit` (W4). Eigentum W4 geprüft (§8, §12): keine gemeinsame Datei, alle Abhängigkeiten `fertig`, keine Kante innerhalb W4, drei Pakete je Welle (PE-15) | Wellenabschluss M2b W3 | AP-29, AP-30, AP-31, AP-34, AP-37a, AP-37c | Lead (Pflege) |
| 2026-10-25 | Erkenntnis AP-37a (Werkzeug): Das Lead-Skript akzeptiert nur `AP-<nr>` im Branch und Commit-Betreff. Paket-IDs mit Buchstaben (AP-37a, AP-37c) werden als `AP-37` geführt. Für AP-37c gilt dasselbe: Branch `agent/AP-37-c<n>` mit eindeutiger Coder-Nr. (z. B. c371), Commit-Betreff `feat(AP-37): ...`. §12 AP-37c (Schnittstellen, Commit-Typ) entsprechend ergänzt. Werkzeug-Mangel für den Nutzer, Vorschlag §16, nicht geändert | Wellenabschluss M2b W3 | AP-37c, Lead-Skript | Lead (Pflege) |
| 2026-10-25 | Erkenntnis AP-37a (Ist-API): `tickArmour(state, dtMs, def)` hat `def` als dritten Parameter, weil `ActiveArmour` keine Cooldown-Dauer hält. Überschuss-dt nach Ablauf der Aktivzeit zählt auf die Abklingzeit. `isInRing(def, cx, cy, tx, ty, tr)`. `rollArmourDrop(rng, rules)` ist `rng.next() < dropChance`. Event `GameEvents.ArmourChanged` (Payload `ActiveArmour`). `ARMOURS` und `ARMOUR_RULES` sind nicht in `src/config/index.ts` re-exportiert (nicht im Eigentum), direkter Import aus `src/config/armour`. AP-33, AP-34, AP-37c müssen das beachten (Hinweise in §12 ergänzt) | Wellenabschluss M2b W3 | AP-33, AP-34, AP-37c | Lead (Pflege) |
| 2026-10-25 | Erkenntnis AP-29 (Ist-API): `MAX_GOLD` (1_000_000_000) liegt in `src/logic/economy.ts`. Entscheidung Lead: Logik importiert nie aus `platform`, dafür ein Gleichheitstest gegen `src/platform/storage.ts`. Der Vorschlag dazu in §16 ist damit erledigt. `upgradeFactors` rechnet multiplikativ als `1 + perLevel × Stufe` (Stufe 10 = 2,0, vom Reviewer bestätigt, PE-41). Der Kommentar „Faktor je Stufe“ in `src/config/upgrades.ts` ist mehrdeutig, Klarstellung „Zuwachs je Stufe, additiv aufsummiert“ in AP-35 (Schritt 6). `upgradeCost(_track, level)` ignoriert die Spur. `coinMagnetStep(coin, player, dtMs, rules)` gibt `{x, y, collected}`, außerhalb des Magnetradius bleibt die Münze unverändert. Exporte: `Point`, `MagnetResult`, `UpgradeFactors`. `gold` und `upgrades` im SaveGame sind optional, die Funktionen behandeln fehlende Werte als 0 | Wellenabschluss M2b W3 | AP-31, AP-32, AP-33, AP-35 | Lead (Pflege) |
| 2026-10-25 | Erkenntnis AP-30 (Ist-API): `computeWeaponStats` ist überladen. Neu `(base, WeaponFactors, ActivePowers)`, alt `(base, stacks, itemDefs)` wird per `Array.isArray` erkannt (`@deprecated`). AP-31 entfernt die Nutzung der alten Signatur in `Player.ts`. AP-36 entfernt sie samt `legacyStats`, `applyItem` (alt), `emptyStacks` und den `legacy()`-Fällen. Die alte Signatur wird noch genutzt in `tests/logic/balance.test.ts` (AP-35 stellt um) und in `tests/logic/weapon.test.ts` (Planner-Prüfung, nicht im Auftrag genannt, AP-36 ergänzt). `ActivePowers` hat kein Schild-Stufenfeld, die Stufe kommt aus `shieldLeft` und `perStack`, `shieldLeft` ist auf `maxStacks × perStack` gedeckelt. `doubleShotStage` wird in der Logik auf 0..2 geklemmt, der Vertragstyp bleibt `number`. Der vorgeschlagene Typ `0 \| 1 \| 2` (§16) bleibt offen. AP-36 besitzt `src/contracts/weapon.ts`, es wäre dort möglich. Neue Exporte: `emptyPowers`, `absorbDamage`, `tickPowers`, `shotPattern`, `effectiveFireRate`, `isRapidFireActive`, `clampStage`, `applyPowerItem`, `WeaponFactors`. AP-31 muss `tickPowers` mit dtMs der pausierbaren Spielzeit aufrufen, `absorbDamage` vor der HP-Abrechnung, `shotPattern(stage)` nutzen (`offsetPx` seitlich zur Zielrichtung, `angleDeg` relativ) und `computeWeaponStats` bei Änderung des Power-Zustands neu berechnen | Wellenabschluss M2b W3 | AP-31, AP-35, AP-36 | Lead (Pflege) |
| 2026-10-25 | Lead-Auftrag: Eigentum AP-36 in §8 und §12 eingetragen: `src/logic/{items,weapon}.ts`, `tests/logic/items.test.ts`, `tests/logic/balance.test.ts`. Planner-Ergänzung: `tests/logic/weapon.test.ts` (alte Signatur und `emptyStacks`) und `tests/logic/powers.test.ts` (Dauerfeuer-Test mit Literal 5000). W6 enthält nur AP-36, daher keine Konflikte. Optional aus Review AP-30 (niedrig): `Math.min(def.maxStacks, 2, …)` in `items.ts` durch `MAX_DOUBLE_SHOT_STAGE` ersetzen, Literal 5000 ersetzen (§12 AP-36, Schritt 4). Der Vorschlag „AP-36 Dateien (Eigentum)“ in §16 ist damit erledigt und entfernt | Lead-Auftrag Wellenabschluss M2b W3, Review AP-30 | AP-36, §8, §12, §16 | Lead (Pflege) |
| 2026-10-25 | Lead-Auftrag: AP-35 um Schritt 6 ergänzt (Klarstellung „Faktor je Stufe“ in `src/config/upgrades.ts`). Ist-API-Hinweise in §12 bei AP-31, AP-33, AP-34, AP-37c (Schnittstellen). Commit-Typ AP-37c auf `feat(AP-37)` (Lead-Schema). Der Vorschlag zu `MAX_GOLD` (§16) ist entschieden und entfernt | Lead-Auftrag Wellenabschluss M2b W3 | AP-31, AP-33, AP-34, AP-35, AP-36, AP-37c | Lead (Pflege) |
| 2026-10-25 | Wellenabschluss M2b W4 (teilweise): AP-34 (merge ea763dd, Coder c34) und AP-37c (merge 353eb60, Coder c40, Branch `agent/AP-37-c40`) gemergt. Review Runde 1 bestanden bei beiden. Checks auf dev laut Lead grün. AP-34 und AP-37c `fertig`. AP-31 `Review` | Wellenabschluss M2b W4 (teilweise) | AP-31, AP-32, AP-33, AP-35 | Lead (Pflege) |
| 2026-10-25 | Abweichung: AP-31 (c31, Branch `agent/AP-31-c31`, Commit 55477c3) Review Runde 1 bestanden, aber bewusst nicht in dev gemergt. Grund: Typecheck rot durch 3 Fehler nur in `src/scenes/GameScene.ts` (AP-33-Eigentum: Player-Konstruktor braucht `PlayerConfig` als 5. Argument, `player.stacks` wird `player.powers`, `onStatsChange(stats, powers)`). Entscheidung Nutzer (Option 1): Branch bleibt bestehen, AP-33 baut in W5 darauf auf, AP-31 und AP-33 werden direkt hintereinander gemergt, damit dev nie rot ist. AP-33 `bereit (Basis agent/AP-31-c31)`, Hinweis in §12 AP-33 | Entscheidung Nutzer, Wellenabschluss M2b W4 | AP-31, AP-33 | Nutzer (Chat) / Lead (Pflege) |
| 2026-10-25 | Erkenntnis AP-34 (Ist-Code): `HudScene` initialisiert alle Anzeigen mit 0 und liest keinen Startzustand. `GameScene` (AP-33) muss nach dem Anlegen der HudScene `coins-changed`, `powers-changed` und `armour-changed` mit Anfangswerten senden, oder `HudInitData` wird erweitert. Reine Hilfsfunktionen in `src/scenes/hud/hudMath.ts`. Kosmetisch: das Panel `ROW_PANEL_W*k` ist breiter als die 640er Arena | Wellenabschluss M2b W4 (teilweise) | AP-33, M2b-DEP (Handtest) | Lead (Pflege) |
| 2026-10-25 | Erkenntnis AP-37c (Ist-API): `ArmourPickup` nimmt `ItemRules` als Konstruktor-Parameter, die Szene übergibt `ITEM_RULES`. Sprite-Key als Konstante `ARMOUR_PICKUP_SPRITE`. Die Animation `item-fire-ring-anim` legt PreloadScene automatisch an. `ArmourRing`: `show(def)`, `hide()`, `setCenter(x, y)`, `destroy()`, Tiefe 50, Alpha 0,5. `ArmourPickup`: `update(nowMs)`, `collect()`, `onCollected` | Wellenabschluss M2b W4 (teilweise) | AP-33 | Lead (Pflege) |
| 2026-10-25 | Erkenntnis AP-31 (Ist-API): `new Player(scene, x, y, lasers, config)` mit `config: PlayerConfig {maxHp, turnSpeedDegPerSec, weaponFireRateMult, weaponDamageMult}`. Callbacks `onShieldChange`, `onHurt`, `onStatsChange(stats, powers)`, Felder `hp`, `powers`. `new CoinPool(scene, rules = COIN_RULES)` mit `spawn(x, y, value)`, `update(dtMs, player)`, `clear()`, `destroy()`, Callback `onCollected(value)`. Münz-Animationen `coin-small-anim` und `coin-big-anim`. `LaserPool.fire` gibt `Laser[]` zurück und nimmt optional einen 5. Parameter `doubleShotStage`. Alte Exporte in `logic/` (`applyItem`, `emptyStacks`, Legacy-`computeWeaponStats`) bleiben bis AP-36 | Wellenabschluss M2b W4 (teilweise) | AP-33, AP-35, AP-36 | Lead (Pflege) |
| 2026-10-25 | Wellenabschluss M2b W5: AP-31 (merge 281531b, Coder c31, Review Runde 1 bestanden), AP-32 (merge b0cd79e, Coder c32), AP-35 (merge c374a40, Coder c35) und AP-33 (merge 9c533f2, Coder c33) gemergt, Review Runde 1 bestanden bei allen. Checks auf dev grün: Install, lint, typecheck, 256/256 Tests, assets:check, build. `dev` auf origin (9c533f2). AP-31, AP-32, AP-33, AP-35 `fertig`, AP-36 `bereit`, M2b-DEP (W7) wartet auf AP-36 | Wellenabschluss M2b W5 | AP-31–AP-36, M2b-DEP | Lead (Pflege) |
| 2026-10-25 | Abweichung vom Plan (Entscheidung Nutzer, Option 1 aus dem Eintrag „Abweichung: AP-31“): AP-31 wurde vor AP-33 in dev gemergt, dev war dadurch kurz rot (3 Typfehler nur in `GameScene.ts`), nicht gepusht. AP-33 hat dev grün gemacht. Die Regel „dev nie rot“ ist damit verletzt worden. Der Plan „AP-33 baut auf dem nicht gemergten Branch `agent/AP-31-c31` auf“ ging nicht, weil Coder weder `merge` noch `cherry-pick` ausführen dürfen | Entscheidung Nutzer, Wellenabschluss M2b W5 | AP-31, AP-33 | Nutzer (Chat) / Lead (Pflege) |
| 2026-10-25 | Lehre Paketschnitt: Hängt ein Paket an einer Entity-API-Änderung, die Szenen bricht, muss die Szenenanpassung im selben Paket liegen oder die Basis muss vorher in dev sein. Gilt für künftige Pakete mit Entity- oder Szenenbruch, besonders M3 (AP-16, AP-20) | Lehre aus AP-31/AP-33 | künftige Pakete, AP-20 | Lead (Pflege) |
| 2026-10-25 | Erkenntnis AP-33 (Ist-Code): Debug-Runde über `parseDebugLevel(location.search)`. Sie bleibt nach „Nochmal“ aktiv (akzeptiert). Münzen zählen auch bei Niederlage (50 %-Auszahlung). Kein Standard für ein fehlendes `coinValue` in der Config: `?? 0` heißt kein Drop, alle vier Gegner haben einen Wert. Das Event `powers-changed` bei Doppelschuss läuft nur indirekt über `onShieldChange` aus `Player.applyItem`. Das ist fragil, Prüfung in AP-36 (Vorschlag) | Wellenabschluss M2b W5 | AP-36, AP-20 | Lead (Pflege) |
| 2026-10-25 | Erkenntnis AP-33 für M3: Der Feuerring darf Bosse in M3 nicht treffen (Q-23). Der Ringschaden muss dafür in `GameScene.updateArmour` ausgeschlossen werden. Das Event `weapon-changed` steht noch im Vertrag, wird aber nicht mehr gesendet. AP-36 räumt es auf (`src/contracts/events.ts` ist jetzt im Eigentum von AP-36) | Wellenabschluss M2b W5, Pflege | AP-20, AP-36 | Lead (Pflege) |
| 2026-10-25 | Erkenntnis AP-33, offen: Die Stumm-Taste (`audio.ts`) schreibt im Debug-Modus weiter Einstellungen. PE-49 sagt, Debug-Runden schreiben keinen Spielstand. Ob die Stummschaltung eine Ausnahme sein darf, entscheidet der Nutzer. Bis dahin unverändert | Wellenabschluss M2b W5 | AP-14, AP-36, M2b-DEP | Lead (Pflege, Frage an Nutzer) |
| 2026-10-25 | Erkenntnis AP-32: Gold-Text und Upgrade-Button liegen nur etwa 1 px auseinander. Panel und Dialog sind modal. Im Handtest prüfen, Punkt steht in §9.2 M2b-DEP | Wellenabschluss M2b W5 | M2b-DEP | Lead (Pflege) |
| 2026-10-25 | Erkenntnis AP-35 (Ist-Werte): `dropChance` 0,048 (Zuordnung zu Münzen oder Items nicht eindeutig, Lead prüft), Schild `maxStacks` 2, Dauerfeuer 4000 ms (§9.2 angepasst). Alle Upgrades auf Stufe 10 kosten zusammen 2 792 Gold (Plan ca. 2 800). Gold-Test prüft Level 20 > 5 × Level 0. Zahlen in `docs/balancing.md` sind teils gerundet | Wellenabschluss M2b W5 | AP-36, M2b-DEP (Balancing-Handtest), `docs/balancing.md` | Lead (Pflege) |
| 2026-10-25 | Budget: Nutzer hat die Obergrenze angehoben. Werte aus `.claude/ma-usage.json`: team 45 %, Zielwert 45 %, Obergrenze 54 %. §7.2 angepasst, §14-Fensterzahlen gelten noch für 30 %. Reset laut `resets_at` 2026-10-25 16:50 UTC, Team steht auf dem Zielwert | Nutzer (Chat) / Lead-Auftrag | §0, §7.2, §14 | Planner (Pflege) |
| 2026-10-25 | Pflegeauftrag Lead: §9.2 M2b-DEP um AP-33-Punkte (Laser und Münzen, Schild, Pause, Debug, „Nochmal“) und AP-32-Layout ergänzt, Dauerfeuer auf ca. 4 s. §8 und §12 AP-36: `src/contracts/events.ts` (nur `weapon-changed`) in das Eigentum von AP-36 aufgenommen, W6 enthält nur dieses Paket, daher keine Konflikte. §10: AP-31, AP-32, AP-33, AP-35 `fertig`, AP-36 `bereit`. §0 Lagebericht und Gates aktualisiert | Lead-Auftrag Wellenabschluss M2b W5 | §0, §7.2, §8, §9.2, §10, §12, §14, AP-36, M2b-DEP | Planner (Pflege) |
| 2026-10-25 | Wellenabschluss M2b W6: AP-36 (merge 44b27c3, Review Runde 1 bestanden) gemergt. Checks auf dev grün laut Lead: 249/249 Tests, lint, typecheck, assets:check, build. AP-36 `fertig`. M2b-DEP (W7) `bereit`, nur noch der Handtest des Nutzers. Keine Coder-Pakete `bereit` | Wellenabschluss M2b W6 | AP-16, M2b-DEP, §0, §10 | Lead (Pflege) |
| 2026-10-25 | Erkenntnis AP-36 (Ist-Code): Entfernt sind `WeaponStacks`, `ApplyItemResult`, `applyItem` (`logic/items`), das Event `weapon-changed` und die Platzhalter `item-damage.png`, `item-fire-rate.png`, `item-size.png` samt Einträgen in Manifest, Doku und `LICENSES.md`. Künftige Pakete (M3) verwenden diese Namen nicht mehr | Wellenabschluss M2b W6 | AP-16, AP-20 | Lead (Pflege) |
| 2026-10-25 | Abweichung AP-36 vom Eigentum: Der Coder hat `tests/entities/ItemPickup.test.ts` (nicht im Eigentum) minimal geändert (`damage` durch `rapidFire`), sonst wäre der Typecheck rot gewesen. Außerdem wurde `public/assets/.placeholders.json` (nicht im Eigentum) bereinigt. Review bestanden. Lehre für Aufräum-Pakete: Vor dem Entfernen eines Typs oder Events die Suche auf alle Tests in `src/` und `tests/` ausdehnen, nicht nur auf das Eigentum | Wellenabschluss M2b W6 | Aufräum-Pakete, §8 | Lead (Pflege) |
| 2026-10-25 | Review-Hinweis AP-36, niedrig, ohne Paket: Grammatikfehler im Kommentar über `applyPowerItem` in `src/logic/items.ts` („heal leave it unchanged“). Kein eigenes Paket, der Lead entscheidet, ob es in einen späteren Schritt geht | Review-Befund AP-36 | – | Lead (Pflege) |
| 2026-10-25 | Entscheidung Nutzer: Q-23 bestätigt (Feuerring-Drop 2 % je Gegner, Bosse ab M3 nur nach Entscheidung mit PE-34). PE-57 bestätigt, Annahmemarker in §0, §12 (AP-37a) und §16 entfernt, Q-23 `geklärt` | Nutzer-Entscheidung 2026-10-25 | §0, §12 AP-37a, §16 (PE-57, Q-23) | Planner (Pflege) |
| 2026-10-25 | Pflegeauftrag Lead Wellenabschluss M2b W6: §0 Lagebericht ersetzt (Budget team 0 %, nächste Welle W7 M2b-DEP), Gates in §0, §10 (AP-36 `fertig`, M2b-DEP `bereit`), §16 und §18 wie oben. Keine Änderung an §2, §4, §5 | Lead-Auftrag Wellenabschluss M2b W6 | §0, §10, §12, §16, §18 | Planner (Pflege) |
| 2026-10-25 | Pflegeauftrag Lead „Design übernehmen“ (Brief vom 2026-10-25, `freigegeben`, Commit 5e58bf2): PE-59 (Design übernommen) und PE-60 (Reihenfolge, angenommen). Neuer Meilenstein M2c mit AP-50 (Theme, Waffen-Geometrie, Hülle), AP-51 (Schriften, Icons, Assets), AP-52 (Menü), AP-53 (Runde), AP-54 (Waffe, Spielerin, Laser) und AP-55 (Lint-Regel, Restfunde) sowie M2c-DEP. W1: AP-50, AP-51; W2: AP-52 bis AP-54 mit Design-Review; W3: AP-55; W4: M2c-DEP. Abweichungen vom Brief-Vorschlag: reine Funktionen für die Waffe und die Bewegungseinstellung (`weaponMount.ts`, `motion.ts`) liegen in AP-50 (W1), damit AP-52 und AP-54 sie nutzen können (Regel „Verträge eine Welle vorher“); `ui-icons` wird in AP-51 neu belegt (kurzer Zwischenzustand mit falschen Symbolen in dev bis W2); `PreloadScene` gehört in W1 AP-51 (ohne Änderung würde `bitmapFont` als Audio geladen) und in W2 AP-52; Funk-Buttons des Ergebnisses kommen aus `scenes/hud/` (AP-53); `ItemPickup`/`ArmourPickup` (Blinken bei reduzierter Bewegung) und die Übergabe der Ausbaustufe in `GameScene` gehören AP-54. AP-16 hängt jetzt von M2c-DEP ab, AP-17–AP-20 bekommen Design-Hinweise (AP-20 Design-Review). Neu: Q-31 (Timer-Text „BOSS!“), H-11 bis H-13, RI-17, K9, §17-Zeilen, Vorschläge zu Backlog (Tastatur-Navigation), Sprites und Tokenquelle. M2b-DEP-Checkliste bleibt, mit Hinweis „Funktion und Passform“. Keine Änderung an §2, §4, §5, keine neuen Abhängigkeiten | Lead-Auftrag Design übernehmen | §0, §8, §9, §10, §11, §12, §13, §14, §15, §16, §17, AP-16–AP-20, AP-50–AP-55 | Planner (Pflege) |
| 2026-10-25 | Pflegeauftrag Lead „Pflege nach Handtest M2b-DEP“: M2b-DEP abgenommen (PC und iPhone) und `fertig`. H-11 bestätigt (PE-60 nicht mehr angenommen, Reihenfolge M2b-DEP, M2c, M3), Q-31 geklärt („BOSS!“, AP-20 und Lagebericht angepasst, Annahmemarker entfernt). Neu PE-61 (fünf Befunde) und Q-32 (Stick-Größe: Befund 10 % kleiner gegen Design-Token 88 px). (a) Stick und (b) grauer Kasten als Akzeptanzkriterien in AP-53; **Entscheidung gegen ein Vorab-Fix-Paket:** `VirtualStick.ts`, `HudScene.ts` und `hud/*` werden in M2c W2 ohnehin vollständig neu gebaut (AP-53), ein Vorab-Fix würde dieselben Dateien zweimal ändern und in der alten Optik gleich wieder verworfen, das Design gibt für den Stick sogar eine eigene Größe vor; der Kasten ist das Rechteck `ROW_PANEL_W` in `HudScene.ts`, Ursache bekannt; Wartezeit bis W2 ist kurz, weil W1 und W2 direkt hintereinander laufen. (c) bis (e) als AP-56 (M2b-Nachtrag, W8, vor M2c W1, sonnet, M): Ursache (d) Anfangs-Cooldown gleich dem ersten Intervall und Ring-Radius 391 px, Ursache (e) Baum-HP 30 gegen Salve aus drei Lasern mit Schaden-Upgrade, Ursache (c) Druck Level 0 nur 0,27. Eigentum `spawn.ts`, `levels.ts`, `enemies.ts`, `coins.ts` (nur `dropChance`), zugehörige Tests und `docs/balancing.md`, keine Überschneidung mit AP-50/AP-51. Hinweis: Der Draft „Verbesserungsplan Wellenkonzept“ (AP-40 ff., nicht freigegeben, §16) nennt `spawn.ts` und `levels.ts` als Eigentum; AP-56 liegt davor, ein späteres AP-40 baut auf der Eröffnungswelle auf (Kollision beim Zusammenführen prüfen). Keine Änderung an §2, §4, §5 | Lead-Auftrag Pflege nach Handtest M2b-DEP, Nachricht Lead (H-11, Q-31) | §0, §8, §9, §10, §11, §12 (AP-20, AP-53, AP-56), §13, §16, §17 | Planner (Pflege) |
| 2026-10-25 | Wellenabschluss W8 (M2b-Nachtrag): AP-56 (merge cfcdde7, Review Runde 1 bestanden, 254/254) und AP-57 (merge d25bc66, Review Runde 1 bestanden) gemergt. Checks auf dev grün: Install, lint (0 Fehler), typecheck, 254/254 Tests, assets:check, build. `dev` auf origin (d25bc66). AP-56 und AP-57 `fertig`, M2c W1 (AP-50, AP-51) `bereit` | Wellenabschluss W8 | §0, §9, §10, §16, AP-50, AP-51, M2c-DEP | Lead (Pflege) |
| 2026-10-25 | Lehre Lint-Bruch (AP-57): Der Design-Commit 5e58bf2 legte Browser-Skripte in `docs/design/assets` ab. Die ESLint-Prüfung meldete 18 `no-undef` (`document`, `window`) und machte `npm run lint` rot. Hinweis: typescript-eslint schaltet `no-undef` für TS-Dateien ab, deshalb deckt der Lint dort keine Globals ab, den Rest prüft `typecheck`. Lehre: Dateien mit anderer Laufzeit (Browser-Skripte) vorab gegen `npm run lint` prüfen. Designer-Dateien sind über `ignores` in `eslint.config.js` ausgenommen | Lint-Bruch nach Design-Commit, Lead-Auftrag AP-57 | AP-55 (`eslint.config.js`), künftige Pakete außerhalb `src/` und `tests/` | Lead (Pflege) |
| 2026-10-25 | Review-Hinweise AP-56, niedrig, ohne Paket: (a) In `docs/balancing.md` steht der Punkt zu `OPENING_RADIUS_FACTOR` im Abschnitt „Nachjustieren“ zwischen dem Level-0-Punkt und dessen Folgesatz. (b) Der Sprung von Level 9 auf 10 steht einmal als +10 %, einmal als +9 %. (c) Der Abschnitt zu AP-35 („Spawn-Werte Level 0–4 bleiben gleich“) ist durch AP-56 überholt. Der Lead entscheidet, ob ein späterer Schritt die Doku korrigiert | Review-Befund AP-56 | `docs/balancing.md` | Lead (Pflege) |
| 2026-10-25 | Prüfpunkte nach AP-56 für den Handtest M2c-DEP (in §9.2 aufgenommen): Level 10–20 gezielt spielen. Der Druck liegt ab Level 10 über 1, Level 12 = 1,09 (früher als zu schwer bewertet), Level 20 = 1,22. Eröffnungsgegner erscheinen horizontal im Bild, vertikal knapp außerhalb. Baum-HP 50 und Radiusfaktor 0,65 bleiben angenommen bis zur Bestätigung durch den Nutzer (§0, PE-61) | Lead-Auftrag nach AP-56 (Handtest-Notizen) | AP-56, M2c-DEP | Lead (Pflege) |
