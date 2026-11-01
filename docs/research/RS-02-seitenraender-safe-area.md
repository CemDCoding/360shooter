# RS-02 – Seitenränder am Handy: Spielwelt randlos, Bedienung im sicheren Bereich

**Auftrag (Nutzer am 2026-11-01):** Wie sorgen gute Handy-Spiele dafür, dass die Ränder auf jedem Gerät stimmen, und welche Lösung lässt bei uns die Seitenränder verschwinden?
**Projektbezug:** PWA in Safari (Homescreen-App, quer), Phaser 3 mit `Scale.FIT`, `viewport-fit=cover` ist gesetzt. Heute liegt das ganze Spielfeld im sicheren Bereich (PE-97, PE-99); die Streifen von Notch/Dynamic Island und Home-Bar (iPhone 15 quer etwa 47 pt links und rechts, 21 pt unten) zeigen die Menüfarbe und wirken wie Ränder. Option 1b (Spielwelt unter den Insets) wurde am 2026-10-26 als „iOS-Risiko“ verworfen. Grenzen: keine neue Abhängigkeit (§3), PE-100 (gleiche Kontaktzeit), PE-109 (Breite in der Runde fest), PC 640 × 360 unverändert.
**Kriterien:** Ränder verschwinden auf dem iPhone (zuerst), HUD und Bedienung nie unter Notch oder Home-Bar, Fairness nach PE-100, nur Phaser und CSS, Belege aus Primärquellen. Nutzerentscheid am 2026-11-01: Die Spielwelt darf unter Notch und Home-Bar laufen.

## Kurzantwort
Die Ränder kommen nicht von einem Rechenfehler, sondern von der Entscheidung, die Spielwelt im sicheren Bereich einzusperren. Apple, Google und Unity empfehlen übereinstimmend das Gegenteil: Hintergrund und Spielwelt laufen bis an den Bildschirmrand, nur Text, Bedienelemente und wichtige Informationen bleiben im sicheren Bereich [Q2][Q3][Q5][Q6][Q7]. Für uns heißt das: `#game` und Canvas füllen den ganzen Viewport, die Arena-Breite folgt dem ganzen Bildschirm (iPhone 15 quer etwa 780 statt heute etwa 733 Einheiten), und HUD, Stick und Tasten bekommen die Insets als Abstand. Das hebt PE-97/PE-99 (Option 1b verworfen) auf und ist deshalb eine Architekturentscheidung für den Planner.

## Ergebnisse
### 1. Was empfehlen die Plattformen?
- **Apple HIG, Layout (abgerufen 2026-11-01):** Den sicheren Bereich zu respektieren ist nötig, damit Dynamic Island und Systemelemente Inhalte und Bedienelemente nicht verdecken. Vollflächige Hintergründe sollen bis unter Leisten reichen und den ganzen Bildschirm füllen. Bei anderen Seitenverhältnissen soll Grafik nicht verzerrt, sondern so skaliert werden, dass sie den Bildschirm füllt; Hintergrundgrafik muss dafür oft über das Sichtbare bei Standard-Seitenverhältnissen hinausgehen. Letterbox und Pillarbox werden als Folge fehlender Anpassung genannt [Q2].
- **Apple HIG, Designing for games:** Spiele sollen bei 16:10, 19,5:9 und 4:3 gut aussehen, feste Layouts möglichst vermeiden und Gerätemerkmale (abgerundete Ecken, Kamera) über die sicheren Bereiche der Plattform berücksichtigen [Q3].
- **WebKit (2017, Abschnitt Insets aktualisiert 2017-10-31):** `viewport-fit=cover` schaltet das automatische Einrücken ab, die Seite liegt auf dem ganzen Bildschirm; Inhalte schützt man mit `env(safe-area-inset-*)`. Insets ersetzen keine Ränder: `max(<Mindestabstand>, env(...))` [Q1].
- **Android:** Wichtige Texte und Bedienelemente nicht in den Ausschnitt der Kamera legen, feine Touch-Ziele dort meiden (geringere Touch-Empfindlichkeit). Ab Android 15 (SDK 35) zeichnen Apps immer in den Ausschnitt [Q6].
- **Unity:** `Screen.safeArea` ist für wichtige und interaktive UI da; die Safe-Area-Komponente von uGUI ist ausdrücklich so gedacht, dass Hintergrundgrafik randlos bleibt und nur die Bedienoberfläche eingerückt wird [Q5][Q7].
- **Native Extras ohne Web-Gegenstück:** Das Ausblenden der Home-Bar (`prefersHomeIndicatorAutoHidden`) ist eine UIKit-Einstellung und selbst dort nur ein Wunsch [Q8]. Eine PWA kann die Home-Bar weder ausblenden noch Wischgesten am Rand abfangen (aus der API abgeleitet, kein Web-Gegenstück gefunden, schwach belegt). Folge: Der Stick muss über der Home-Bar bleiben.

### 2. Umsetzung im Web (PWA, Safari)
- Voraussetzungen sind schon da: `viewport-fit=cover`, Statusleiste `black-translucent`, Sonde `#safe` mit `env(safe-area-inset-*)` (Code `index.html`).
- Änderung: `#game` bekommt den ganzen sichtbaren Viewport (heute: `hostBoxFor` mit `fitArena` im sicheren Bereich). Die Insets werden nicht mehr vom Spielfeld abgezogen, sondern als Abstand an HUD und Bedienung gegeben.
- Rechnung iPhone 15 quer (852 × 393 pt, Insets 0/47/21/47 aus PE-97): Höhe 360 Einheiten auf 393 pt → 1,092 pt je Einheit, Breite 852 / 1,092 ≈ **780 Einheiten** (im Rahmen 640..900, PE-131). Insets in Einheiten: seitlich ≈ 43, unten ≈ 19. Heute: 758 × 372 pt sicherer Bereich → ≈ 733 Einheiten plus Streifen.
- Größere Modelle (Pro Max 932 × 430 pt) haben dasselbe Seitenverhältnis von etwa 19,5:9 und ergeben ebenfalls etwa 780 Einheiten (eigene Rechnung, Insets für dieses Modell nicht geprüft).
- **Bekanntes Risiko:** In eingebetteten Web-Views auf iOS wurden veraltete Insets nach dem Drehen gemeldet (Bericht von 2026 zu einer Native-Hülle, keine PWA) [Q9, schwach belegt]. Die vorhandene Nachmessung (`RELAYOUT_DELAYS_MS`, `visualViewport`, `orientationchange`) deckt das ab und sollte bleiben. MDN: Insets ändern sich mit der sichtbaren Fläche, `env()` ist breit unterstützt [Q4]. Ein konkreter WebKit-Fehler für Homescreen-Apps im Querformat wurde nicht gefunden. Das damals genannte „iOS-Risiko“ ist im Plan nicht weiter begründet.

### 3. Skalierungsmodell in Phaser
- Phaser 3 bietet FIT (Rest bleibt frei), ENVELOP (füllt und schneidet ab), RESIZE (füllt ohne festes Seitenverhältnis) und EXPAND (seit 3.80: sichtbare Fläche wie RESIZE, Inhalt wie FIT) [Q10].
- Unsere Mechanik (Höhe fest 360, Breite dynamisch, `setGameSize`) entspricht im Ergebnis schon EXPAND bzw. „HEIGHT_CONTROLS_WIDTH“. Ein Wechsel des Modus ist **nicht** nötig: Es reicht, wenn die Breite aus dem ganzen Viewport statt aus dem sicheren Bereich kommt. FIT mit passender Spielgröße erzeugt dann keinen Rest mehr.
- Schmaler als 16:9 (iPad 4:3) bleibt die Breite 640 und es gäbe oben und unten Rest. Randlos ginge das nur über eine dynamische Höhe; das ist nachrangig (iPhone zuerst).

### 4. Fairness (PE-100) und Dynamic Island
- Mehr sichtbare Breite heißt nach PE-100: Der Spawn-Ring muss aus der **ganzen** sichtbaren Fläche (780 × 360) gerechnet werden, sonst tauchen Gegner im ehemals leeren Streifen sichtbar auf. Die Kontaktzeit-Anpassung (Faktor 7, AP-109) ist bis 900 belegt, 780 liegt darin.
- Auf einer Seite verdeckt die Dynamic Island einen kleinen Teil der Spielwelt. Die Spielerin steht mittig und die Reichweite beträgt 360, deshalb ist ein Gegner dort nur kurz verdeckt. Plattformen empfehlen nur, wichtige Informationen nicht dorthin zu legen [Q2][Q6] (eigene Bewertung).

## Vorschläge an den Planner
### RS-02.1 – Spielwelt randlos über den ganzen Bildschirm
- **Vorschlag:** `#game` und Canvas füllen den ganzen sichtbaren Viewport (`visualViewport`, auch die Streifen von Notch, Dynamic Island und Home-Bar). Die Arena-Breite wird aus dem Seitenverhältnis des ganzen Viewports berechnet (iPhone 15 quer ≈ 780), nicht mehr aus dem sicheren Bereich. Map-Hintergrund und Spielwelt laufen bis an den Rand. PE-97/PE-99 („Option 1b verworfen“) wird ersetzt. PE-109, die Nachmessung und das Drehen bleiben wie bisher. PC 1280 × 720 bleibt 640 × 360.
- **Begründung:** Ergebnisse 1 bis 3, [Q1][Q2][Q3][Q5][Q7][Q10].
- **Plan-Bezug:** §4 (Layout-Vertrag `fitArena`/`hostBoxFor`, Arena-Breite), §16 (PE-97, PE-99 ändern), neues Paket
- **Größe:** M
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** Architektur: Layout-Vertrag und Entscheidung PE-97/PE-99
- **Status:** freigegeben (2026-11-01)

### RS-02.2 – Sicherer Bereich nur für HUD und Bedienung
- **Vorschlag:** Die Insets (Sonde `#safe`) werden in Spieleinheiten umgerechnet und als gemeinsamer Wert an HudScene, Stick, Pause- und Ton-Taste, Seiten-Tasten und Menüs gegeben. Jeder Abstand gilt nach `max(Designrand, Inset)`. Der Stick liegt immer über der Home-Bar. Text und Tasten liegen nie unter Notch oder Dynamic Island, in beiden Drehrichtungen.
- **Begründung:** [Q1] (`max()`), [Q2], [Q6] (keine Touch-Ziele im Ausschnitt), [Q7], [Q8] (Home-Bar lässt sich im Web nicht ausblenden).
- **Plan-Bezug:** §4 (neuer Vertrag „safe insets in game units“), Abnahmekriterium im Paket zu RS-02.1 oder eigenes Paket
- **Größe:** M
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** Architektur: neuer gemeinsamer Wert für Szenen
- **Status:** freigegeben (2026-11-01)

### RS-02.3 – Spawn-Ring aus der ganzen sichtbaren Fläche
- **Vorschlag:** Der Spawn-Ring (halbe Diagonale + 24) und die Kontaktzeit-Regel nach PE-100 rechnen mit der randlosen Fläche. Dazu ein Test für 780 × 360 (Kontaktzeit wie bei 640, Toleranz wie bei AP-109).
- **Begründung:** Ergebnis 4.
- **Plan-Bezug:** Abnahmekriterium für das Paket zu RS-02.1
- **Größe:** S
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein
- **Status:** freigegeben (2026-11-01)

### RS-02.4 – Handtest „keine Ränder“
- **Vorschlag:** Handtest-Punkt auf `stage`, iPhone 15 quer, Homescreen-App und Safari, **beide Drehrichtungen** (Dynamic Island links und rechts): kein Streifen in Menüfarbe, HUD und Tasten frei von Dynamic Island und Home-Bar, Stick reagiert über der Home-Bar, nach dem Drehen in der Pause bleibt alles richtig. Zusätzlich ein Foto mit aktivierter Layout-Anzeige.
- **Begründung:** Veraltete Insets nach dem Drehen sind ein bekanntes Risiko [Q9]. Headless lassen sich `env()`-Insets nicht prüfen (Erkenntnis AP-96).
- **Plan-Bezug:** §9 Handtest, §13 [Mensch]
- **Größe:** S
- **Berührt Architektur / Sicherheit / Datenschutz / Abhängigkeiten:** nein
- **Status:** freigegeben (2026-11-01)

## Vertrauen und Lücken
- **Foto:** `IMG_6372.PNG` ist vom 2026-10-26 und zeigt ein 16:9-Feld (≈ 664 × 374 pt, je ≈ 95 pt Rand). Laut Nutzer sieht es heute noch so aus. Nach AP-78/AP-89/AP-96/AP-109 sollten auf `dev` nur noch 47 pt je Seite bleiben. Gibt es auf `stage` noch ≈ 95 pt, ist entweder `stage` nicht aktuell oder die Breite greift am Gerät nicht. Das klärt erst H-26 bzw. RS-02.4 (Zeile `arena want/now`). Die vorgeschlagene Lösung beseitigt beide Fälle nur, wenn die Breite am Gerät wirklich angewendet wird.
- Die Apple-HIG-Seiten wurden über ihre Datenquelle gelesen; Wortlaut und Stand können sich mit neuen iOS-Versionen ändern.
- Für Homescreen-Apps im Querformat wurde kein offizieller WebKit-Fehler zu veralteten Insets gefunden, nur ein Bericht aus einer Native-Hülle [Q9].
- Insets anderer iPhone-Modelle sind nicht belegt. Die Rechnung nutzt nur die am Gerät gemessenen Werte des iPhone 15 (PE-97).
- iPad und 4:3 sind nicht gelöst (Ergebnis 3), weil iPhone Vorrang hat.

## Quellen
- [Q1] Designing Websites for iPhone X, WebKit (T. Horton), https://webkit.org/blog/7929/designing-websites-for-iphone-x/, Stand 2017-09-22 (Insets aktualisiert 2017-10-31) – Primärquelle
- [Q2] Human Interface Guidelines: Layout, Apple, https://developer.apple.com/design/human-interface-guidelines/layout, abgerufen 2026-11-01 – Primärquelle
- [Q3] Human Interface Guidelines: Designing for games, Apple, https://developer.apple.com/design/human-interface-guidelines/designing-for-games, abgerufen 2026-11-01 – Primärquelle
- [Q4] env(), MDN, https://developer.mozilla.org/en-US/docs/Web/CSS/env, abgerufen 2026-11-01 – Primärquelle (Referenz)
- [Q5] Screen.safeArea, Unity, https://docs.unity.com/en-us/engine/6000.3/script-reference/unityengine/screen/safearea, abgerufen 2026-11-01 – Primärquelle
- [Q6] Support display cutouts, Android Developers, https://developer.android.com/develop/ui/views/layout/display-cutout, abgerufen 2026-11-01 – Primärquelle
- [Q7] Safe Area (uGUI 2.6 Manual), Unity, https://docs.unity3d.com/Packages/com.unity.ugui@2.6/manual/script-SafeArea.html, abgerufen 2026-11-01 – Primärquelle
- [Q8] prefersHomeIndicatorAutoHidden, Apple, https://developer.apple.com/documentation/uikit/uiviewcontroller/prefershomeindicatorautohidden, abgerufen 2026-11-01 – Primärquelle
- [Q9] Re-inject the root web view's safe-area insets on rotation on iOS (PR 624), NativePHP, https://github.com/NativePHP/mobile-air/pull/624, abgerufen 2026-11-01 – Sekundärquelle (schwach belegt)
- [Q10] Phaser.Scale.ScaleModes, Phaser, https://docs.phaser.io/api-documentation/namespace/scale-scalemodes, abgerufen 2026-11-01 – Primärquelle

## Entscheidungen
- Nutzer am 2026-11-01: Spielwelt darf unter Notch und Home-Bar laufen; iPhone zuerst; Ränder sollen verschwinden.
- Nutzer am 2026-11-01: RS-02.1, RS-02.2, RS-02.3 und RS-02.4 freigegeben
