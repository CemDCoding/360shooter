# Sound austauschen

Diese Anleitung zeigt dir, wie du einen Sound im Spiel ersetzt. Du brauchst dafür keine Programmierkenntnisse. Du tauschst nur eine Tondatei aus. Das Spiel hat nur kurze Effekte, keine Musik.

## Was du brauchst

- **Audacity**: kostenloses Programm zum Aufnehmen und Bearbeiten von Ton.
- **jsfxr** oder **ChipTone**: kostenlose Programme im Browser. Sie erzeugen Retro-Effekte per Knopfdruck.
- Den Projektordner `360shooter` auf deinem Rechner.
- Ein Terminal (Eingabeaufforderung), um zwei Befehle einzutippen. Wie das geht, steht unten.

## Die Regeln

1. Format: **WAV**, **16 Bit**, **mono**, **44,1 kHz** (44100 Hz). Mono heißt ein Kanal, nicht Stereo.
2. Der **Dateiname bleibt unverändert**. Das Spiel findet den Sound nur über den Namen.
3. **Kurz halten.** Empfohlen sind 0,1 bis 0,6 Sekunden. Nur die Sieg- und Niederlage-Töne dürfen bis etwa 2 Sekunden lang sein.
4. **Keine Stille am Anfang.** Schneide leere Stellen vorne ab, sonst kommt der Ton zu spät.
5. **Lautstärke angleichen.** Alle Sounds sollen ähnlich laut sein. Die Spitze soll bei etwa minus 3 dB liegen und nie über 0 dB (kein Übersteuern, kein Knacken).

## Alle Sounds

Alle Dateien liegen in `public/assets/sounds/`. Die Namen stammen aus der Asset-Liste des Spiels (`src/config/assets.ts`).

| Datei           | Wann spielt der Sound                | Empfohlene Länge |
| --------------- | ------------------------------------ | ---------------- |
| laser.wav       | Die Astronautin schießt (Laserschuss) | 0,1 bis 0,3 s    |
| hit.wav         | Ein Schuss trifft einen Gegner       | 0,1 bis 0,3 s    |
| enemy-death.wav | Ein Gegner wird besiegt              | 0,2 bis 0,5 s    |
| item-pickup.wav | Die Spielerin sammelt ein Item ein   | 0,2 bis 0,5 s    |
| player-hurt.wav | Die Spielerin wird getroffen         | 0,2 bis 0,5 s    |
| round-won.wav   | Die Runde ist gewonnen               | 0,5 bis 2 s      |
| round-lost.wav  | Die Runde ist verloren               | 0,5 bis 2 s      |

Der Laser-Sound spielt sehr oft. Mach ihn deshalb besonders kurz und nicht zu laut.

## Schritt für Schritt

1. **Sound machen.** Erzeuge den Effekt in jsfxr oder ChipTone, oder nimm ihn in Audacity auf. Schneide die Stille am Anfang ab.
2. **Format einstellen.** In Audacity: Unten links "Projektrate" auf **44100 Hz** stellen. Ist die Spur Stereo, wähle `Spur > Mischen > Stereo-Spur zu Mono`.
3. **Exportieren.** In Audacity: `Datei > Audio exportieren`. Wähle **WAV (Microsoft)** und **Signed 16-bit PCM**. In jsfxr: Knopf "Export .wav" (prüfe danach die Werte, sie können abweichen).
4. **Speichern.** Speichere mit **demselben Namen** im Ordner `public/assets/sounds/`. Die alte Datei wird dabei ersetzt.
5. **Terminal öffnen.** Öffne den Projektordner im Datei-Explorer. Klicke oben in die Adresszeile, tippe `powershell` und drücke Enter. Es öffnet sich ein Fenster, in dem du Befehle eintippst.
6. **Dateien prüfen.** Tippe diesen Befehl und drücke Enter:

   ```
   npm run assets:check
   ```

   Der Befehl prüft alle Bilder und Sounds. Er meldet, wenn eine Datei fehlt oder ein falsches Format hat. Steht am Ende "Alles in Ordnung", ist alles richtig. Bei "FEHLER" lies die Meldung und korrigiere die genannte Datei.

7. **Im Spiel anhören.** Tippe diesen Befehl und drücke Enter:

   ```
   npm run dev
   ```

   Der Befehl startet das Spiel auf deinem Rechner. Im Fenster steht eine Adresse, meist `http://localhost:5173/`. Öffne sie im Browser und spiele, bis der Sound vorkommt. Zum Beenden drückst du im Terminal `Strg + C`.

8. **Lizenz eintragen.** Siehe den nächsten Abschnitt.

## Pflicht: Lizenz eintragen

Das Repository ist **öffentlich**. Jeder kann deine Dateien sehen. Darum gilt:

- Nutze nur Sounds, die du **selbst gemacht hast** oder die du **ausdrücklich verwenden darfst** (klare Lizenz, zum Beispiel CC0).
- Keine Sounds aus Filmen, Spielen oder aus dem Netz ohne erlaubte Lizenz.
- Trage jede ersetzte Datei in `public/assets/LICENSES.md` ein. Ändere in der Tabelle die Spalten "Herkunft" und "Lizenz". Bei fremden Sounds gehören Quelle, Autor und Lizenz dazu.

## Häufige Fehler

| Meldung oder Problem                  | Ursache                                   | Lösung                                                                  |
| ------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| "Die WAV hat 2 Kanäle"                | Stereo exportiert                         | In Audacity zu Mono mischen und neu exportieren                         |
| "Falsche Abtastrate"                  | Projektrate war nicht 44100 Hz            | Projektrate auf 44100 Hz stellen und neu exportieren                    |
| "Falsche Bittiefe"                    | Export mit 24 oder 32 Bit                 | Beim Export "Signed 16-bit PCM" wählen                                  |
| "keine gültige WAV-Datei"             | Datei nur umbenannt, zum Beispiel eine MP3 | Wirklich als WAV exportieren                                            |
| "Datei fehlt"                         | Name falsch oder falscher Ordner          | Name genau wie in der Tabelle schreiben, Ordner `public/assets/sounds/` |
| Sound kommt zu spät                   | Stille am Anfang                          | Leere Stelle vorne abschneiden                                          |
| Sound knackt oder klingt verzerrt     | Zu laut ausgesteuert                      | Lautstärke senken, Spitze bei etwa minus 3 dB                           |
| Änderung nicht hörbar                 | Browser zeigt alte Datei                  | Seite mit `Strg + F5` neu laden                                         |
