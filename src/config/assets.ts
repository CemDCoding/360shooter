import type { AssetDef } from '../contracts/assets';

const SPRITE_NOTE =
  'PNG mit Transparenz, Blickrichtung nach rechts, Frames waagerecht nebeneinander.';

function sprite(
  key: string,
  frameWidth: number,
  frameHeight: number,
  frames: number,
  description: string,
): AssetDef {
  return {
    key,
    kind: 'spritesheet',
    path: `assets/sprites/${key}.png`,
    frameWidth,
    frameHeight,
    frames,
    description: `${description} ${frameWidth}x${frameHeight} Pixel pro Frame, ${frames} Frame(s). ${SPRITE_NOTE}`,
  };
}

function sound(name: string, description: string): AssetDef {
  return {
    key: `sfx-${name}`,
    kind: 'audio',
    path: `assets/sounds/${name}.wav`,
    description: `${description} WAV, 16 Bit, mono, 44,1 kHz, kurzer Effekt.`,
  };
}

/** Festes Asset-Manifest. Designer ersetzen nur die Dateien unter public/assets. */
export const ASSETS: readonly AssetDef[] = [
  sprite('astronaut', 32, 32, 4, 'Astronautin: 2 Frames Idle, 2 Frames Schuss.'),
  sprite('boss-placeholder', 64, 64, 2, 'Platzhalter-Boss.'),
  sprite('laser', 16, 4, 1, 'Laserschuss der Astronautin.'),
  sprite('witch-bolt', 8, 8, 2, 'Zauberkugel der Waldhexe.'),
  sprite('enemy-cursed-tree', 32, 32, 4, 'Gegner: verfluchter Baum.'),
  sprite('enemy-forest-witch', 32, 32, 4, 'Gegner: Waldhexe.'),
  sprite('enemy-zombie-squirrel', 24, 24, 4, 'Gegner: Zombie-Eichhoernchen.'),
  sprite('enemy-forest-spirit', 32, 32, 4, 'Gegner: Waldgeist.'),
  sprite('item-fire-rate', 16, 16, 2, 'Item: Feuerrate erhoehen.'),
  sprite('item-damage', 16, 16, 2, 'Item: Schaden erhoehen.'),
  sprite('item-size', 16, 16, 2, 'Item: Schussgroesse erhoehen.'),
  sprite('item-heal', 16, 16, 2, 'Item: Heilung.'),
  sprite('tiles-forest', 32, 32, 4, 'Map-Kacheln: Wald.'),
  sprite('tiles-forest-night', 32, 32, 4, 'Map-Kacheln: Wald bei Nacht.'),
  sprite('tiles-elf-forest', 32, 32, 4, 'Map-Kacheln: Elfenwald.'),
  sprite('ui-icons', 16, 16, 3, 'Oberflaechen-Symbole: Herz, Ton an, Ton aus.'),
  sound('laser', 'Laserschuss.'),
  sound('hit', 'Treffer auf einen Gegner.'),
  sound('enemy-death', 'Gegner wird besiegt.'),
  sound('item-pickup', 'Item eingesammelt.'),
  sound('player-hurt', 'Spielerin wird getroffen.'),
  sound('round-won', 'Runde gewonnen.'),
  sound('round-lost', 'Runde verloren.'),
];

/** Animations-Key fuer ein Spritesheet (von PreloadScene angelegt, wenn frames > 1). */
export const animKey = (key: string): string => `${key}-anim`;
