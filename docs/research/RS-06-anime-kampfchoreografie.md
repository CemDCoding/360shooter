# RS-06 – Finisher 2.0: Anime-Kampfchoreografie, Ideen je Boss und Technik

**Auftrag (Nutzer am 2026-11-03, H-45, PE-240):** Wie werden Kampfmomente (≈ 3 bis 4 s) und Batch-Cinematics (15 s, Level 40 20 s) flüssig und eindrucksvoll, je Boss eigenständig, und mit Phaser 3.90 auf dem iPhone 15 machbar?
**Rückfragen:** 1a (Astronautin greift gemischt an: Laser, Laserklinge, Rückstoß, je Boss passend), 2a (Drehen von Pixel-Art recherchieren und empfehlen), 3a (Ideen als Takt-Ablauf mit ungefähren ms).
**Projektbezug:** F-43, PE-231 bis PE-241: Figuren aus Teilen mit Code-Animation, keine neue Abhängigkeit, kein Video, kein neuer Ton; Ablauf, Speicherung, Überspringen ab 3 s, „EFFEKTE REDUZIEREN“ und Blitz-Grenze (WCAG 2.3.1, §5) bleiben; nur eigene Gestaltung. Phaser 3.90 mit `Phaser.AUTO` (Canvas-Rückfall möglich), `pixelArt: true`, Vollbilder 320×180 bei 2× (PE-203). Zielgerät iPhone 15, Safari als Homescreen-App. Märchenmotive je Boss aus RS-03 (M9), Namen der Finale aus PE-203.
**Kriterien:** eigenes Gefühl je Boss; 60 fps am iPhone; trägt auch ohne WebGL; keine neue Abhängigkeit; Blitz-Grenze; Daten in `src/config`; eigene Gestaltung.

## Kurzantwort

„Flüssig“ und „anime-haft“ ziehen in verschiedene Richtungen. 60 fps mit durchgehendem Easing wirkt schnell weich und schwammig. Den Anime-Eindruck machen **harte Haltepunkte im Wechsel mit sehr schnellen Bewegungen**: Antizipation, ein Schnitt mit Smear oder Nachbildern, Treffer-Stopp mit abklingendem Zittern, dann Nachschwingen [Q1][Q2][Q3][Q6]. Kamera, Partikel und Spuren laufen deshalb mit 60 fps, die Figuren gehen von Pose zu Pose mit kurzen Halten. Technisch reicht Phaser 3.90 ohne Zusatzpaket: Container als Rig, `Timeline` mit Zeitpunkten in ms, Tween-Easing samt `Stepped`, Kamera-Effekte und Partikel [Q9]–[Q13]. Rope, Tint, FX und Partikel-Tönung gibt es nur unter WebGL [Q14][Q16][Q13]. Spuren sollten deshalb als Nachbilder entstehen und Treffer-Weiß als vorgezeichnete Silhouette, sonst fehlen sie im Canvas-Rückfall. Alle Zeiten müssen in ms laufen, weil Safari im Stromsparmodus absichtlich auf 30 fps drosselt [Q19]. Für alle 6 Bosse gibt es je 3 Kampfmoment-Ideen und je ein Cinematic-Gerüst, alle aus den M9-Märchenmotiven abgeleitet.

## Ergebnisse

### 1. Prinzipien und Richtwerte für einen Treffer

- **Klassische Prinzipien:** Antizipation (das Publikum auf die Aktion vorbereiten), Slow-in/Slow-out, Bögen, Timing als Träger von Gewicht, Squash and Stretch, Staging, Nachschwingen/überlappende Bewegung und Übertreibung. Sie stammen aus dem Disney-Studio der 1930er und wurden von Lasseter 1987 auf Keyframe-Animation am Rechner übertragen [Q1]. Zahlen nennt die Quelle nicht.
- **Hit-Stop (Treffer-Stopp):** Angreifer und Getroffener frieren gleich lang ein. Mehr Schaden bedeutet einen längeren Stopp, es gibt aber eine Obergrenze. Fernangriffe bekommen weniger Stopp. Der Getroffene zittert, am Boden waagerecht, in der Luft senkrecht. Das Zittern beginnt stark und klingt ab, und der Angreifer bewegt sich währenddessen minimal weiter. Zeitlupe ist ein eigenes Mittel und nicht dasselbe wie Hit-Stop [Q2][Q3].
- **Zahlen:** Capcom nennt als Beispiel 8, 12 und 16 Frames für leichte, mittlere und schwere Treffer, bei 60 fps also ≈ 133, 200 und 267 ms. Bei Mehrfachtreffern wird der Stopp verkürzt [Q4] (schwach belegt: Die Seite war beim Abruf nicht erreichbar, die Werte stammen aus dem Suchauszug). Einen allgemeingültigen Bestwert gibt es nicht (siehe „Vertrauen und Lücken“).
- **Smear Frames:** Es gibt zwei Arten. Beim gestreckten Zwischenbild wird die Figur über 1 bis 2 Bilder verzerrt. Bei Mehrfachbildern stehen Kopien der Figur oder ihrer Teile entlang der Bahn. In Spielen werden sie wegen der Technik selten genutzt, am ehesten bei fester Kamera und stilisierter Grafik [Q5]. Für Pixel-Art aus Teilen sind Mehrfachbilder (Nachbilder) ohne neue Zeichnung möglich. Gestreckte Smears müsste der Designer je Teil als eigenes Bild zeichnen.
- **Anime-Timing:** Typisch sind unregelmäßiges Timing mit langen Halten und plötzlicher Bewegung (Beispiel: eine Pose 12 Bilder lang halten, dann wieder jedes Bild neu), weite Abstände zwischen den Bildern, starke Schlüsselposen, Impact Frames als Standbild oder animiert, kurze Zeitlupe nur am Treffer und Kamerafahrten mit Zoom [Q6] (Fan-Analyse, schwach belegt).
- **Was daraus für 60 fps folgt (eigene Bewertung):** Ein Kampfmoment wirkt anime-haft, wenn er aus **wenigen starken Posen** besteht, die kurz gehalten werden (≈ 80 bis 250 ms), mit **sehr kurzen Übergängen** (≈ 50 bis 120 ms, Ease `Expo.easeOut` oder `Back.easeOut`). Durchgehende, gleichmäßig weiche Tweens wirken dagegen wie Puppenspiel. Kamera, Partikel und Nachbilder laufen voll flüssig, sie tragen die „60 fps“.

**Richtwert-Raster (eigene Ableitung aus [Q1]–[Q6], im Prototyp H-47 nachjustieren):**

| Phase | Dauer | Mittel |
|---|---|---|
| Antizipation | 150–400 ms (Boss schwerer: bis 600 ms) | Ausholen gegen die Schlagrichtung, Halten der Pose 80–150 ms |
| Aktion | 50–120 ms | Sprung zur Endpose, 2–4 Nachbilder, Bewegungsspur |
| Treffer-Stopp | 100–200 ms, Schlusstreffer bis 300 ms | beide eingefroren, Zittern des Getroffenen klingt ab, Funken |
| Reaktion/Zeitlupe | 300–800 ms bei `timeScale` 0,2–0,4 | Boss-Teile lösen sich verzögert (überlappend) |
| Nachschwingen/Halten | 200–500 ms | Endpose der Astronautin, Partikel sinken |

### 2. Dramaturgie: 3,5 s und 15 s ohne neuen Ton

- **Kampfmoment (≈ 3,5 s):** ein Schlagabtausch, nicht mehrere. Sinnvoll ist das Raster Boss-Antizipation (Bedrohung) → Ausweichen oder Konter → **ein** Haupttreffer → typgerechte Reaktion → Zerfall → „BEZWUNGEN!“. Zwei Treffer gehen nur, wenn der erste klein bleibt, ohne großflächigen Blitz.
- **Cinematic (15 s, 5 × ≈ 3 s, PE-232):** Der Rhythmus wechselt bewusst zwischen ruhig, schnell, Spannung, Explosion und Ausklang. Einstellung 3 (Aufladen) ist die ruhige Spannung vor dem Höhepunkt, Einstellung 4 die einzige mit vollem Impact Frame und Zeitlupe. Level 40 (20 s) bekommt eine **zusätzliche Einstellung als Rückblick** (Silhouetten der fünf besiegten Bosse), so wirkt es wie ein Spielende statt wie ein längerer Kampf (eigene Gestaltung).
- **Achse und Schnitt:** Die Kamera bleibt auf einer Seite der Handlungsachse, damit die Figuren in jeder Einstellung auf derselben Seite stehen. Wird die Achse gewechselt, wirkt das verwirrend oder bewusst beunruhigend [Q8]. Vorschlag: Astronautin links, Boss rechts, gewechselt wird nur einmal und mit Absicht (z. B. im Schlusstreffer).
- **Ohne neuen Ton (PE-237):** Den Takt geben Bild-Akzente: Halte, Zittern, Funken, Zeitlupe. Vorhandene Platzhalter-Töne liegen nur auf den Haupttreffern.
- **Blitz-Grenze (§5):** höchstens 3 großflächige Helligkeitswechsel je Sekunde. Daraus folgt: Im Schlagabtausch (Einstellung 2) bekommen nur kleine Funken einen Treffer, kein Vollbild-Blitz. Zwischen zwei Impact-Bildern liegen ≥ 350 ms.

### 3. Ideen je Boss (eigene Gestaltung, aufbauend auf RS-03)

Die Takte sind Richtwerte in ms. ⚡ markiert einen großflächigen Helligkeitswechsel (zählt für die Blitz-Grenze, entfällt bei „EFFEKTE REDUZIEREN“). **Empf.** = meine Empfehlung als Kampfmoment, die Begründung steht jeweils dabei. Angriffsarten der Astronautin nach 1a: **L** Laser, **K** Laserklinge (eigene Form: kurze Klinge aus dem Gewehrlauf, kein Schwertgriff), **R** Rückstoß-Sprung.

**Baummonster (Wald, Dornröschen; Finale L4 WURZELBRECHER):** schwer, langsam, holzig, zersplittert in Blätter und Rosen.
- **A „Rosenschnitt“ (K, R), Empf.:** 0–500 Wurzeln wölben den Boden (Antizipation des Bosses) · 500–700 Wurzelstoß, sie springt im Bogen darüber (R, Nachbilder) · 700–900 Halt in der Luft, Klinge zieht auf · 900–1000 senkrechter Schnitt durch den Stamm · 1000–1200 Stopp + Zittern waagerecht ⚡ · 1200–2200 Zeitlupe: Stamm klafft auf, Teile kippen verzögert (Krone zuletzt) · 2200–3000 Rosen blühen aus dem Spalt, Blätter sinken · 3000–3500 BEZWUNGEN!. Bricht klar mit den anderen Bossen (vertikal, Sprung).
- **B „Drei Knoten“ (L):** drei Schüsse in leuchtende Wurzelknoten im Abstand von 400 ms, jeder Knoten erlischt, beim dritten ⚡ sackt der Boss in sich zusammen und schrumpft zu einem Setzling.
- **C „Hundert Jahre Schlaf“ (K):** Eine Ranke umschlingt sie, sie dreht sich frei (Drehung mit Smear), Stoß ins Herz ⚡, Moos überwächst den Boss und er „schläft“ zu Laub.
- **Cinematic L4:** (1) Kamera fährt über den Wurzelboden zum Boss hoch, Größenkontrast · (2) drei Wurzelstöße, Zickzack-Ausweichen, zwei kleine Klingenkonter · (3) Porträt, Klinge wächst, „WURZELBRECHER“ · (4) Abwärtsschlag von oben bis in den Boden ⚡, Zeitlupe · (5) Stamm zerfällt zu Blättern, Rosenhecke blüht, Titel.

**Waldgeist (Nacht, Erlkönig und Mondkiesel; Finale L9 MONDSCHNITT):** schwebend, durchscheinend, zerfließt zu Licht.
- **A „Erlkönigs Töchter“ (L), Empf.:** 0–600 der Geist teilt sich in drei Gestalten, die sie umkreisen · 600–900 sie hält still, das Visier dunkelt ab (Halt) · 900–1000 Drehung, Schuss **hinter** sich · 1000–1150 Stopp ⚡, die beiden Trugbilder zerstieben · 1150–2400 der echte Geist zieht sich in die Länge und zerfließt in Mondlicht-Partikel (überlappend von unten nach oben) · 2400–3500 Nebel klärt, BEZWUNGEN!. Zeigt den „Trug“-Kern aus M9.
- **B „Kieselspur“ (R, K):** Drei Kiesel leuchten nacheinander auf, sie springt von Kiesel zu Kiesel (je 300 ms, der Kiesel glimmt kurz, kein Blitz), am Ende Schnitt durch den Geist ⚡.
- **C „Laternenfang“ (R):** Sie fängt eine Geisterkugel mit dem Rückstoßfeld und schleudert sie zurück, der Geist wird von seinem eigenen Licht getroffen ⚡.
- **Cinematic L9:** (1) Nebel, nur leuchtende Augen, langsame Fahrt · (2) zwei Hiebe gehen durch Trugbilder (Nebel stiebt) · (3) Mond hinter ihr, die Klinge fängt sein Licht, „MONDSCHNITT“ · (4) waagerechter Sichelschnitt, das Bild wird kurz entlang des Schnitts versetzt ⚡ · (5) Geist löst sich in Lichtpunkte auf, Nachthimmel, Titel.

**Riesen-Stein (Elfenwald, Riesen und Morgenlicht, Schneiderlein; Finale L20 STERNENHAMMER):** sehr schwer, sehr langsame Antizipation, zerbröckelt.
- **A „Morgenlicht“ (L), Empf.:** 0–800 der Riese holt mit der Faust weit aus (lange Antizipation = Gewicht) · 800–1000 Faustschlag, sie gleitet zur Seite, Boden zittert senkrecht · 1000–1300 Schuss steil in den Himmel (Halt) · 1300–1600 Lichtstrahl fällt auf den Riesen ⚡ · 1600–2800 er erstarrt mitten in der Bewegung, Risse leuchten nacheinander auf, Brocken fallen von oben nach unten · 2800–3500 Staub, BEZWUNGEN!. Der Sieg kommt aus der Sage, nicht aus roher Kraft.
- **B „Hebel“ (R, L):** Sie rutscht unter ihm durch, ein Schuss in den Riss am Fuß, er kippt sehr langsam (Zeitlupe), schlägt auf ⚡ und zerfällt in Kiesel.
- **C „Riesenzank“ (L):** Er zerbricht in zwei Hälften, ein Schuss lenkt die eine in die andere, sie prallen aufeinander ⚡ (Schneiderlein).
- **Cinematic L20:** (1) Kamera fährt am Riesen hoch, sein Schatten fällt auf sie · (2) Faustschläge, sie springt auf seinen Arm und läuft hinauf · (3) am Kopf sammeln sich Sterne zur Hammerform, „STERNENHAMMER“ · (4) Hammerschlag von oben ⚡, Zeitlupe · (5) Riese bricht in Felsen, Sterne bleiben am Himmel, Titel.

**Riesen-Sand-Wurm (Wüste, Bindung der Apophis-Schlange; Finale L25 SONNENSPEER):** lang, gegliedert, ideal für überlappende Bewegung.
- **A „Segmentkette“ (R, L), Empf.:** 0–600 eine Sandwelle läuft auf sie zu · 600–800 der Wurm bricht hervor, sie springt auf seinen Kopf · 800–1000 Schuss senkrecht nach unten · 1000–1150 Stopp ⚡ · 1150–2700 die Glieder zerfallen nacheinander vom Kopf zum Schwanz zu Sand (je ≈ 120 ms versetzt), sie gleitet mit dem Zerfall hinab · 2700–3500 Wüste glättet sich, BEZWUNGEN!. Nutzt die Gliederung, die kein anderer Boss hat.
- **B „Fessel“ (L):** zwei Lichtseile an leuchtenden Gliedern, sie zieht, der Wurm verknotet sich, Schuss ins Maul ⚡.
- **C „Sonnenspiegel“ (L):** Das Visier bündelt die Sonne, ein breiter Strahl hält den Wurm in der Luft, er trocknet zu Sand.
- **Cinematic L25:** (1) nur Dünen, eine Sandwelle nähert sich · (2) drei Durchbrüche, Ausweichen, seitliche Kamera · (3) Sonne im Zenit, Speer aus Licht in ihrer Hand, „SONNENSPEER“ · (4) Wurf von oben in den offenen Rachen ⚡ · (5) Glieder zerfallen nacheinander, Titel.

**Antiker Wächter-Hund (Pyramiden, Kerberos und Honigkuchen, Herzenswaage; Finale L30 GRABESLICHT):** drei Köpfe, Takt, Runen.
- **A „Drei Takte“ (K), Empf.:** 0–400 / 400–800 / 800–1200 die drei Köpfe schnappen im festen Takt, sie weicht jedes Mal aus und kontert klein (Funken, kein Blitz) · nach jedem Konter sinkt ein Kopf · 1200–1500 Halt, alle Köpfe hängen · 1500–1650 Stoß durch das Runenhalsband ⚡ · 1650–2800 der Hund legt sich schlafend nieder, die Runen erlöschen nacheinander · 2800–3500 BEZWUNGEN!. Der Takt ist die eigene Handschrift (wie B7 in M9).
- **B „Herzenswaage“ (R, K):** Die Waage erscheint und kippt, die leichte Schale hebt sie hoch, Stoß von oben ⚡.
- **C „Schildbruch“ (L):** Drei Schüsse auf einen Punkt des Runenschilds (je 400 ms), der Schild zerspringt ⚡, ein Kernschuss.
- **Cinematic L30:** (1) dunkler Grabgang, drei Augenpaare leuchten nacheinander auf · (2) Köpfe greifen im Takt an, sie pariert · (3) Fackeln entflammen nacheinander, Licht sammelt sich in der Klinge, „GRABESLICHT“ · (4) Lichtstoß durch den Schild ⚡ · (5) Hund erstarrt zur Statue und bröckelt, Licht fällt ins Grab, Titel.

**Pharao (Oase, Rätsel der Sphinx, Gold-Fluch; Finale L40 LETZTER STERN, 20 s, 6 Einstellungen):** würdevoll, golden, Spielende.
- **A „Rätsel“ (L), Empf.:** 0–700 drei Rätselsymbole erscheinen über ihm (Kind, Mensch, Greis) · 700–1000 sie zielt, Halt · 1000–1100 Schuss auf das richtige Symbol · 1100–1300 Stopp ⚡, die Goldspirale kehrt um · 1300–2700 der Pharao vergoldet von den Füßen aufwärts und zerspringt in Goldstaub · 2700–3500 BEZWUNGEN!. Bezieht sich auf B6 in M9.
- **B „Sarkophag“ (K):** Er zieht sich in den Sarkophag zurück, sie spaltet den Deckel diagonal ⚡, Binden wehen davon.
- **C „Auge des Sturms“ (R, L):** Sandsturm, sie steht im ruhigen Auge, ein Schuss durch die Sturmwand ⚡.
- **Cinematic L40 (6 × ≈ 3,3 s):** (1) Fahrt von der Oase zum Thron · (2) Goldspirale gegen Laser, Schlagabtausch · (3) **Rückblick:** Silhouetten der fünf besiegten Bosse ziehen vorbei, ohne Blitz · (4) Sterne aller Welten sammeln sich, Porträt, „LETZTER STERN“ · (5) Schlusstreffer ⚡, längste Zeitlupe des Spiels · (6) Zerfall in Goldstaub, Sonnenaufgang über der Oase, Titel und Spielende.

### 4. Technik in Phaser 3.90 (ohne Zusatzpaket)

- **Rig:** Ein `Container` überträgt Position, Drehung und Skalierung auf alle Kinder, und Container lassen sich verschachteln (Rumpf → Arm → Klinge). Sein Bezugspunkt liegt fest bei lokal (0, 0). Den Drehpunkt eines Teils legt daher der `origin` des Sprites fest, die Lage im Container sein Versatz. Die Kinder werden in Listenreihenfolge gezeichnet und nicht nach `depth`, Ebenen wechseln also über die Reihenfolge (z. B. Arm vor oder hinter den Rumpf). Container-Kinder lassen sich nicht maskieren. Jede Verschachtelungsebene kostet Rechenzeit, die Doku rät, Container nur wo nötig einzusetzen [Q9]. Folgerung: **flache Rigs** mit höchstens 2 Ebenen und ≈ 6 bis 10 Teilen je Figur.
- **Ablauf:** `this.add.timeline([...])` plant Tweens, `set`, `run`, Ereignisse und Töne zu absoluten ms (`at`). Sie startet pausiert und pausiert mit der Szene [Q10]. Seit 3.85 hat sie ein eigenes `timeScale` (RS-04 [Q10]). Das passt zu „Choreografie als Daten in `src/config`“.
- **Bewegung:** Easings `Expo`, `Back`, `Elastic`, `Sine` und **`Stepped`** (gestufte Haltepunkte wie in Anime), dazu eigene Ease-Funktionen, Werte je Eigenschaft (`props`), `tweens.chain`, `tweens.timeScale` für die Zeitlupe [Q11].
- **Kamera:** Eingebaute Effekte für Fade, Flash, Pan, Rotate, Shake und Zoom, mehrere Kameras, `ignore()` sowie `roundPixels` gegen Subpixel-Flimmern bei Pixel-Art. Für Fahrten rät die Doku, `scrollX/scrollY/zoom` zu tweenen statt die Effekte jedes Frame neu zu starten [Q12].
- **Partikel:** `explode(count, x, y)`, `maxParticles` als harte Grenze, `stopAfter`, `startFollow` für Funken an der Klinge. `particleTint` und `particleColor` gibt es nur unter WebGL [Q13]. Eingefärbte Partikel brauchen also eingefärbte Bilder.
- **Nur WebGL:** `Rope` (die naheliegende Bewegungsspur) hat kein Canvas-Gegenstück [Q14], Tint gibt es nur unter WebGL [Q16], FX (Bloom, Glow …) ebenso (RS-04). Blend-Modi kann Canvas dagegen alle, WebGL nur NORMAL, ADD, MULTIPLY, SCREEN und ERASE [Q15]. **Folgerung:** Bewegungsspuren als **Nachbilder** (2 bis 4 Kopien der Teile mit fallender Deckkraft, aus einem Pool) oder als Polygon-Band über `Graphics`. Treffer-Weiß als **vorgezeichnete Silhouette** je Teil aus der Sprite-Pipeline statt `setTintFill`.
- **Pixel-Art drehen (2a):** Phaser dreht mit `pixelArt: true` nach dem Nächster-Nachbar-Verfahren. Bei schrägen Winkeln entstehen gezackte, ungleich große Pixel. RotSprite (Xenowhirl) skaliert zuerst 8× mit einem angepassten Scale2×, dreht dann und verkleinert wieder. Es erzeugt deutlich weniger Fehler und keine neuen Farben, ist aber für Echtzeit zu teuer (es gibt eine schnellere Variante mit leichtem Qualitätsverlust) [Q17]. Aseprite bietet RotSprite als bessere der beiden Drehungen an [Q18]. **Drei Wege:**
  1. Freie Echtzeit-Drehung: billig, aber gezackt bei großen Teilen. Bei kleinen Teilen und schnellen Bewegungen fällt es kaum auf (eigene Bewertung).
  2. Vorgedrehte Stufen: Die Sprite-Pipeline erzeugt je Teil Stufen (z. B. alle 15°) mit einer eigenen RotSprite-Umsetzung, ohne Paket. Das braucht mehr Atlasfläche und Pipeline-Arbeit.
  3. Gezeichnete Posen: Große Winkeländerungen zeichnet der Designer als eigene Teilbilder, gedreht wird nur fein (≤ ± 20°).
  **Empfehlung:** 3 als Grundregel, dazu 1 für kleine oder schnelle Teile (Klinge, Splitter). Weg 2 kommt nur, wenn der Prototyp H-47 am Gerät gezackt wirkt.
- **Zoom:** Haltepunkte der Kamera auf ganzzahligen Zoomstufen, Übergänge schnell (≤ 200 ms), damit Zwischenstufen kaum sichtbar sind (eigene Bewertung, wie in RS-04).

### 5. Was das iPhone 15 schafft

- **Gerät:** A16 Bionic, GPU mit 5 Kernen, 2556 × 1179 Pixel [Q21]. Die Bildwiederholrate nennt die Seite nicht (ProMotion haben nur die Pro-Modelle, hier unbelegt). Das Ziel bleibt 60 fps.
- **Stromsparmodus:** WebKit drosselt `requestAnimationFrame` dort **absichtlich auf 30 fps**, ein Entwickler bestätigte das 2020 als gewollt [Q19]. Ob das in iOS 27 noch gilt, ist nicht belegt. Folgerung: Alle Längen in ms (die `Timeline` arbeitet mit ms), Hit-Stop nie als „n Frames“ zählen, und am Gerät mit Stromsparmodus prüfen, dass die Sequenz gleich lang dauert.
- **Renderer:** Seit Phaser 3.60 schaltet sich auf iOS automatisch eine eigene Mobil-Pipeline ein. Synthetische Messungen zeigen auf einem iPhone SE ≈ 15 000 Textur-Bindungen bei stabilen 60 fps. Atlanten bündeln Zeichenaufrufe, Texturwechsel brechen den Stapel [Q20]. Folgerung: alle Teile eines Finisher-Ablaufs in **einem** Atlas (Grenze 4096 px wie in PE-203).
- **Budget (eigene Schätzung, nicht gemessen):** Mit ≈ 2 Figuren × 10 Teile, ≤ 4 Nachbilder je bewegtem Teil, ≤ 150 Partikel gleichzeitig und einer Hintergrundebene liegt die Last weit unter den Werten oben. Teurer sind große, halbtransparente Vollbildflächen (Abdunkeln, Farbhintergrund), weil sie Füllrate kosten (vgl. RI-43). Messen mit `?fps=1` im Prototyp H-47.

## Vorschläge an den Planner

### RS-06.1 – Vertrag „Rig und Choreografie“ (Grundlage für Q-89)
- **Vorschlag:** §4 bekommt: **Rig** = Liste von Teilen (`id`, Bild, Drehpunkt als origin, Versatz, Eltern-Teil höchstens 1 Ebene tief, Reihenfolge) je Figur. **Choreografie** = Liste von Spuren je Teil/Kamera mit Schlüsselbildern (`atMs`, Wert, Ease einschließlich `Stepped` und Halten) plus Ereignissen (`hitStop` mit ms und Zitterrichtung, `afterimage`, `particles`, `impact`, `flash`, `shake`, `zoom`, `timeScale`, `text`). Jedes ⚡-Ereignis trägt eine Markierung für die Blitz-Regel und für „EFFEKTE REDUZIEREN“. Alle Zeiten in ms. Varianten-IDs je Boss (Kampfmoment) und je Finale.
- **Begründung:** Ergebnisse 1 und 4: Phaser-`Timeline` mit `at` in ms [Q10], Container-Grenzen [Q9], 30-fps-Drosselung [Q19].
- **Plan-Bezug:** §4 (Q-89), AP-181, AP-182
- **Größe:** M
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** Architektur: neuer Vertrag in §4 (in PE-233 schon angekündigt)
- **Status:** freigegeben (2026-11-03)

### RS-06.2 – Timing-Raster als Abnahmekriterium
- **Vorschlag:** Jede Choreografie hält das Raster aus Ergebnis 1 ein: Antizipation ≥ 150 ms, Aktion ≤ 120 ms, Hit-Stop 100–200 ms (Schlusstreffer ≤ 300 ms), Zittern abklingend, Nachschwingen ≥ 200 ms, ≥ 350 ms Abstand zwischen ⚡-Ereignissen, höchstens 1 ⚡ im Kampfmoment außer dem Haupttreffer. Ein Vitest prüft die Werte aus `config`, das Gefühl prüft der Nutzer in H-47.
- **Begründung:** [Q2][Q3][Q4][Q6], Blitz-Regel §5
- **Plan-Bezug:** Abnahmekriterium für AP-181, AP-184, AP-186 bis AP-190
- **Größe:** S
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein
- **Status:** freigegeben (2026-11-03)

### RS-06.3 – Canvas-sichere Effekte
- **Vorschlag:** Bewegungsspuren als Nachbilder (Pool, 2 bis 4 Kopien, fallende Deckkraft) oder `Graphics`-Band, Treffer-Weiß als vorgezeichnete Silhouette je Teil, Partikel aus vorgefärbten Bildern. `Rope`, Tint, `particleTint` und FX nur als Zugabe unter WebGL, nie tragend.
- **Begründung:** [Q13][Q14][Q16], RS-04 zu FX
- **Plan-Bezug:** AP-182 (Abspieler), AP-183/AP-185 (Silhouetten in der Pipeline), H-46 (Designer liefert Silhouetten)
- **Größe:** S
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein
- **Status:** freigegeben (2026-11-03)

### RS-06.4 – Regel für Pixel-Art-Drehung
- **Vorschlag:** Große Winkeländerungen zeichnet der Designer als eigene Teilbilder (Schlüsselposen in H-46). Im Code werden Teile nur fein gedreht (≤ ± 20°), kleine oder schnelle Teile (Klinge, Splitter) frei. Kamera hält auf ganzzahligen Zoomstufen. Wirkt der Prototyp H-47 gezackt, folgt als Nachtrag eine Vorab-Drehung in Stufen mit eigener RotSprite-Umsetzung in der Sprite-Pipeline (ohne Paket).
- **Begründung:** Ergebnis 4, [Q17][Q18]
- **Plan-Bezug:** H-46 (Designer-Auftrag), AP-183, Abnahme H-47
- **Größe:** S (Nachtrag RotSprite: M)
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein (Nachtrag: Sprite-Pipeline)
- **Status:** freigegeben (2026-11-03)

### RS-06.5 – Zeitbasiert, ein Atlas, Messung am Gerät
- **Vorschlag:** Alle Zeiten in ms, Zeitlupe nur über `timeScale` von Timeline und Tweens. Je Finisher-Ablauf ein Atlas. Budget als Startwert: ≤ 10 Teile je Figur, ≤ 4 Nachbilder je Teil, ≤ 150 Partikel, wenige große halbtransparente Flächen. Abnahme H-47 und H-49: 60 fps mit `?fps=1` am iPhone 15, im Stromsparmodus gleiche Dauer.
- **Begründung:** [Q19][Q20][Q21], RI-43
- **Plan-Bezug:** AP-182, H-47, H-49, §5 (60 fps)
- **Größe:** S
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein
- **Status:** freigegeben (2026-11-03)

### RS-06.6 – Dramaturgie der Cinematics
- **Vorschlag:** Rhythmus der 5 Einstellungen: ruhig → schnell (nur kleine Funken) → Spannung → einziger Vollbild-Impact mit Zeitlupe → Ausklang. Die Achse bleibt (Astronautin links, Boss rechts), gewechselt wird höchstens einmal mit Absicht. Level 40: die zusätzliche Einstellung ist ein Rückblick auf die fünf besiegten Bosse. Die Gerüste je Finale aus Ergebnis 3 dienen als Vorlage für die Storyboards H-46/H-48.
- **Begründung:** Ergebnis 2, [Q8], PE-232
- **Plan-Bezug:** H-46, H-48, AP-184, AP-186 bis AP-190
- **Größe:** S
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein
- **Status:** freigegeben (2026-11-03)

### RS-06.7 – Kampfmoment-Ideen je Boss
- **Vorschlag:** Je Boss wird die mit **Empf.** markierte Idee aus Ergebnis 3 zum Kampfmoment: Rosenschnitt, Erlkönigs Töchter, Morgenlicht, Segmentkette, Drei Takte, Rätsel. Die übrigen Ideen dürfen Designer und Coder als Teile der Cinematics nutzen. Die Laserklinge ist ein neues Gestaltungselement (eigene Form, kein Lichtschwert-Griff) und kommt in den Designer-Auftrag H-46.
- **Begründung:** Ergebnis 3, Motive aus RS-03 (M9), PE-231/PE-235 (jeder Boss eigen)
- **Plan-Bezug:** H-46, H-48, AP-184, AP-186 bis AP-190
- **Größe:** S
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein (R1 eigene Gestaltung: Klinge vom Nutzer im Design-Review prüfen)
- **Status:** freigegeben (2026-11-03)

## Vertrauen und Lücken

- **Hit-Stop-Zahlen:** Die Capcom-Seite war beim Abruf nicht erreichbar (HTTP 503), die Werte 8/12/16 Frames stammen aus dem Suchauszug (schwach belegt). Sakurai beschreibt das Verfahren ohne Zahlen, und seine Kolumne liegt nur als Fan-Übersetzung vor [Q2]. Forschung zur Dauer findet keinen festen Bestwert (eine Studie zu 0 bis 0,7 s konnte ich nicht lesen). Das Raster in Ergebnis 1 ist meine Ableitung und muss in H-47 gefühlt werden.
- **Anime-Timing [Q6]** stützt sich auf eine Fan-Analyse (Animetudes). Die Aussagen passen aber zu den klassischen Prinzipien [Q1] und zur Smear-Literatur [Q5].
- **Phaser-Doku:** Die Konzeptseiten auf docs.phaser.io zeigen teils den Stand von Phaser 4 (die Tint-Seite nennt `setTintMode` aus v4). Dass Tint unter Canvas in **3.90** fehlt, ist durch die Markierung „webglOnly“ belegt, aber nicht durch einen Satz zu 3.90. Der Coder von AP-182 sollte das in der 3.90-API gegenprüfen.
- **iPhone-Leistung:** Es gibt keine belastbaren Messwerte für Safari mit Phaser auf dem A16, die Phaser-Zahlen sind synthetisch [Q20]. Ob die 30-fps-Drosselung unter iOS 27 noch gilt, ist offen. Das Budget in RS-06.5 ist eine Schätzung.
- **Boss-Ideen** sind eigene Gestaltung ohne Beleg. Sie greifen nur Märchenmotive auf, die gemeinfrei sind (vgl. RS-03), keine Bilder oder Posen aus anderen Werken. Ob die Laserklinge zu nah an bekannte Lichtschwerter rückt, prüft der Nutzer im Design-Review (vom Nutzer zu prüfen, keine Rechtsberatung).

## Quellen

- [Q1] Principles of Traditional Animation Applied to 3D Computer Animation (Zusammenfassung von Lasseter, SIGGRAPH 1987), ACM SIGGRAPH Education/HyperGraph, https://education.siggraph.org/static/HyperGraph/animation/character_animation/principles/prin_trad_anim.htm, Stand 1999, abgerufen 2026-11-03 – Sekundärquelle (Primär: Lasseter, Computer Graphics 21:4, 1987)
- [Q2] Thoughts on Hitstop, Sakurai's Famitsu Column Vol. 490 (Übersetzung), Source Gaming, https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/, Stand 2015-11-11 – Sekundärquelle (Fan-Übersetzung)
- [Q3] This Week in Sakurai: Fine-tuning hit stop, Nintendo Wire (Zusammenfassung des Videos von Masahiro Sakurai), https://nintendowire.com/news/2022/12/12/this-week-in-sakurai-12-5-12-11-fine-tuning-hit-stop-and-cheating-the-system/, Stand 2022-12-12 – Sekundärquelle
- [Q4] SF Seminar (Street Fighter V), Capcom, https://game.capcom.com/cfn/sfv/column/131545?lang=en, abgerufen 2026-11-03 (HTTP 503, nur Suchauszug) – Primärquelle, schwach belegt
- [Q5] Smear frame, Wikipedia, https://en.wikipedia.org/wiki/Smear_frame, abgerufen 2026-11-03 – Sekundärquelle
- [Q6] The Kanada style now, Animetudes, https://animetudes.com/2021/07/09/the-kanada-style-now/, Stand 2021-07-09 – Sekundärquelle (Fan-Analyse)
- [Q8] 180-Degree Rule, Columbia University Film Language Glossary, https://filmglossary.ccnmtl.columbia.edu/term/180-degree-rule, abgerufen 2026-11-03 – Sekundärquelle (Fachglossar)
- [Q9] Container, Phaser Docs, https://docs.phaser.io/phaser/concepts/gameobjects/container, abgerufen 2026-11-03 – Primärquelle
- [Q10] Time (Timeline, Clock), Phaser Docs, https://docs.phaser.io/phaser/concepts/time, abgerufen 2026-11-03 – Primärquelle
- [Q11] Tweens, Phaser Docs, https://docs.phaser.io/phaser/concepts/tweens, abgerufen 2026-11-03 – Primärquelle
- [Q12] Cameras, Phaser Docs, https://docs.phaser.io/phaser/concepts/cameras, abgerufen 2026-11-03 – Primärquelle
- [Q13] Particles, Phaser Docs, https://docs.phaser.io/phaser/concepts/gameobjects/particles, abgerufen 2026-11-03 – Primärquelle
- [Q14] Rope, Phaser Docs, https://docs.phaser.io/phaser/concepts/gameobjects/rope, abgerufen 2026-11-03 – Primärquelle
- [Q15] Game Object Components (Blend Modes), Phaser Docs, https://docs.phaser.io/phaser/concepts/gameobjects/components, abgerufen 2026-11-03 – Primärquelle
- [Q16] Tint Component API, Phaser Docs, https://docs.phaser.io/api-documentation/namespace/gameobjects-components-tint, abgerufen 2026-11-03 – Primärquelle (Stand teils Phaser 4)
- [Q17] Pixel-art scaling algorithms (Abschnitt RotSprite), Wikipedia, https://en.wikipedia.org/wiki/Pixel-art_scaling_algorithms, abgerufen 2026-11-03 – Sekundärquelle
- [Q18] Rotate, Aseprite Docs, https://aseprite.org/docs/rotate/, abgerufen 2026-11-03 – Primärquelle
- [Q19] Bug 215745: Throttling requestAnimationFrame to 30 FPS in low power mode on iOS 14, WebKit Bugzilla, https://bugs.webkit.org/show_bug.cgi?id=215745, Stand 2020-08-24 – Primärquelle
- [Q20] Phaser 3.60 Change Log: Mobile Performance, Phaser (Changelog im npm-Paket), https://unpkg.com/phaser@4.2.1/changelog/v3/3.60/MobilePerformance.md, abgerufen 2026-11-03 – Primärquelle
- [Q21] iPhone 15 – Technical Specifications, Apple Support, https://support.apple.com/en-us/111831, abgerufen 2026-11-03 – Primärquelle
- Projekt: RS-03 (Märchenmotive je Boss), RS-04 (Stilmittel, Phaser-Bausteine), `src/config/bosses.ts`, `src/config/levels.ts` (Boss je Batch), `src/config/finishers.ts` (Namen der Finale), Stand `dev` d4a545c

## Entscheidungen

- Nutzer am 2026-11-03: Rückfragen beantwortet (1a, 2a, 3a), siehe Kopf.
- Nutzer am 2026-11-03: RS-06.1 bis RS-06.7 freigegeben
