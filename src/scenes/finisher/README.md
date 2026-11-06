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

## Gemeinsamer Speedline-Ring (AP-194, Q-95, H-50)

Ein Baustein für alle sechs Bosse: `fx/hitRing.ts` (Export über `fx/index.ts`). 24 Pixel-Keile um den
Trefferpunkt, 3 Stufen zu je `motion.rig-hit-ring-step` (33 ms), danach weg. Alle Zahlen stehen in den
Tokens `size.rig-hit-ring-*`, `motion.rig-hit-ring-step`, `opacity.rig-hit-ring-last` und
`color.finisher.speedline`. Je Stufe ein `Graphics`, in der Fabrik gezeichnet; `update` schaltet nur die
Sichtbarkeit (keine Allokation, Canvas-sicher, kein Tint, kein Blitz).

**Aufruf (ein Boss ruft nur auf):**

1. Im Bossmodul `fx/<bossId>.ts`: `'hit-ring': hitRingFx({ refH: BOSS_REF_H })`. Bezugshöhe `BOSS_REF_H` (64)
   oder `FOREST_GHOST_REF_H` (48; Sand-Wurm: Kopf, 64). Eigener Trefferpunkt über
   `centre: (api, out) => { out.x = …; out.y = …; }` (Standard: Boss-x, Boden − refH / 2 × Boss-Maßstab,
   also 204 bzw. 228). Optional `seed` für einen zweiten Ring in derselben Choreografie.
2. In der Choreografie ein `fx`-Ereignis mit demselben `atMs` wie `hitWhite`:
   `{ kind: 'fx', atMs, durationMs: HIT_RING, name: 'hit-ring', flash: false, reduce: 'drop' }`, wobei
   `HIT_RING` = `size.rig-hit-ring-steps` × `motion.rig-hit-ring-step` = 99 ms (`HIT_RING_MS` in `fx/hitRing.ts`;
   die Config liest die Tokens selbst, siehe `config/choreo/rootMonster.ts`). Innenradius r0 =
   `ringRadius(refH, Maßstab)` (104 bzw. 80). Im Cinematic kein Ring (dort gehört der Haupttreffer dem Impact-Paar).
3. „Reduzieren“: das Ereignis hat `reduce: 'drop'`, der Ring entfällt mit Boss-Weiß und Zittern. Er zählt
   nicht gegen `flashMaxPerWindow`.

Tiefe: Ebene des Boss-Containers + 0,5, also vor dem Boss samt `-sil`-Teilen. Steht die Astronautin per
`order` höher, liegt sie davor. Heute hat die Astronautin Ebene 20 und der Boss 21: der Ring liegt dann auch
über ihr, überdeckt sie aber nicht, weil er an der Stelle des Bosses sitzt. Winkel und Längen werden einmal
je Treffer gezogen (fester Seed aus `atMs`), alle drei Stufen teilen sie. Rosenschnitt: Ring bei 1000 ms,
Mitte Boss-x / Boden − 96, r0 104.
