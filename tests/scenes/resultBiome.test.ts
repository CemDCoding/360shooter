import { describe, expect, it } from 'vitest';
import { THEME } from '../../src/config/theme';
import { BATCH_ORDER } from '../../src/scenes/menu/levelGroups';

// ResultScene imports Phaser (needs a browser window), so the BIOME_COLOR table is read from the source.
const fsName = 'node:fs';
const fs = (await import(/* @vite-ignore */ fsName)) as {
  readFileSync(p: URL, enc: string): string;
};
const source = fs.readFileSync(new URL('../../src/scenes/ResultScene.ts', import.meta.url), 'utf8');
const block = /const BIOME_COLOR[^{]*\{([^}]*)\}/.exec(source)?.[1] ?? '';
const table = new Map<string, string>();
for (const m of block.matchAll(/(\w+):\s*'([\w.-]+)'/g)) table.set(m[1] as string, m[2] as string);

describe('ResultScene BIOME_COLOR', () => {
  it('has a theme colour for every batch', () => {
    for (const batch of BATCH_ORDER) {
      const name = table.get(batch);
      expect(name, batch).toBeDefined();
      expect(Object.keys(THEME.colors), batch).toContain(name);
    }
  });

  it('uses the desert tokens for the M5 batches', () => {
    expect(table.get('desert')).toBe('biome.desert');
    expect(table.get('pyramids')).toBe('biome.pyramid');
    expect(table.get('oasis')).toBe('biome.oasis');
  });
});
