import type { AssetDef } from '../contracts/assets';

const SPRITE_NOTE =
  'PNG mit Transparenz, Blickrichtung nach rechts, Frames waagerecht nebeneinander. Entsteht mit "npm run sprites:build" aus dem Design, nicht von Hand ersetzen.';

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

/** Bitmap-Schrift: Atlas-PNG plus BMFont-XML. Entsteht aus `npm run fonts:build`, nicht von Hand. */
function font(key: string, description: string): AssetDef {
  return {
    key,
    kind: 'bitmapFont',
    path: `assets/fonts/${key}.png`,
    xmlPath: `assets/fonts/${key}.xml`,
    description: `${description} Wird mit "npm run fonts:build" erzeugt (PNG und XML), nicht von Hand ersetzen.`,
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

/** Assets mit eigener Datei. */
const OWN_ASSETS: readonly AssetDef[] = [
  sprite('astronaut', 32, 32, 4, 'Astronautin: Frame 0 bis 1 Ruhe, Frame 2 bis 3 Rückstoß.'),
  sprite('boss-root-monster', 64, 64, 4, 'Boss: verwurzeltes Baummonster (Wald).'),
  sprite('boss-root-spike', 16, 32, 3, 'Boss-Angriff: Wurzelspitze des Baummonsters.'),
  sprite('boss-forest-ghost', 48, 48, 4, 'Boss: Waldgeist (Wald bei Nacht).'),
  sprite('boss-ghost-orb', 8, 8, 2, 'Boss-Angriff: Geisterkugel des Waldgeists.'),
  sprite('boss-giant-stone', 64, 64, 4, 'Boss: Riesen-Stein (Elfenwald).'),
  sprite('laser', 16, 4, 1, 'Laserschuss der Astronautin.'),
  sprite('witch-bolt', 8, 8, 2, 'Zauberkugel der Waldhexe.'),
  sprite('enemy-cursed-tree', 32, 32, 4, 'Gegner: verfluchter Baum.'),
  sprite('enemy-forest-witch', 32, 32, 4, 'Gegner: Waldhexe.'),
  sprite('enemy-zombie-squirrel', 24, 24, 4, 'Gegner: Zombie-Eichhoernchen.'),
  sprite('enemy-forest-spirit', 32, 32, 4, 'Gegner: Waldgeist.'),
  sprite('item-heal', 16, 16, 2, 'Item: Heilung.'),
  sprite('item-double-shot', 16, 16, 2, 'Item: Doppelschuss.'),
  sprite('item-shield', 16, 16, 2, 'Item: Schutzschild.'),
  sprite('item-rapid-fire', 16, 16, 2, 'Item: Schnellfeuer.'),
  sprite('item-fire-ring', 16, 16, 2, 'Ruestung: Feuerring.'),
  sprite('coin-small', 8, 8, 4, 'Kleine Muenze fuer Menue-Symbole, Drehung in 4 Frames.'),
  sprite('coin-field', 6, 6, 4, 'Kleine Muenze auf dem Feld, Drehung in 4 Frames.'),
  sprite('coin-big', 12, 12, 4, 'Grosse Muenze, Drehung in 4 Frames.'),
  sprite('tiles-forest', 32, 32, 4, 'Map-Kacheln: Wald.'),
  sprite('tiles-forest-night', 32, 32, 4, 'Map-Kacheln: Wald bei Nacht.'),
  sprite('tiles-elf-forest', 32, 32, 4, 'Map-Kacheln: Elfenwald.'),
  sprite('enemy-mummy', 32, 32, 4, 'Gegner: Mumie (Wueste).'),
  sprite('mummy-wrap', 16, 8, 2, 'Gegner-Schuss: Mumienbinde.'),
  sprite('enemy-sand-worm', 24, 24, 4, 'Gegner: Sandwurm.'),
  sprite('enemy-armadillo', 32, 32, 4, 'Gegner: Guerteltier.'),
  sprite('enemy-camel', 32, 32, 4, 'Gegner: Kamel.'),
  sprite('camel-spit', 8, 8, 2, 'Gegner-Schuss: Kamelspucke.'),
  sprite('enemy-snake', 24, 24, 4, 'Gegner: Schlange.'),
  sprite('enemy-archaeologist', 32, 32, 4, 'Gegner: Archaeologe.'),
  sprite('enemy-sphinx', 48, 48, 4, 'Gegner: Sphinx.'),
  sprite('enemy-boar', 32, 32, 4, 'Gegner: Wildschwein.'),
  sprite('enemy-bear', 32, 32, 4, 'Gegner: Baer.'),
  sprite('enemy-fairy', 24, 24, 4, 'Gegner: Fee.'),
  sprite('boss-sand-worm', 64, 64, 4, 'Boss: Sandwurm (Kopf).'),
  sprite('boss-sand-worm-body', 32, 32, 3, 'Boss: Koerperglied des Sandwurms.'),
  sprite('boss-guardian-dog', 64, 64, 4, 'Boss: Waechterhund.'),
  sprite('boss-pharaoh', 64, 64, 4, 'Boss: Pharao.'),
  sprite('boss-pharaoh-orb', 8, 8, 2, 'Boss-Angriff: Goldkugel des Pharaos.'),
  sprite('tiles-desert', 32, 32, 4, 'Map-Kacheln: Wueste.'),
  sprite('tiles-pyramids', 32, 32, 4, 'Map-Kacheln: Pyramiden.'),
  sprite('tiles-oasis', 32, 32, 4, 'Map-Kacheln: Oase.'),
  sprite(
    'weapon-raygun',
    24,
    16,
    6,
    'Strahlenpistole, nach rechts zeigend: je Ausbaustufe 2 Frames (Ruhe, Schuss), Stufe 1 bis 3.',
  ),
  sprite(
    'ui-icons',
    16,
    16,
    4,
    'Oberflaechen-Symbole: Frame 0 Ton an, 1 Ton aus, 2 Pause, 3 Schloss.',
  ),
  font(
    'astro-kapsel',
    'Bitmap-Schrift "Astro Kapsel": dicke Schrift fuer Titel, Menue und grosse Zahlen.',
  ),
  font('astro-funk', 'Bitmap-Schrift "Astro Funk": schmale Schrift fuer HUD und Beschriftungen.'),
  sound('laser', 'Laserschuss.'),
  sound('hit', 'Treffer auf einen Gegner.'),
  sound('enemy-death', 'Gegner wird besiegt.'),
  sound('item-pickup', 'Item eingesammelt.'),
  sound('player-hurt', 'Spielerin wird getroffen.'),
  sound('round-won', 'Runde gewonnen.'),
  sound('round-lost', 'Runde verloren.'),
  sound('coin', 'Muenze eingesammelt.'),
  sound('shield-break', 'Schutzschild geht kaputt.'),
  sound('boss-warning', 'Warnung kurz bevor der Boss erscheint.'),
  sound('boss-defeated', 'Boss wird besiegt.'),
];

/** Festes Asset-Manifest. Designer ersetzen nur die Dateien unter public/assets. */
export const ASSETS: readonly AssetDef[] = OWN_ASSETS;

/** Animations-Key fuer ein Spritesheet (von PreloadScene angelegt, wenn frames > 1). */
export const animKey = (key: string): string => `${key}-anim`;
