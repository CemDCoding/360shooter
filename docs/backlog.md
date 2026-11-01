# Backlog 360shooter

<!--
Eingang für Erweiterungen eines laufenden Projekts.
- Schreibt nur der Product Owner (ma-po), im Interview mit dem Nutzer.
- Jede Anforderung (RQ-xx) beschreibt, WAS gebaut werden soll und WARUM, nicht WIE.
- Der Planner übernimmt freigegebene Anforderungen in docs/masterBuildPlan.md (Umfang, Pakete).
  Er schreibt diese Datei nicht. Welche RQ übernommen sind, erkennt der PO an der RQ-ID im Plan.
-->

## Übersicht

Reihenfolge = Priorität (oben zuerst). Die Priorität entscheidet der Nutzer.

| ID | Titel | Prio | Größe | Status | Berührt Sicherheit/Datenschutz/Architektur |
|---|---|---|---|---|---|
| RQ-01 | Windows-.exe zum privaten Testen durch Freunde | mittel | M | freigegeben | Architektur: Desktop-Hülle um das Spiel; neue Abhängigkeit: Werkzeug zum Verpacken; Doku: Plan §2 (Downloads) und PE-02 betroffen |
| RQ-02 | Handy-Zugriff aus der .exe (lokaler Server im Heimnetz) | niedrig | M | freigegeben | Architektur: lokaler Server in der .exe; Sicherheit: nur Heimnetz, Firewall-Freigabe; baut auf RQ-01 auf |

**Status:** `entwurf` (im Interview) · `freigegeben` (Nutzer hat zugestimmt, wartet auf den Planner) · `übernommen` (steht im Plan) · `zurückgestellt` · `verworfen`
**Größe:** `S` (≈ 1 Paket) · `M` (2–3 Pakete) · `L` (mehr, besser teilen)

---

## Anforderungen

<!-- Vorlage für einen Eintrag. Neue Einträge kommen ans Ende, IDs werden fortlaufend vergeben und nie neu benutzt.

### RQ-{{nn}} – {{Titel}}

- **Status:** entwurf · **Prio:** {{hoch | mittel | niedrig}} · **Größe:** {{S | M | L}}
- **Angelegt:** {{JJJJ-MM-TT}} · **Freigegeben:** {{JJJJ-MM-TT}} | –
- **Ziel (warum):** {{welches Problem oder welchen Nutzen, für wen}}
- **Beschreibung (was):** {{Ablauf aus Sicht der Nutzer, 2–6 Sätze}}
- **Abnahmekriterien:**
  - [ ] {{prüfbar, aus Sicht der Nutzer}}
- **Nicht im Umfang:** {{bewusste Abgrenzung}}
- **Berührt:** Daten {{ja/nein}} · personenbezogene Daten {{ja/nein}} · Recht (Impressum, Datenschutzerklärung) {{ja/nein}} · neue Abhängigkeit oder externer Dienst {{ja/nein}} · Architektur {{ja/nein}}
- **Offene Fragen an den Planner:** {{technische Fragen, die der PO bewusst nicht klärt}} | keine
- **Entscheidungen:** {{Nutzer am JJJJ-MM-TT: …}}
-->

### RQ-01 – Windows-.exe zum privaten Testen durch Freunde

- **Status:** freigegeben · **Prio:** mittel · **Größe:** M
- **Angelegt:** 2026-11-01 · **Freigegeben:** 2026-11-01
- **Ziel (warum):** Der Nutzer kann Freunden das Spiel zum Testen geben, ohne dass diese Node, einen Dev-Server oder einen Browser-Aufbau brauchen. Rückmeldung von Testern zu Spielgefühl und Balance.
- **Beschreibung (was):** Der Nutzer erzeugt per Befehl eine einzelne portable Windows-`.exe` des Spiels. Freunde bekommen die Datei privat (USB, Cloud-Link, Messenger), starten sie per Doppelklick und spielen mit Maus am PC. Es gibt keine Installation. Der Spielstand (Gold, Upgrades, Level) bleibt lokal auf dem Rechner des Freundes erhalten. Eine kurze Anleitung erklärt die Windows-Warnung bei unsigniertem Programm („Weitere Informationen“ → „Trotzdem ausführen“) und wie man den Fortschritt zurücksetzt.
- **Abnahmekriterien:**
  - [ ] Ein dokumentierter Befehl erzeugt eine einzelne `.exe`, ohne dass der Nutzer Code ändern muss.
  - [ ] Die `.exe` startet per Doppelklick auf einem Windows-Rechner ohne installiertes Node oder Entwicklungswerkzeug und zeigt das Hauptmenü.
  - [ ] Eine komplette Runde (Start, Spielen, Ergebnis) funktioniert mit Maus; Sound und Stummschalt-Taste gehen.
  - [ ] Gold, Upgrades und freigeschaltete Level bleiben nach Schließen und erneutem Start der `.exe` erhalten.
  - [ ] Das Spiel stellt auch in der `.exe` keine externen Netzwerkanfragen und sammelt keine Daten.
  - [ ] Eine Kurzanleitung für Freunde (Start, Windows-Warnung, Zurücksetzen) liegt im Repo.
  - [ ] Der Web- und iPhone-Betrieb funktioniert unverändert; alle bisherigen Checks bleiben grün.
- **Nicht im Umfang:** öffentliche Veröffentlichung oder Hosting (itch.io, GitHub-Releases), Installer, Code-Signing-Zertifikat, Auto-Updates, Mac/Linux/Android/iOS-Builds, Touch-Steuerung in der `.exe`, Impressum und Datenschutzerklärung.
- **Berührt:** Daten ja (Spielstand lokal, wie bisher) · personenbezogene Daten nein · Recht (Impressum, Datenschutzerklärung) nein, solange die Weitergabe privat bleibt; bei öffentlichem Teilen neu zu bewerten · neue Abhängigkeit oder externer Dienst ja (Verpackungswerkzeug, vom Nutzer freizugeben; kein externer Dienst) · Architektur ja (Desktop-Hülle)
- **Offene Fragen an den Planner:** Wahl der Hülle und des Werkzeugs; Umgang mit Fenstergröße/Vollbild; Speicherort des Spielstands; Auswirkung auf PE-02 und §2 „Downloads“ (privater Test, nicht Veröffentlichung); Lizenzen der Assets bei Weitergabe an Dritte prüfen (R1); Anpassung „Freigegebene Abhängigkeiten“.
- **Entscheidungen:** Nutzer am 2026-11-01: Weitergabe privat (1a), portable einzelne .exe (2a), unsignierte Datei mit Anleitung zur Windows-Warnung (3a), Spielstand lokal behalten (4a).
  Nutzer am 2026-11-01: Abnahmekriterien und Abgrenzung passen, Prio mittel; RQ-01 freigegeben. Handy-Zugriff ist ausdrücklich nicht Teil von RQ-01, sondern RQ-02.

### RQ-02 – Handy-Zugriff aus der .exe (lokaler Server im Heimnetz)

- **Status:** freigegeben · **Prio:** niedrig · **Größe:** M
- **Angelegt:** 2026-11-01 · **Freigegeben:** 2026-11-01
- **Ziel (warum):** Freunde, die die `.exe` auf ihrem PC haben, können das Spiel zusätzlich auf dem eigenen Handy mit Touch-Steuerung testen, so wie der Nutzer es heute mit dem iPhone macht.
- **Beschreibung (was):** Die `.exe` aus RQ-01 startet auf Wunsch einen kleinen lokalen Server und zeigt die Adresse im Heimnetz an (z. B. `http://192.168.x.x:port`). Das Handy im selben WLAN öffnet diese Adresse im Browser und spielt mit Touch. Der Server ist nur im Heimnetz erreichbar. Beim ersten Start fragt die Windows-Firewall nach einer Freigabe, die Kurzanleitung erklärt das.
- **Abnahmekriterien:**
  - [ ] Die `.exe` zeigt eine Adresse an, die das Handy im selben WLAN öffnen kann.
  - [ ] Auf dem Handy läuft eine komplette Runde mit Touch-Steuerung.
  - [ ] Der Server ist ohne Zutun des Nutzers nicht aus dem Internet erreichbar; die Doku nennt „keine Portfreigabe im Router“.
  - [ ] Die Kurzanleitung erklärt die Firewall-Abfrage.
  - [ ] Der Handy-Zugriff ist abschaltbar bzw. startet nur bewusst.
- **Nicht im Umfang:** Zugriff von außerhalb des Heimnetzes, Hosting, Konten, Homescreen-App-Anleitung für Android.
- **Berührt:** Daten nein · personenbezogene Daten nein · Recht nein (privat, Heimnetz) · neue Abhängigkeit oder externer Dienst offen (Planner) · Architektur ja (lokaler Server, Netzwerk-Freigabe)
- **Offene Fragen an den Planner:** Abhängigkeit von RQ-01; Ausnahme von „keine Netzwerkaufrufe“ nur für eingehende lokale Verbindungen; Auswahl Port und Adresse; Umgang mit §5 „Dev-Server im WLAN“.
- **Entscheidungen:** Nutzer am 2026-11-01: als eigene Anforderung nach RQ-01 anlegen, nicht in RQ-01 aufnehmen. 
  Nutzer am 2026-11-01: Abnahmekriterien passen; RQ-02 freigegeben (Prio niedrig, nach RQ-01).
