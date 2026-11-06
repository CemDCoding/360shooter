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

## Design-System-Nachzug (AP-193, Q-92, H-48)

- **Impact hell:** Läuft ein `hitWhite` zugleich mit dem `fx` `impact-pair` (gleiches `atMs`), zeichnen
  die Teile in der hellen Hälfte ihr `-ink`-Bild (`<Bogen>-ink-<Index>`, abgeleitet wie die
  Silhouette, `inkFrame`), in der dunklen Hälfte das weiße `-sil-`-Bild (invertiert, nicht eigens
  gezeichnet). Beide Hälften liegen hinter den Figuren. Bei „Reduzieren“ entfällt das Paar.
- **Tokens statt Zahlen:** Wackel-Rhythmus aus `motion.rig-shake-step`/`-half` (eine Quelle:
  `SHAKE_STEP_MS`/`SHAKE_HALF_MS` in `timing.ts`), Smear-Standzeit `motion.rig-smear` 33 ms, nur für
  den Bogen-Smear `blade-arc` `motion.rig-smear-arc` 66 ms (`smearMsOf`, bis H-47 angenommen),
  Stehpunkte aus `size.rig-astro-x-*`/`size.rig-boss-x-*`, Neigung der Hälften aus
  `size.rig-fine-rotate`. `PORTRAIT_SCALE` steht nur in `layout.ts`.
- **Haupttreffer im Kampfmoment (13a):** nur Boss-Weiß (`motion.rig-hit-white`, 100 ms), Zittern, kein
  Vollbild-Blitz. Das Vollbild-Impact-Paar gehört nur dem Cinematic.
