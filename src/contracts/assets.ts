export type AssetKind = 'spritesheet' | 'image' | 'audio';

export interface AssetDef {
  key: string;
  kind: AssetKind;
  path: string;
  frameWidth?: number;
  frameHeight?: number;
  frames?: number;
  /** Beschreibung fuer Designer */
  description: string;
}
