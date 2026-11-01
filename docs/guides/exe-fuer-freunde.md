# 360shooter am PC spielen: Kurzanleitung

Du hast eine Datei wie `360shooter-0.1.0-portable.exe` bekommen. Diese Anleitung erklärt in ein paar Schritten, wie du das Spiel startest. Die Datei ist nur für dich gedacht. Bitte gib sie nicht weiter und lade sie nirgends hoch.

Du brauchst einen Windows-PC und eine Maus. Gezielt wird mit der Maus, geschossen mit der Maustaste.

## 1. Starten

1. Speichere die Datei an einem Ort, den du wiederfindest, zum Beispiel auf dem Desktop oder im Ordner „Downloads“.
2. Starte das Spiel mit einem **Doppelklick** auf die Datei.

Es gibt **keine Installation**. Die Datei ist das ganze Spiel. Der Start kann ein paar Sekunden dauern, weil Windows die Datei bei jedem Start erst auspackt.

## 2. Die Windows-Warnung

Beim ersten Start zeigt Windows wahrscheinlich ein blaues Fenster: **„Der Computer wurde durch Windows geschützt“**.

1. Klicke auf **„Weitere Informationen“**.
2. Klicke auf **„Trotzdem ausführen“**.

Warum kommt die Warnung? Die Datei ist nicht digital signiert. Eine Signatur kostet Geld und lohnt sich nur, wenn ein Programm öffentlich verteilt wird. Dieses Spiel wird nur privat unter Freunden weitergegeben. Windows kennt die Datei deshalb nicht und warnt vorsichtshalber.

Auch ein Virenscanner kann die Datei fälschlich melden oder in Quarantäne schieben. Das passiert bei unsignierten Programmen öfter. Starte die Datei nur, wenn du sie direkt von der Person bekommen hast, die das Spiel gebaut hat. Bist du unsicher, frag bei ihr nach, bevor du etwas freigibst.

## 3. Vollbild und Beenden

- Das Spiel startet im **Vollbild**.
- Mit **F11** wechselst du zwischen Vollbild und Fenster. Drückst du F11 noch einmal, geht es zurück ins Vollbild.
- Im Fenster siehst du oben das Menü **„Spiel“** mit „Vollbild an/aus (F11)“ und „Beenden“.
- Beenden kannst du jederzeit mit **Alt+F4**, auch im Vollbild.

## 4. Spielstand

Dein Fortschritt (Gold, Upgrades, freigeschaltete Level) bleibt erhalten, auch wenn du das Spiel schließt und später neu startest. Er liegt nur auf deinem PC, im Ordner:

```text
%APPDATA%\360shooter
```

Du kannst diesen Pfad in die Adresszeile des Explorers eintippen und mit Enter öffnen.

**Fortschritt zurücksetzen** geht auf zwei Wegen:

- Im Hauptmenü des Spiels auf **„Fortschritt zurücksetzen“** klicken und bestätigen.
- Oder das Spiel beenden und den Ordner `%APPDATA%\360shooter` löschen. Beim nächsten Start beginnst du von vorn.

## 5. Daten und Internet

Das Spiel sendet nichts ins Internet und sammelt keine Daten über dich. Es braucht keine Anmeldung und kein Konto. Der Spielstand bleibt auf deinem PC.

## Auf dem Handy spielen

Du kannst das Spiel auch auf dem Handy spielen, solange PC und Handy im selben WLAN sind. Der Handy-Zugriff ist nach jedem Programmstart aus und startet nur, wenn du ihn selbst einschaltest.

1. Drücke im Spiel **Strg+H** (geht auch im Vollbild) oder wähle im Menü **Spiel > Handy-Zugriff…**.
2. Klicke auf **Starten**. Das Fenster zeigt eine oder mehrere Adressen, zum Beispiel `http://192.168.178.20:8360`.
3. Öffne eine dieser Adressen im Browser deines Handys.
4. Fragt die Windows-Firewall beim ersten Start nach: **„Private Netzwerke“ zulassen**, **„Öffentliche Netzwerke“ nicht zulassen**.
5. Richte im Router **keine Portfreigabe** ein. Der Zugriff ist nur für dein Heimnetz gedacht.
6. Der Spielstand am Handy ist vom PC getrennt und gehört zu dieser Adresse. Eine andere Adresse oder ein anderes Handy beginnt bei null.
7. Zum Beenden drücke wieder **Strg+H** und klicke auf **Stoppen**. Beim Schließen des Spiels stoppt der Zugriff automatisch.

Zeigt das Fenster „kein privates Netzwerk gefunden“, ist der PC nicht mit einem WLAN oder LAN verbunden. Meldet es „Port belegt“, läuft das Spiel schon ein zweites Mal oder ein anderes Programm nutzt den Port.
