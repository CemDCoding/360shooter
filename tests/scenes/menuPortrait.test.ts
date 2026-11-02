import { describe, expect, it } from 'vitest';
import menuSource from '../../src/scenes/MenuScene.ts?raw';

describe('menu portrait button', () => {
  it('has no sticker leftovers', () => {
    expect(menuSource).not.toContain('Ändern');
    expect(menuSource).not.toContain('sticker');
    expect(menuSource).not.toContain('ui-icons-m8');
  });
  it('is one tap zone over the whole portrait that opens the gear panel', () => {
    const start = menuSource.indexOf('private makePortraitButton');
    const body = menuSource.slice(start, menuSource.indexOf('private applyCardFocus'));
    expect(body.match(/\.zone\(/g)).toHaveLength(1);
    expect(body).toContain('64, 64');
    expect(body).toContain('this.openGear()');
    expect(body).toContain('portraitRing');
  });
  it('fits the pet into the 64x64 frame', () => {
    expect(menuSource).toContain('fit: { w: 64, h: 64 }');
  });
});
