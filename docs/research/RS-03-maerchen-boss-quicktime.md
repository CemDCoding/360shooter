# RS-03 – Boss-Angriffe und Quicktime-Abwehr nach Märchen- und Fabelmotiven

**Auftrag (Nutzer am 2026-11-01):** Boss-Angriffe und die Quicktime-Abwehr (osu-artige Kreise, F-29) sind zu einfach. Gesucht sind Vorschläge für neue oder überarbeitete Angriffe und für Quicktimes, die mehr fesseln, mit Motiven aus Märchen, Fabeln und Fabelwesen. Nichts aus bestehenden Spielen übernehmen.
**Rahmen vom Nutzer (2026-11-01):** (1a) Nur die 6 bestehenden Bosse, keine neuen Bosse. (2a) Neben dem Tipp sind auch neue Eingaben erlaubt (Halten, Ziehen, Reihenfolge), die Machbarkeit prüft der Researcher selbst. (3b) Kein Konter-Schaden, PE-158 bleibt. (4b) Kein höherer Schwierigkeitsgrad, nur mehr Abwechslung.
**Projektbezug:** Die Astronautin steht fest in der Mitte und kann nicht ausweichen (§2 F-01, PE-75). Jede Bedrohung wird mindestens 700 ms angekündigt (PE-75), Angriffe mit Schaden mindestens 1200 ms (PE-157). Quicktime nach F-29, PE-157 und PE-158: 1 bis 3 Kreise im Abstand 56 um die Spielerin, Radius 20 plus 4 Toleranz, Ring 800 ms, Wertung „perfekt“ ±80 ms und „gut“ ±160 ms, Mindestabstand 300 ms (`src/config/parry.ts`). Am Handy hat der Stick Vorrang. Es gilt reduced-motion: kein Blinken, kein Wackeln (§9), und Information wird nie nur über Farbe gezeigt. Stack: Phaser 3 und TypeScript, keine neuen Abhängigkeiten. Betroffen sind 6 Bosse mit 18 Angriffen, 11 davon mit Schaden (`src/config/bosses.ts`).
**Kriterien:** (K1) funktioniert mit fester Spielerin, Maus und Touch, ohne den Stick zu stören. (K2) fair: angekündigt, lesbar, nicht schwerer als heute (4b). (K3) barrierearm: es gibt eine Alternative zu Halten und Ziehen, nichts hängt nur an Farbe oder nur an Ton. (K4) das Motiv stammt aus einer gemeinfreien Quelle und die Quicktime-Form folgt aus dem Motiv. (K5) kein Kernmechanismus aus einem bekannten Spiel übernommen. (K6) nutzt den bestehenden Parry-Vertrag, wenig neue Grafik.

## Kurzantwort

Die heutige Abwehr kennt nur eine Form, „tippe, wenn der Ring schließt“. Deshalb fühlen sich alle elf Angriffe gleich an. Vorgeschlagen werden **sechs neue Quicktime-Bausteine**. Jeder stammt aus einem Märchen- oder Fabelmotiv: Halten bis zur Blüte (Dornröschen), Trugkreise, die man nicht antippen darf (Wolf und die sieben Geißlein, Erlkönig), eine Kieselspur in gemerkter Reihenfolge (Hänsel und Gretel), Ziehen auf ein Ziel (Bindung der Apophis-Schlange), Wahl der richtigen Seite (Herzenswaage, Rätsel der Sphinx) und ein fester Takt (Kerberos und der Honigkuchen). Jeder der 6 Bosse bekommt damit einen überarbeiteten oder neuen Angriff mit eigener Form. Die Anzahl der Kreise (1 bis 3), die Zeitfenster und der Schaden bleiben gleich (4b), es ändert sich nur die Art der Aufgabe. Halten und Ziehen brauchen nach WCAG 2.5.1 und den Game Accessibility Guidelines einen Ersatz per Tipp. Dieser Ersatz ist Teil der Vorschläge.

## Ergebnisse

### 1. Was hält Quicktimes und Boss-Angriffe spannend, ohne sie schwerer zu machen?

- **Lesbarkeit ist die Grundlage für Fairness.** Ein Angriff braucht eine klare Ankündigung (große Bewegung, Farbe *und* Form, Ton). Ein Signal steht immer für dasselbe Ergebnis, und der Schaden passt zur gezeigten Gefahr [Q19, Sekundärquelle]. Für das Projekt heißt das: Jeder Baustein bekommt ein eigenes, gleichbleibendes Symbol. Ein Trugkreis sieht bei jedem Boss gleich aus.
- **Lernen in Blöcken:** Spieler brauchen Zeit, bis eine Reaktion automatisch läuft. Neue Muster sollen deshalb einzeln eingeführt werden [Q19]. Daraus folgt: pro Boss nur ein neuer Baustein, im Batch zuerst die bekannte Form, der neue Baustein erst ab dem Zusatzangriff (`extraOnly`, Level-Index 2).
- **Abwechslung statt mehr Zahlen:** Die Quelle rät, Schwierigkeit über Muster und Timing zu steuern statt über weniger Lesbarkeit [Q19]. Weil der Nutzer keinen höheren Schwierigkeitsgrad will (4b), bleibt das Timing gleich und es wechselt nur die *Art* der Aufgabe. Das ist eine eigene Ableitung, die Quelle sagt das so nicht.
- **Was den heutigen Angriffen fehlt** (eigener Befund aus `src/config/bosses.ts`): Alle 11 Angriffe mit Schaden nutzen dieselbe Eingabe. Die Kreise unterscheiden sich nur in der Anzahl. Es gibt keine Entscheidung, nichts zum Merken und keinen Bezug zwischen Angriff und Abwehr.

### 2. Welche Märchen- und Fabelmotive passen zu den 6 Bossen?

Alle Motive stammen aus gemeinfreien Texten. Beschrieben ist jeweils nur der Inhalt, in eigenen Worten.

| Boss (Batch) | Motiv | Kern des Motivs (Beleg) | Passt, weil |
|---|---|---|---|
| Verwurzeltes Baummonster (Wald) | **Dornröschen**, Grimm KHM 50 | Eine Dornenhecke wächst um das Schloss, Prinzen bleiben darin hängen. Nach 100 Jahren werden die Dornen zu Blüten und die Hecke öffnet sich. Der Fluch ist ein Stich an der Spindel [Q1] | Wurzeln und Dornen passen zum Baummonster. Das „Warten, bis es blüht“ wird zum Halten |
| Waldgeist (Wald bei Nacht) | **Hänsel und Gretel**, KHM 15 · **Erlkönig** (Goethe 1782) | Weiße Kiesel leuchten im Mondlicht und zeigen nachts den Heimweg, Brotkrumen fressen die Vögel [Q5]. Der Erlkönig lockt ein Kind mit Trugbildern, die der Vater als Nebel und Weiden erklärt [Q14, schwach belegt] | Nacht, Wald, Lichter und Täuschung passen zum Geist, der schon Trugbilder hat (`decoys`) |
| Riesen-Stein (Elfenwald) | **Das tapfere Schneiderlein**, KHM 20 · **Alvíssmál** (Edda) | Das Schneiderlein wirft Steine auf zwei schlafende Riesen, bis sie sich gegenseitig bekämpfen [Q4]. Ein Zwerg wird vom ersten Sonnenlicht zu Stein [Q12, schwach belegt] | Der Riesen-Stein zerfällt bei 50 % in zwei Steine: zwei Riesen, die sich anrempeln |
| Riesen-Sand-Wurm (Wüste) | **Apophis**, Schlange der ägyptischen Unterwelt | Apophis versperrt der Sonnenbarke den Weg. Götter verzaubern, fesseln und zerschneiden die Schlange (Amduat, 7. Stunde) [Q11] | Langer, ringförmiger Körper (`coil`), Wüste und Ägypten |
| Antiker Wächter-Hund (Pyramiden) | **Kerberos**, Vergil Aeneis VI · **Herzenswaage**, Totenbuch Spruch 125 | Ein dreiköpfiger Wachhund wird mit einem Honigkuchen eingeschläfert [Q10]. Das Herz wird gegen die Feder der Maat gewogen, die „Verschlingerin“ Ammit wartet [Q13, schwach belegt] | Wachhund mit magischer Rolle, Pyramide und Totengericht |
| Pharao (Pyramiden-Oase) | **Rätsel der Sphinx**, Apollodor 3.5.8 | Die Sphinx fragt, was mit einer Stimme erst vier-, dann zwei-, dann dreifüßig geht. Die Antwort ist der Mensch (Kind, Erwachsener, Greis mit Stock) [Q9] | Sphinx gibt es schon als Gegner in Pyramiden und Oase, der Pharao „befiehlt“ das Rätsel |

**Reserve-Motive**, falls ein Vorschlag verworfen wird: Wolf und die sieben Geißlein (die weiße Pfote am Fenster als Echtheitsprüfung) [Q3], Rumpelstilzchen (den richtigen Namen erraten) [Q2], Frau Holle (Brot aus dem Ofen holen, Apfelbaum schütteln) [Q6], Rattenfänger von Hameln (Flötenmelodie, der alle folgen) [Q7], Aesop „Hirtenjunge und Wolf“ (falscher Alarm) und „Löwe und Maus“ (Maus nagt das Netz durch) [Q8].

### 3. Neue Quicktime-Bausteine (Eingaben), geprüft für Maus und Touch

Alle Bausteine nutzen den bestehenden Vertrag: Ein Kreis hat einen Winkel und einen Trefferzeitpunkt (`ParryCircle.hitAtMs`), außerdem gelten dieselben Fenster und derselbe Schadensanteil `damage / Kreisanzahl` (PE-158). Neu ist ein Feld „Art“ je Kreis.

| Nr. | Baustein | Eingabe | Wertung (passend zu PE-158) | Motiv |
|---|---|---|---|---|
| B1 | **Tipp-Kreis** | wie heute | wie heute | – |
| B2 | **Blüten-Halt** | Drücken, wenn der äußere Ring schließt. Halten, während eine Knospe aufgeht (300–600 ms). Loslassen, wenn sie offen ist (zweiter Ring) | Drücken und Loslassen jeweils im Fenster ergibt einen Treffer. Ist eins nur „gut“, gilt „gut“ | Dornröschen |
| B3 | **Trugkreis** | **Nicht** antippen. Er steht zwischen echten Kreisen und trägt ein anderes Symbol und eine andere Umrisslinie (z. B. Spindel statt Rose, Nebel statt Kiesel), nie nur eine andere Farbe | Antippen kostet einen Anteil Schaden (gedeckelt auf den vollen Angriffsschaden). Ignorieren ist richtig. Er zählt nicht zur Kreisanzahl | Spindel (Dornröschen), Erlkönig, Geißlein-Pfote |
| B4 | **Kieselspur** | Während der Ankündigung leuchten 2–3 Kiesel nacheinander auf, je mit Ton. Danach erscheinen alle gleichzeitig mit eigenem Ring, getippt wird in der gezeigten Reihenfolge | Je Kiesel wie B1. Falsche Reihenfolge zählt als verfehlt | Hänsel und Gretel |
| B5 | **Bann-Zug** | Kreis auf ein markiertes Ziel ziehen (gerade, beliebiger Weg). **Ersatz:** erst Kreis, dann Ziel antippen | Abgelegt bzw. Ziel getippt bis Trefferzeitpunkt + „gut“-Fenster ergibt einen Treffer. Das Ziel ist großzügig (≥ Kreisgröße) | Apophis wird gefesselt, Steine auf die Riesen |
| B6 | **Waagschale / Rätsel** | 2–3 Kreise mit Symbolen, nur einer ist richtig. Der Hinweis steht in der Ankündigung (Waage neigt sich sichtbar, Bild zum Rätsel) | Richtiger Kreis im Fenster ergibt einen Treffer. Falscher Kreis zählt als verfehlt | Herzenswaage, Sphinx |
| B7 | **Schlummertakt** | 3 Kreise im festen, hör- und sichtbaren Takt (z. B. 400 ms), jeder an einem Kopf des Bosses | wie B1 | Kerberos |

**Technische Machbarkeit:** Phaser 3 liefert pro Zeiger die Haltedauer (`getDuration()`, `downTime`, `upTime`) und die Strecke seit dem Druck (`getDistance()`, `getAngle()`) [Q18]. Damit lassen sich B2 und B5 ohne neue Bibliothek bauen. B4 und B7 sind nur Zeitpläne über `hitAtMs`, B3 und B6 sind Kreise mit anderer Wertung. Am Handy kann der Stick-Daumen liegen bleiben, der zweite Finger tippt oder hält. Ob das Spiel heute einen zweiten Touch-Zeiger annimmt, muss der Lead im Code prüfen. Das habe ich nicht geprüft.

**Zielgröße:** Kreis-Durchmesser 40 plus 2 × 4 Toleranz ergibt 48 Arena-Einheiten. Bei 360 Einheiten Höhe auf dem iPhone 15 quer (etwa 393 pt) sind das etwa 52 pt, also über den 44 × 44, die WCAG 2.5.5 (AAA) verlangt [Q17]. Gerechnet, nicht gemessen. Das gilt auch für B6, solange die Kreise nicht kleiner werden.

### 4. Barrierefreiheit und Fairness der neuen Formen

- **Halten:** Die Game Accessibility Guidelines empfehlen, das Halten von Tasten zu vermeiden oder eine Alternative anzubieten (Stufe „intermediate“) [Q15]. B2 hält deshalb höchstens 600 ms, und es gibt den Ersatz „zweimal tippen“ (Druck- und Loslass-Zeitpunkt).
- **Ziehen:** WCAG 2.5.1 (Stufe A) verlangt für pfadgebundene Gesten eine Alternative mit einem einzelnen Zeiger ohne Pfad, z. B. einen Tipp [Q16]. B5 ist kein fester Pfad, sondern Ablegen auf ein Ziel. Trotzdem gibt es den Ersatz „Kreis tippen, dann Ziel tippen“.
- **Kein Hämmern:** Wiederholte Eingaben (Button-Mashing) sollen vermieden werden [Q15]. Kein Baustein verlangt schnelles Mehrfachtippen.
- **Nicht nur Farbe, kein Flackern:** [Q15] stimmt hier mit den Projektregeln überein. Trugkreise unterscheiden sich deshalb über Symbol und Umriss, und es gibt kein Blinken (auch nicht bei reduced-motion).
- **Präzises Timing:** [Q15] empfiehlt auf der höchsten Stufe, präzises Timing nicht zur Pflicht zu machen. Das Projekt hat sich mit F-29 bewusst für Timing entschieden. Abgemildert wird das, weil ein verfehlter Kreis nur einen Anteil Schaden kostet. Eine Option „Einfache Abwehr“, in der alle Bausteine als B1 laufen, würde das weiter abschwächen (RS-03.2).
- **Denklast:** B4 (Merken) und B6 (Wählen) sind kognitiv schwerer als B1, obwohl die Zeitfenster gleich bleiben. Damit 4b gilt, bekommen sie eine längere Ankündigung (B4: Vorschau plus 800 ms Ring, etwa 1800 ms insgesamt). Eigene Einschätzung, im Handtest zu prüfen.
- **Ton:** Takt (B7) und Kieselspur (B4) haben Töne, sind aber auch stumm vollständig sichtbar (Stummschalt-Taste F-13).

### 5. Überarbeitung je Boss

Die Kreisanzahl bleibt wie in `src/config/bosses.ts`, ebenso Abklingzeit und Schaden. Angriffe ohne Schaden bleiben ohne Kreise (PE-157), außer wo ausdrücklich genannt.

| Boss | Angriff heute | Vorschlag | Baustein | Kreise |
|---|---|---|---|---|
| Baummonster | `rootThrust` (Wurzeln brechen unter ihr hervor) | **Dornenknospe:** Die Wurzelknospe aus PE-75 wird zur Dornenrose. Sie erscheint als Kreis, man hält, bis die Rose aufblüht, beim Loslassen verwandelt sich die Wurzel in Blüten (kein Schaden). Die 6 Lasertreffer auf die Knospe bleiben | B2 + B1 | 2 (1 Halt, 1 Tipp) |
| | `rootRing` (Zusatz, Ring mit Lücke) | **Dornenhecke:** Der Ring zieht sich zusammen, auf ihm sitzen 2 Rosen-Kreise und 1 Spindel-Trugkreis. Rosen tippen, die Spindel nicht (Stich der Spindel) | B1 + B3 | 2 (+1 Trug) |
| Waldgeist | `orbFan` (Geisterkugel-Fächer) | **Mondkiesel:** Vor dem Fächer leuchten 2 Kiesel nacheinander auf, dann in dieser Reihenfolge tippen. Die Kugeln bleiben mit dem Laser abschießbar (PE-75) | B4 | 1 → 2* |
| | `decoys` (Zusatz, Trugbilder, heute ohne Schaden) | **Erlkönigs Töchter:** Die 2 Trugbilder und der echte Geist werfen je einen Kreis. Nur der des echten Geistes ist fest, die anderen haben einen Nebelumriss. Neu mit kleinem Schaden (z. B. 8) | B1 + B3 | 1 (+2 Trug) |
| Riesen-Stein | `roll` (rollt zur Mitte, prallt ab) | **Morgenlicht:** Während der Stein rollt, geht eine Sonne auf. Drücken, wenn er die Lichtlinie erreicht, halten, bis das Licht ihn überzieht. Er erstarrt kurz und prallt ab (Alvíssmál). Die übrigen 2 Kreise bleiben Tipp-Kreise | B2 + B1 | 3 |
| | neu, Zusatz nach dem Zerfall bei 50 % | **Riesenzank:** Beide Teilsteine rollen gleichzeitig von zwei Seiten. Einen Kiesel-Kreis auf die Bahn des einen Steins ziehen, der lenkt ab und beide prallen aneinander statt auf die Spielerin (Schneiderlein). Kein Schaden am Boss (3b) | B5 | 2 |
| Sand-Wurm | `coil` (Zusatz, Körper umringt sie) | **Fessel der Göttinnen:** Zwei Seil-Kreise auf die leuchtenden Glieder ziehen (oder tippen, dann Ziel tippen). Der Ring löst sich (Apophis wird gebunden) | B5 | 2 |
| | `burrow` | unverändert B1, aber die Kreise liegen auf der Seite, auf der die Sandspur ankommt, als Hinweis, wo er durchbricht | B1 | 3 |
| Wächter-Hund | `guardBark` (Schockwelle mit Lücke) | **Drei Köpfe, ein Schlaflied:** Die Welle kommt als drei Bellstöße im festen Takt. Je ein Kreis an jedem Kopf-Winkel, jeder Treffer lässt einen Kopf einnicken (Honigkuchen) | B7 | 2 → 3* |
| | neu, Zusatz (statt eines zweiten Beschwörungsangriffs in den Zusatz-Leveln) | **Herzenswaage:** Eine Waage erscheint, die Schalen tragen Herz und Feder. In der Ankündigung neigt sie sich sichtbar. Getippt wird die obere, also leichtere Schale. Die Waage taucht 2-mal hintereinander auf | B6 | 2 |
| Pharao | `goldCurse` (Gold-Spirale) | **Rätsel der Sphinx:** Über dem Pharao erscheint ein Bild (krabbelndes Kind, aufrechter Mensch oder Greis mit Stock), dazu 3 Kreise mit 4, 2 und 3 Beinen. Den passenden tippen. Die Spirale bleibt | B6 | 1 |
| | `sandstorm` (Zusatz) | unverändert B1, aber 1 Trugkreis aus Sand (Luftspiegelung, wellige Kontur) | B1 + B3 | 1 (+1 Trug) |

\* Bei Kieselspur und Takt passen mehr Kreise zur Form. Damit der Schaden gleich bleibt (4b), sinkt der Anteil je Kreis entsprechend (`damage / Kreisanzahl`). Alternativ bleibt die Zahl gleich, das entscheidet der Planner.

**Für mehr Abwechslung bei gleicher Schwierigkeit (4b):** Winkel und Reihenfolge der Kreise werden je Angriff zufällig gewählt, mit festem Startwert für Tests. Jeder Treffer zeigt kurz die Wertung („PERFEKT“ bzw. „GUT“) am Kreis. Eine ganz abgewehrte Abwehr zeigt neben „PARRY!“ ein kleines Motivbild (Rose, Kiesel, Seil, Feder), ohne Spielvorteil (3b).

### 6. Abgrenzung zu bestehenden Spielen (eigene Einschätzung, schwach belegt)

Der bestehende Kreis mit schrumpfendem Ring stammt sinngemäß aus osu! (Hit-Circle mit Annäherungsring). osu! hat außerdem **Slider** (einem Pfad folgen) und **Spinner** (drehen) [Q20]. Beides wird hier bewusst **nicht** übernommen: B5 ist Ablegen auf ein Ziel ohne Pfad, und es gibt keine Drehgeste. Bewusst vermieden werden auch das Zerschneiden per Wischgeste (bekannt aus Fruit-Ninja-artigen Spielen), Pinsel- und Symbolzeichnen (bekannt aus Ōkami) und Ruf-und-Antwort-Rhythmus (bekannt aus der Rhythm-Heaven-Reihe). Halten, Nicht-Tippen, Reihenfolge merken (wie beim Spielzeug „Simon“, 1978), Wählen und Takt sind allgemeine Spielformen ohne Bezug zu einem bestimmten Titel. Das Besondere hier ist die Kopplung an Märchenmotive und an die feste Spielerin. Nicht geprüft habe ich Rechte an Spielmechaniken (Patente). Für den privaten Stich spielt das keine Rolle, vor einer Veröffentlichung im App Store ist es **vom Nutzer zu prüfen**.

## Vorschläge an den Planner

### RS-03.1 – Quicktime-Bausteine B2 bis B7
- **Vorschlag:** Der Parry-Vertrag bekommt je Kreis eine Art (`tap`, `hold`, `decoy`, `sequence`, `drag`, `choice`, `beat`) mit den nötigen Werten (Haltedauer, Ziel, richtige Wahl, Takt). Logik und Wertung kommen nach Ergebnis 3 dazu, die Fenster ±80/±160 und der Schadensanteil nach PE-158 bleiben. Trugkreise zählen nicht zur Kreisanzahl, Antippen kostet einen Anteil. Haltezeit höchstens 600 ms. Alle Werte stehen in `src/config/parry.ts` bzw. `bosses.ts`.
- **Begründung:** Ergebnis 1 (eine einzige Eingabeform), Ergebnis 3 (machbar mit Phaser-Pointer [Q18]), Wunsch 2a des Nutzers.
- **Plan-Bezug:** ändert PE-157 („Ein Klick/Tipp auf einen Kreis“) und §2 F-29. Vertrag `src/contracts/parry.ts`, Logik `src/logic/parry.ts`, `ParryOverlay.ts`, neues Paket.
- **Größe:** L
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** Architektur: Vertrag `ParryCircle` erweitert, Eingabe mit Halten, Ziehen und evtl. zweitem Touch-Zeiger neben dem Stick
- **Status:** übernommen (freigegeben 2026-11-01)

### RS-03.2 – Ersatz ohne Halten und Ziehen, Option „Einfache Abwehr“
- **Vorschlag:** B2 geht auch durch zwei Tipps (Druck- und Loslass-Zeitpunkt), B5 auch durch „Kreis tippen, dann Ziel tippen“, beides immer aktiv. Dazu eine Einstellung „Einfache Abwehr“, in der alle Bausteine als Tipp-Kreis laufen (Trugkreise entfallen, Wahl und Reihenfolge werden ein einfacher Tipp).
- **Begründung:** WCAG 2.5.1 [Q16], Game Accessibility Guidelines zu Halten und präzisem Timing [Q15], Ergebnis 4.
- **Plan-Bezug:** Abnahmekriterium für das Paket aus RS-03.1. Die Einstellung kommt in das bestehende Einstellungs- bzw. Pausemenü.
- **Größe:** M
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** Architektur: neue Einstellung im lokalen Spielstand (`localStorage`)
- **Status:** übernommen (freigegeben 2026-11-01)

### RS-03.3 – Baummonster „Dornröschen“
- **Vorschlag:** `rootThrust` wird zur Dornenknospe (B2 + B1, 2 Kreise), `rootRing` zur Dornenhecke (2 Rosen-Kreise plus 1 Spindel-Trugkreis), wie in Ergebnis 5. Schaden und Abklingzeit bleiben.
- **Begründung:** Motiv aus [Q1]. Ein Baustein je Angriff, der neue Trugkreis erst im Zusatzangriff (Ergebnis 1).
- **Plan-Bezug:** präzisiert PE-34 und PE-75 (Baummonster), `RootMonster.ts`, `config/bosses.ts`. Nach RS-03.1.
- **Größe:** M
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein
- **Status:** übernommen (freigegeben 2026-11-01)

### RS-03.4 – Waldgeist „Mondkiesel und Erlkönigs Töchter“
- **Vorschlag:** `orbFan` mit Kieselspur (B4), `decoys` bekommt kleinen Schaden (Startwert 8) und Trugkreise (B1 + B3), wie in Ergebnis 5.
- **Begründung:** [Q5], [Q14] (schwach belegt). Der Waldgeist hat bisher nur einen Angriff mit Schaden.
- **Plan-Bezug:** ändert PE-34 (Trugbilder machen jetzt Schaden), `ForestGhost.ts`, `config/bosses.ts`. Nach RS-03.1.
- **Größe:** M
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein
- **Status:** übernommen (freigegeben 2026-11-01)

### RS-03.5 – Riesen-Stein „Morgenlicht und Riesenzank“
- **Vorschlag:** `roll` mit Morgenlicht (B2 + 2 × B1). Neuer Zusatzangriff „Riesenzank“ nach dem Zerfall bei 50 % (B5, 2 Kreise): Die Teilsteine prallen aneinander statt auf die Spielerin, kein Schaden am Boss.
- **Begründung:** [Q4], [Q12] (schwach belegt). Der Riesen-Stein hat heute nur einen Angriff, deckt aber Level 10 bis 20 ab (11 Level, die meisten aller Bosse).
- **Plan-Bezug:** ändert PE-34 (Riesen-Stein bekommt einen Zusatzangriff), `GiantStone.ts`, `config/bosses.ts`. Nach RS-03.1.
- **Größe:** M
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein
- **Status:** übernommen (freigegeben 2026-11-01)

### RS-03.6 – Sand-Wurm „Fessel der Göttinnen“
- **Vorschlag:** `coil` mit Bann-Zug (B5, 2 Kreise). Bei `burrow` liegen die Kreise auf der Seite, auf der die Sandspur ankommt.
- **Begründung:** [Q11]. Ergebnis 5.
- **Plan-Bezug:** präzisiert F-20 (Riesen-Sand-Wurm), `GiantSandWorm.ts`, `config/bosses.ts`. Nach RS-03.1.
- **Größe:** S
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein
- **Status:** übernommen (freigegeben 2026-11-01)

### RS-03.7 – Wächter-Hund „Schlaflied und Herzenswaage“
- **Vorschlag:** `guardBark` als Schlummertakt (B7). Neuer Zusatzangriff Herzenswaage (B6, 2 Waagen nacheinander) in den Zusatz-Leveln, `summonMummies` bleibt.
- **Begründung:** [Q10], [Q13] (schwach belegt). Ergebnis 5.
- **Plan-Bezug:** präzisiert F-20, neuer Angriff in `GuardianDog.ts` und `config/bosses.ts`. Nach RS-03.1.
- **Größe:** M
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein
- **Status:** übernommen (freigegeben 2026-11-01)

### RS-03.8 – Pharao „Rätsel der Sphinx“
- **Vorschlag:** `goldCurse` bekommt die Rätsel-Wahl (B6, 1 Kreis aus 3 Symbolen), `sandstorm` einen Sand-Trugkreis (B3).
- **Begründung:** [Q9]. Ergebnis 5.
- **Plan-Bezug:** präzisiert F-20, `Pharaoh.ts`, `config/bosses.ts`. Nach RS-03.1.
- **Größe:** S
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein
- **Status:** übernommen (freigegeben 2026-11-01)

### RS-03.9 – Designer-Nachtrag für Quicktime-Symbole
- **Vorschlag:** Der Designer entwirft die Symbole und Zustände der Bausteine (Rose bzw. Knospe, Spindel, Kiesel, Nebelumriss, Seil und Ziel, Sonne bzw. Lichtlinie, Waage mit Herz und Feder, Beine 4/2/3 mit Rätselbildern, Kopf-Marken) und die Wertungsanzeige je Kreis. Jeder Baustein muss ohne Farbe erkennbar sein, ohne Blinken, und bei reduced-motion gelten Ersatzanimationen.
- **Begründung:** Ergebnis 1 (gleichbleibende Symbolsprache [Q19]) und Ergebnis 4 (nicht nur Farbe [Q15]).
- **Plan-Bezug:** [Mensch]-Schritt für den Design-Brief vor den Boss-Paketen RS-03.3 bis .8.
- **Größe:** M
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** Design: neue Sprites und Tokens
- **Status:** übernommen (freigegeben 2026-11-01)

## Vertrauen und Lücken

- **Motive:** Dornröschen, Rumpelstilzchen, Geißlein, Schneiderlein, Hänsel und Gretel und Frau Holle habe ich im Text der Grimm-Ausgabe von 1857 auf Wikisource gelesen. Aesop, Apollodor, Vergil und die Amduat-Beschreibung des Royal Collection Trust auch. **Schwach belegt** sind: der Erlkönig (Text nicht abrufbar, nur das Entstehungsjahr 1782 über eine Sekundärquelle), Alvíssmál (die Seite mit der Bellows-Übersetzung war gesperrt, Inhalt nur über Suchergebnisse bestätigt) und die Herzenswaage (Seiten des British Museum gesperrt, Inhalt über mehrere Suchergebnisse übereinstimmend). Alle drei Stoffe sind sehr bekannt, der Nutzer kann sie leicht selbst nachlesen.
- **Design-Prinzipien:** Für Lesbarkeit und Blocklernen habe ich nur eine Sekundärquelle gefunden (Game Developer, Blog-Beitrag 2022 [Q19]). Den GDC-Vortrag dahinter konnte ich nicht abrufen.
- **Schwierigkeit (4b):** Ob Merken (B4) und Wählen (B6) wirklich nicht schwerer wirken, lässt sich nur im Handtest prüfen. Die Ankündigungszeiten sind Startwerte.
- **Zweiter Finger am Handy:** Ich habe nicht geprüft, ob die Eingabe heute mehrere Touch-Zeiger annimmt. Das betrifft B2 und B5 bei gehaltenem Stick.
- **Abgrenzung zu Spielen und Recht:** Ergebnis 6 ist eine eigene Einschätzung ohne Rechte- oder Patentrecherche. Das ist keine Rechtsberatung, vor einer Veröffentlichung vom Nutzer zu prüfen. Die Märchentexte sind gemeinfrei. Bekannte Verfilmungen (z. B. bestimmte Figurenentwürfe) sind es nicht, die Gestaltung soll sich deshalb nur an den Texten orientieren.

## Quellen

- [Q1] Dornröschen (KHM 50), Brüder Grimm, Ausgabe letzter Hand 1857, Wikisource, https://de.wikisource.org/wiki/Dornr%C3%B6schen_(1857), abgerufen 2026-11-01 – Primärquelle
- [Q2] Rumpelstilzchen (KHM 55), Brüder Grimm 1857, Wikisource, https://de.wikisource.org/wiki/Rumpelstilzchen_(1857), abgerufen 2026-11-01 – Primärquelle
- [Q3] Der Wolf und die sieben jungen Geislein (KHM 5), Brüder Grimm 1857, Wikisource, https://de.wikisource.org/wiki/Der_Wolf_und_die_sieben_jungen_Geislein_(1857), abgerufen 2026-11-01 – Primärquelle
- [Q4] Das tapfere Schneiderlein (KHM 20), Brüder Grimm 1857, Wikisource, https://de.wikisource.org/wiki/Das_tapfere_Schneiderlein_(1857), abgerufen 2026-11-01 – Primärquelle
- [Q5] Hänsel und Grethel (KHM 15), Brüder Grimm 1857, Wikisource, https://de.wikisource.org/wiki/Hänsel_und_Grethel_(1857), abgerufen 2026-11-01 – Primärquelle
- [Q6] Frau Holle (KHM 24), Brüder Grimm 1857, Wikisource, https://de.wikisource.org/wiki/Frau_Holle_(1857), abgerufen 2026-11-01 – Primärquelle
- [Q7] Die Kinder zu Hameln, Brüder Grimm, Deutsche Sagen Bd. 1 (1816), Wikisource, https://de.wikisource.org/wiki/Die_Kinder_zu_Hameln, abgerufen 2026-11-01 – Primärquelle
- [Q8] Aesop's Fables, übersetzt von G. F. Townsend, Project Gutenberg, https://www.gutenberg.org/files/21/21-h/21-h.htm, abgerufen 2026-11-01 – Primärquelle (Übersetzung)
- [Q9] Apollodor, Bibliotheke 3.5.8, übersetzt von J. G. Frazer, Perseus Digital Library, https://www.perseus.tufts.edu/hopper/text?doc=Apollod.+3.5.8, abgerufen 2026-11-01 – Primärquelle (Übersetzung)
- [Q10] Vergil, Aeneis VI 417 ff., übersetzt von J. Dryden, Perseus Digital Library, https://www.perseus.tufts.edu/hopper/text?doc=Verg.+A.+6.417, abgerufen 2026-11-01 – Primärquelle (Übersetzung)
- [Q11] Papyrus des Nesmin mit der 7. Stunde des Amduat (300–275 v. Chr.), Royal Collection Trust, https://col.rct.uk/collection/1145260/section-of-the-papyrus-belonging-to-nesmin-with-the-seventh-hour-of-the-amduat, abgerufen 2026-11-01 – Primärquelle (Museum)
- [Q12] Alvíssmál, Poetic Edda, übersetzt von H. A. Bellows (1923), Sacred Texts, https://sacred-texts.com/neu/poe/poe12.htm, Abruf gesperrt, Inhalt über Suchergebnisse 2026-11-01 – schwach belegt
- [Q13] Totenbuch, Herzenswägung (Papyrus des Ani, British Museum EA 10470), Sammlungsseite https://www.britishmuseum.org/collection/object/Y_EA10470-3, Abruf gesperrt, Inhalt über Suchergebnisse 2026-11-01 – schwach belegt
- [Q14] J. W. von Goethe, Erlkönig (1782, aus „Die Fischerin“), Text nicht abrufbar, Angaben über https://en.wikipedia.org/wiki/Erlk%C3%B6nig, 2026-11-01 – Sekundärquelle, schwach belegt
- [Q15] Game Accessibility Guidelines, Gesamtliste, https://gameaccessibilityguidelines.com/full-list/, abgerufen 2026-11-01 – Primärquelle (Richtlinie)
- [Q16] W3C, Understanding WCAG 2.2 SC 2.5.1 Pointer Gestures, https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html, abgerufen 2026-11-01 – Primärquelle
- [Q17] W3C, Understanding WCAG 2.2 SC 2.5.5 Target Size (Enhanced), https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html, abgerufen 2026-11-01 – Primärquelle
- [Q18] Phaser 3 API, Klasse `Input.Pointer`, https://docs.phaser.io/api-documentation/class/input-pointer, abgerufen 2026-11-01 – Primärquelle
- [Q19] A. Kubodera, Designing for Difficulty: Readability in ARPGs, Game Developer, 2022-04-19, https://www.gamedeveloper.com/game-platforms/designing-for-difficulty-readability-in-arpgs – Sekundärquelle
- [Q20] osu! wiki, Hit object, https://osu.ppy.sh/wiki/en/Gameplay/Hit_object, abgerufen 2026-11-01 – Primärquelle

## Entscheidungen

- Nutzer am 2026-11-01: Rahmen 1a (nur bestehende Bosse), 2a (neue Eingaben erlaubt, Prüfung durch den Researcher), 3b (kein Konter), 4b (gleiche Schwierigkeit)
- Nutzer am 2026-11-01: RS-03.1 bis RS-03.9 freigegeben
