export type AssetKind = 'spritesheet' | 'image' | 'audio' | 'bitmapFont';

export interface AssetDef {
  key: string;
  kind: AssetKind;
  /** Bei bitmapFont: das Atlas-PNG der Schrift */
  path: string;
  /** Nur bitmapFont: BMFont-XML der Schrift (relativ zu public/) */
  xmlPath?: string;
  frameWidth?: number;
  frameHeight?: number;
  frames?: number;
  /** Beschreibung fuer Designer */
  description: string;
}
