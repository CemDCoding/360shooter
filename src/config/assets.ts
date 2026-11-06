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

/** Bogen eines Figurenteils: [Schluessel, Breite, Hoehe, Frames, Beschreibung]. */
type RigSheet = readonly [string, number, number, number, string];

/** Figur eines Teils: Kurzname im Schluessel (`rig-<kurz>-<teil>`) und Anzeigename. */
const RIG_WHO = {
  astro: 'Astronautin',
  root: 'Baummonster',
  ghost: 'Waldgeist',
  stone: 'Riesen-Stein',
  worm: 'Sand-Wurm',
  dog: 'Waechter-Hund',
  pharaoh: 'Pharao',
} as const;

/**
 * Teil mit Posen (Frames), sein Silhouetten-Bogen `<key>-sil` (alle Pixel weiss, gleicher Rahmen) und sein
 * Tinten-Bogen `<key>-ink` (alle Pixel Tinte, helles Impact-Bild, Q-92).
 */
function partSheets(
  rig: keyof typeof RIG_WHO,
  part: string,
  w: number,
  h: number,
  poses: string,
): RigSheet[] {
  const n = poses.split(' ').length;
  const who = RIG_WHO[rig];
  return [
    [`rig-${rig}-${part}`, w, h, n, `Figurenteil ${who} "${part}", Posen: ${poses}.`],
    [`rig-${rig}-${part}-sil`, w, h, n, `Silhouette (weiss) zu "${part}" (${who}), gleiche Posen.`],
    [
      `rig-${rig}-${part}-ink`,
      w,
      h,
      n,
      `Tinten-Bild (Tinte) zu "${part}" (${who}), gleiche Posen.`,
    ],
  ];
}

/** Teile der Astronautin (10 Teile, je Bogen `-sil` und `-ink`). Klinge und Bogen haben seit H-48 neue Masse und eine Pose mehr. */
const ASTRO_SHEETS: readonly RigSheet[] = [
  ...partSheets('astro', 'pack', 8, 37, 'rest thrust'),
  ...partSheets('astro', 'arm-back', 15, 23, 'rest back up'),
  ...partSheets('astro', 'leg-back', 21, 23, 'stand crouch tuck kneel smear'),
  ...partSheets('astro', 'leg-front', 20, 23, 'stand crouch tuck kneel smear'),
  ...partSheets('astro', 'torso', 25, 30, 'upright lean smear'),
  ...partSheets('astro', 'helmet', 35, 34, 'serious dark'),
  ...partSheets('astro', 'arm-front', 26, 29, 'rest aim raise slash-end smear'),
  ...partSheets('astro', 'blade', 56, 9, 'full grow2 grow1 spear'),
  ...partSheets('astro', 'raygun', 32, 31, 'a0 up45 up90 back135 down45'),
  ...partSheets('astro', 'blade-arc', 63, 50, 'arc1 arc2 hammer'),
];

/** Teile des Baummonsters (8 Teile) und seine Effekte (Teil 1, H-46). */
const ROOT_SHEETS: readonly RigSheet[] = [
  ...partSheets('root', 'crown', 54, 36, 'upright bent'),
  ...partSheets('root', 'arm-right', 29, 56, 'rest raised stab'),
  ...partSheets('root', 'roots-right', 22, 17, 'rest'),
  ...partSheets('root', 'roots-left', 22, 17, 'rest'),
  ...partSheets('root', 'trunk-right', 21, 35, 'rest cracked'),
  ...partSheets('root', 'trunk-left', 21, 35, 'rest cracked'),
  ...partSheets('root', 'jaw', 24, 16, 'closed roar'),
  ...partSheets('root', 'arm-left', 30, 56, 'rest raised stab'),
  [
    'rig-fx-root',
    8,
    8,
    8,
    'Partikel Baummonster (vorgefaerbt): 0 Rose, 1 Knospe, 2 Bluetenblatt, 3 Blatt hell, 4 Blatt dunkel, 5 Holzsplitter, 6 Funke Koralle, 7 Funke weiss.',
  ],
  [
    'rig-prop-rosehedge',
    80,
    28,
    3,
    'Rosenhecke: 0 Triebe, 1 Blaetter und Knospen, 2 volle Bluete.',
  ],
  [
    'rig-fx-ground-bulge',
    48,
    16,
    3,
    'Bodenwoelbung unter der Astronautin: 0 Riss, 1 Huegel, 2 Huegel mit Wurzelspitzen.',
  ],
];

/** Teile des Waldgeists (7 Teile) und sein Effekt-Bogen (Teil 2, H-48). */
const GHOST_SHEETS: readonly RigSheet[] = [
  ...partSheets('ghost', 'tail-wisp', 32, 10, 'rest flow stretch trug'),
  ...partSheets('ghost', 'antenna-right', 15, 13, 'rest swept trug'),
  ...partSheets('ghost', 'antenna-left', 15, 13, 'rest swept trug'),
  ...partSheets('ghost', 'arm-right', 17, 14, 'rest reach trug'),
  ...partSheets('ghost', 'arm-left', 17, 14, 'rest reach trug'),
  ...partSheets('ghost', 'body', 32, 41, 'rest stretch dissolve1 dissolve2 trug'),
  ...partSheets('ghost', 'face', 18, 18, 'rest wail trug'),
  [
    'rig-fx-ghost',
    8,
    8,
    4,
    'Partikel Waldgeist (vorgefaerbt): 0 Mondfunke, 1 Mondstaub, 2 Nebel, 3 Scherbe.',
  ],
];

/** Teile des Riesen-Steins (9 Teile, 4 Brocken) und sein Effekt-Bogen. */
const STONE_SHEETS: readonly RigSheet[] = [
  ...partSheets('stone', 'fist-right', 20, 18, 'rest raised frozen'),
  ...partSheets('stone', 'body', 58, 50, 'rest cracked1 cracked2 cracked3'),
  ...partSheets('stone', 'crystals', 23, 15, 'rest lit'),
  ...partSheets('stone', 'face', 31, 22, 'rest strain frozen'),
  ...partSheets('stone', 'chunk-1', 34, 30, 'rest'),
  ...partSheets('stone', 'chunk-2', 30, 33, 'rest'),
  ...partSheets('stone', 'chunk-3', 35, 25, 'rest'),
  ...partSheets('stone', 'chunk-4', 30, 43, 'rest'),
  ...partSheets('stone', 'fist-left', 35, 18, 'rest raised punch frozen'),
  [
    'rig-fx-stone',
    8,
    8,
    6,
    'Partikel Riesen-Stein (vorgefaerbt): 0 Stein, 1 Kiesel, 2 Staub, 3 Morgenfunke, 4 Kristallsplitter, 5 Lichtfunke.',
  ],
];

/** Teile des Sand-Wurms (10 Teile, `rig-worm-seg` gilt fuer alle sieben Glieder), Effekt und Sandwelle. */
const WORM_SHEETS: readonly RigSheet[] = [
  ...partSheets('worm', 'tail', 29, 22, 'rest crumble1 crumble2'),
  ...partSheets('worm', 'seg', 26, 27, 'rest crumble1 crumble2'),
  ...partSheets('worm', 'head', 52, 44, 'rest crumble1 crumble2'),
  ...partSheets('worm', 'jaw', 22, 28, 'closed open roar crumble1 crumble2'),
  [
    'rig-fx-worm',
    8,
    8,
    5,
    'Partikel Sand-Wurm (vorgefaerbt): 0 Sandklumpen, 1 Sandkorn, 2 Staub, 3 Zahnsplitter, 4 Sonnenfunke.',
  ],
  [
    'rig-prop-sandwave',
    64,
    20,
    3,
    'Sandwelle vor dem Durchbruch des Wurms: 0 Wellenschlag, 1 steigende Welle, 2 Kamm mit Gischt.',
  ],
];

/** Teile des Waechter-Hunds (10 Teile, `rig-dog-shade` gilt fuer alle drei Schattenkoepfe), Effekt und Fackel. */
const DOG_SHEETS: readonly RigSheet[] = [
  ...partSheets('dog', 'legs-back', 17, 21, 'stand lie stone'),
  ...partSheets('dog', 'legs-front', 20, 21, 'stand lie stone'),
  ...partSheets('dog', 'tail', 12, 22, 'rest down stone'),
  ...partSheets('dog', 'body', 46, 31, 'rest dark stone'),
  ...partSheets('dog', 'head', 25, 30, 'rest low sleep stone'),
  ...partSheets('dog', 'jaw', 12, 7, 'closed snap stone'),
  ...partSheets('dog', 'collar', 18, 10, 'rest dark broken stone'),
  ...partSheets('dog', 'shade', 20, 25, 'rest snap fade'),
  [
    'rig-fx-dog',
    8,
    8,
    5,
    'Partikel Waechter-Hund (vorgefaerbt): 0 Rune, 1 Runenfunke, 2 Schatten, 3 Funke, 4 Steinbrocken.',
  ],
  [
    'rig-prop-torch',
    8,
    16,
    3,
    'Fackel der Grabkammer: 0 aus, 1 und 2 brennend (Cinematic Level 30).',
  ],
];

/** Teile des Pharaos (6 Teile, ohne Arme), Effekt und Raetsel-Symbole. */
const PHARAOH_SHEETS: readonly RigSheet[] = [
  ...partSheets('pharaoh', 'robe', 40, 30, 'rest gilded-half gilded'),
  ...partSheets('pharaoh', 'collar', 28, 15, 'rest gilded'),
  ...partSheets('pharaoh', 'flail', 25, 27, 'rest raised gilded'),
  ...partSheets('pharaoh', 'crook', 21, 26, 'rest raised gilded'),
  ...partSheets('pharaoh', 'head', 28, 27, 'rest glare cracked gilded'),
  ...partSheets('pharaoh', 'orb-ring', 67, 27, 'spin1 spin2 spin3'),
  [
    'rig-fx-pharaoh',
    8,
    8,
    5,
    'Partikel Pharao (vorgefaerbt): 0 Goldfunke, 1 Goldkorn, 2 Goldsplitter, 3 Stoffstreifen, 4 Lichtfunke.',
  ],
  [
    'rig-prop-riddle',
    16,
    16,
    6,
    'Raetsel-Symbole des Pharaos: 0 Kind, 1 Mensch, 2 Greis; 3 bis 5 dieselben leuchtend.',
  ],
];

/**
 * Alle Boegen der Figurenteile (Teil 1 und 2). Jeder Bogen ist ein Spritesheet; Teile und Effekte landen zusaetzlich
 * im Atlas ihres Bosses (`FINISHER_ATLASES`), Bildname im Atlas = `<Bogen>-<Index>`.
 */
const RIG_SHEETS: readonly RigSheet[] = [
  ...ASTRO_SHEETS,
  ...ROOT_SHEETS,
  ...GHOST_SHEETS,
  ...STONE_SHEETS,
  ...WORM_SHEETS,
  ...DOG_SHEETS,
  ...PHARAOH_SHEETS,
];

/**
 * Atlas je Boss-Variante (PE-248, PE-252): ein PNG plus Phaser-JSON-Hash, gebaut von `npm run sprites:build`
 * aus den Boegen `sheets` (jedes Einzelbild heisst `<Bogen>-<Index>`). Die Szene leitet den Atlas aus dem Boss-Rig ab.
 */
export interface FinisherAtlasDef {
  key: string;
  path: string;
  jsonPath: string;
  sheets: readonly string[];
}

/** Atlas eines Bosses: Teile der Astronautin plus Teile und Effekte des Bosses (geteilte Boegen nur einmal). */
function atlas(boss: string, bossSheets: readonly RigSheet[]): FinisherAtlasDef {
  return {
    key: `finisher-rig-${boss}`,
    path: `assets/sprites/finisher-rig-${boss}.png`,
    jsonPath: `assets/sprites/finisher-rig-${boss}.json`,
    sheets: [...ASTRO_SHEETS, ...bossSheets].map((x) => x[0]),
  };
}

export const FINISHER_ATLASES: readonly FinisherAtlasDef[] = [
  atlas('rootMonster', ROOT_SHEETS),
  atlas('forestGhost', GHOST_SHEETS),
  atlas('giantStone', STONE_SHEETS),
  atlas('giantSandWorm', WORM_SHEETS),
  atlas('guardianDog', DOG_SHEETS),
  atlas('pharaoh', PHARAOH_SHEETS),
];

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
  sprite('parry-symbols', 14, 14, 21, 'Quicktime-Symbole (einfarbig, wird getoent).'),
  sprite('parry-decoy-edge', 44, 44, 2, 'Quicktime: Rand der Taeuschungs-Kreise.'),
  sprite('parry-motifs', 16, 16, 10, 'Quicktime: Motivbilder der Maerchen (farbig).'),
  sprite('parry-riddle', 24, 24, 3, 'Quicktime: Raetsel-Symbole.'),
  sprite('parry-scale', 32, 24, 3, 'Quicktime: Waage.'),
  sprite('ui-icons-m9', 8, 8, 3, 'Oberflaechen-Symbole M9.'),
  sprite(
    'finisher-portrait',
    160,
    20,
    6,
    'Finisher: Visier-Streifen der Astronautin (Bild = Boss).',
  ),
  sprite('finisher-hit', 96, 96, 6, 'Finisher: Nahaufnahme des Bosses beim Schlusstreffer.'),
  sprite('finisher-shards', 4, 4, 18, 'Finisher: Splitter (3 je Boss).'),
  sprite('finisher-finale-4', 320, 180, 11, 'Finisher: Bildfolge Level 4 (Baummonster).'),
  sprite('finisher-finale-9', 320, 180, 11, 'Finisher: Bildfolge Level 9 (Waldgeist).'),
  sprite('finisher-finale-20', 320, 180, 11, 'Finisher: Bildfolge Level 20 (Riesen-Stein).'),
  sprite('finisher-finale-25', 320, 180, 11, 'Finisher: Bildfolge Level 25 (Sand-Wurm).'),
  sprite('finisher-finale-30', 320, 180, 11, 'Finisher: Bildfolge Level 30 (Waechter-Hund).'),
  sprite('finisher-finale-40a', 320, 180, 9, 'Finisher: Bildfolge Level 40, Bogen a (Bild 0-8).'),
  sprite('finisher-finale-40b', 320, 180, 9, 'Finisher: Bildfolge Level 40, Bogen b (Bild 9-17).'),
  // M11/M12 (H-43): Pixel in docs/design/assets/sprites-m11.js.
  sprite('elite-crown', 9, 7, 1, 'Elite-Krone ueber dem Gegner (farbig, nicht getoent).'),
  sprite(
    'event-markers',
    24,
    24,
    2,
    'Rand-Marker der Spawn-Ereignisse, fuer den oberen Rand: Frame 0 Schwarm, 1 Zange (weiss, wird getoent).',
  ),
  // M13 (H-46, AP-183): Figurenteile und Effekte der Finisher-Choreografien, Pixel in docs/design/assets/sprites-m13.js.
  ...RIG_SHEETS.map(([key, w, h, frames, description]) => sprite(key, w, h, frames, description)),
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
  sound('pebble', 'Quicktime: Kieselvorschau.'),
  sound('beat', 'Quicktime: Takt.'),
  sound('finisher-charge', 'Finisher: Aufladen.'),
  sound('finisher-hit', 'Finisher: Schlusstreffer.'),
  sound('finisher-signal', 'Finisher: Signal.'),
  sound('finisher-dawn', 'Finisher: ruhiger Schlusston, Sonnenaufgang Level 40.'),
  sound(
    'event-swarm',
    'Ankuendigung Schwarm: drei hohe Piepser (nur zusaetzlich zum Rand-Marker).',
  ),
  sound(
    'event-ring',
    'Ankuendigung Ring: tiefes an- und abschwellendes Brummen (nur zusaetzlich zum Rand-Marker).',
  ),
  sound(
    'event-pincer',
    'Ankuendigung Zange: zwei Piepser, der zweite tiefer (nur zusaetzlich zum Rand-Marker).',
  ),
];

/** Festes Asset-Manifest. Designer ersetzen nur die Dateien unter public/assets. */
export const ASSETS: readonly AssetDef[] = OWN_ASSETS;

/** Animations-Key fuer ein Spritesheet (von PreloadScene angelegt, wenn frames > 1). */
export const animKey = (key: string): string => `${key}-anim`;
