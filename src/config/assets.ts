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
  // M8 (Shop, Ruestung, Pets): Pixel in docs/design/assets/sprites-m8.js. Ingame-Overlays passen zu den Frames von astronaut.
  sprite('gear-diamond-head', 32, 32, 4, 'Ruestungsteil diamond/head: Overlay auf der Spielerin.'),
  sprite('gear-diamond-body', 32, 32, 4, 'Ruestungsteil diamond/body: Overlay auf der Spielerin.'),
  sprite('gear-diamond-legs', 32, 32, 4, 'Ruestungsteil diamond/legs: Overlay auf der Spielerin.'),
  sprite('gear-hell-head', 32, 32, 4, 'Ruestungsteil hell/head: Overlay auf der Spielerin.'),
  sprite('gear-hell-body', 32, 32, 4, 'Ruestungsteil hell/body: Overlay auf der Spielerin.'),
  sprite('gear-hell-legs', 32, 32, 4, 'Ruestungsteil hell/legs: Overlay auf der Spielerin.'),
  sprite('gear-heaven-head', 32, 32, 4, 'Ruestungsteil heaven/head: Overlay auf der Spielerin.'),
  sprite('gear-heaven-body', 32, 32, 4, 'Ruestungsteil heaven/body: Overlay auf der Spielerin.'),
  sprite('gear-heaven-legs', 32, 32, 4, 'Ruestungsteil heaven/legs: Overlay auf der Spielerin.'),
  sprite(
    'gear-icons',
    24,
    24,
    9,
    'Ruestungs-Symbole: Frame = Set*3 + Slot (diamond, hell, heaven; head, body, legs).',
  ),
  sprite('gear-diamond-glint', 32, 32, 4, 'Diamant-Set: Glitzer-Overlay.'),
  sprite('gear-burn', 8, 8, 4, 'Hoellen-Set: Brandeffekt.'),
  sprite('gear-blast', 24, 24, 4, 'Himmels-Set: Druckwelle.'),
  sprite('pet-bee', 16, 16, 6, 'Pet: bee.'),
  sprite('pet-penguin', 16, 16, 6, 'Pet: penguin.'),
  sprite('pet-capybara', 16, 16, 6, 'Pet: capybara.'),
  sprite('petgear-bee-diamond', 16, 16, 6, 'Pet-Ruestung bee/diamond.'),
  sprite('petgear-bee-hell', 16, 16, 6, 'Pet-Ruestung bee/hell.'),
  sprite('petgear-bee-heaven', 16, 16, 6, 'Pet-Ruestung bee/heaven.'),
  sprite('petgear-penguin-diamond', 16, 16, 6, 'Pet-Ruestung penguin/diamond.'),
  sprite('petgear-penguin-hell', 16, 16, 6, 'Pet-Ruestung penguin/hell.'),
  sprite('petgear-penguin-heaven', 16, 16, 6, 'Pet-Ruestung penguin/heaven.'),
  sprite('petgear-capybara-diamond', 16, 16, 6, 'Pet-Ruestung capybara/diamond.'),
  sprite('petgear-capybara-hell', 16, 16, 6, 'Pet-Ruestung capybara/hell.'),
  sprite('petgear-capybara-heaven', 16, 16, 6, 'Pet-Ruestung capybara/heaven.'),
  sprite(
    'petgear-icons',
    16,
    16,
    9,
    'Pet-Ruestungs-Symbole: Frame = Pet*3 + Set (bee, penguin, capybara; diamond, hell, heaven).',
  ),
  sprite('egg-bee', 16, 16, 4, 'Ei: bee.'),
  sprite('egg-penguin', 16, 16, 4, 'Ei: penguin.'),
  sprite('egg-capybara', 16, 16, 4, 'Ei: capybara.'),
  sprite('pet-hatch', 24, 24, 3, 'Pet schluepft aus dem Ei.'),
  sprite('pet-snowball', 8, 8, 2, 'Pet-Angriff: Schneeball.'),
  sprite('pet-sting', 8, 8, 2, 'Pet-Angriff: Stachel.'),
  sprite('pet-steam', 8, 8, 4, 'Pet-Effekt: Dampf.'),
  sprite('pet-heal', 8, 8, 4, 'Pet-Effekt: Heilung.'),
  sprite('diamond', 8, 8, 4, 'Diamant (Waehrung).'),
  sprite('diamond-marker', 8, 8, 2, 'Diamant-Marker in der Karte.'),
  sprite('ui-icons-m8', 8, 8, 2, 'Oberflaechen-Symbole M8.'),
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
  sound('parry', 'Boss-Angriff mit allen Quicktime-Kreisen abgewehrt (PARRY!).'),
];

/** Festes Asset-Manifest. Designer ersetzen nur die Dateien unter public/assets. */
export const ASSETS: readonly AssetDef[] = OWN_ASSETS;

/** Animations-Key fuer ein Spritesheet (von PreloadScene angelegt, wenn frames > 1). */
export const animKey = (key: string): string => `${key}-anim`;
