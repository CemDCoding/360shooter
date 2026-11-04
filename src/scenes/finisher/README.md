# Finisher – Aufbau Abspieler (M13, AP-182)

`FinisherScene` spielt einen `FinisherPlan` ab:

- **Mit `plan.choreo`** (Prüfung `choreoOf` in `startData.ts`) läuft der `ChoreoPlayer`
  (`choreoPlayer.ts`). Die Hauptkamera zeigt die Welt (Figuren, Nachbilder, Funken, Schnittlinie,
  Einschlagbild) mit Zoom, Scroll und Wackeln. Eine zweite Kamera zeigt die Bildschirmebene
  (Blitz, Text, Hinweis „Überspringen“) ohne Zoom. Beide Kameras räumt Phaser bei SHUTDOWN ab.
- **Ohne Choreografie** laufen unverändert die M10-Bausteine über die Timeline (Rückfall).

## Module

| Datei             | Inhalt                                                                                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `choreoPlayer.ts` | Uhr (`sampleChoreo`: Zeitlupe, Hit-Stop), Spuren auf Teile, ein Runner pro Ereignis                                                                                                          |
| `rig.ts`          | Figur = ein flacher Container mit einem Bild pro Teil; Eltern (eine Ebene) im Code gelöst, Feinrotation höchstens `size.rig-fine-rotate`, Smear-Posen 33–66 ms, Hit-Weiß über `-sil-`-Frames |
| `trails.ts`       | Nachbilder (3 Kopien, Alpha 0,55/0,35/0,18, Abstand 33 ms, Ausblenden 150 ms in 3 Stufen), Schnittlinie `slash` als Graphics-Band                                                            |
| `sparks.ts`       | Funken-Pool mit `CHOREO_RULES.maxParticles` Bildern, vorgefärbte Frames                                                                                                                      |
| `shots.ts`        | Kamera aus Einstellungen (`shots`) und `camera`-Spuren, Bildschirmwackeln                                                                                                                    |
| `fx/`             | Boss-eigene Effekte (`fx`-Ereignisse), je Boss ein Modul (`BOSS_FX`)                                                                                                                         |
| `debugChoreo.ts`  | Testsequenz für `?finisher=0` mit den Platzhalterfiguren, bis das Register eine echte Choreografie hat                                                                                       |

## Regeln

- Alles läuft auch mit dem Canvas-Renderer: kein Tint (nur der Titeltext unter WebGL), keine FX,
  kein Rope, keine Pipelines. Hit-Weiß kommt aus den `-sil-`-Frames, bei Platzhaltern aus einer
  einmal gezeichneten Silhouette (`TextureBank`).
- Jedes Objekt entsteht beim Start; `update` erzeugt nichts.
- Bühne 640 px breit, in breiteren Arenen mittig (`stageX`); Kamera-Scroll 0 = Bühne mittig.
- Ereignisdauern zählen in Echtzeit; Zeitlupe und Hit-Stop stecken in der Uhr.
- Atlas `finisher-rig-<BossId>`: `FinisherScene.preload` lädt ihn aus `FINISHER_ATLASES`
  (`atlasToLoad`); fehlt er, zeigen die Figuren das Spiel-Sprite.
- Die Uhr wird einmal vorberechnet (`prepareChoreo`) und pro Bild ohne Allokation abgetastet (`sampleClock`).
