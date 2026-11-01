import { describe, expect, it } from 'vitest';
import game from '../../src/scenes/GameScene.ts?raw';
import hud from '../../src/scenes/HudScene.ts?raw';

// GameScene and HudScene cannot be imported in vitest, so the wiring is checked on the source text.

function body(src: string, name: string): string {
  const start = src.indexOf(`private ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const next = src.indexOf('\n  private ', start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

describe('round abort from the pause menu (AP-131, PE-159)', () => {
  it('abortRound neither settles nor saves nor shows a result', () => {
    const b = body(game, 'abortRound');
    expect(b).not.toContain('settleRound');
    expect(b).not.toContain('writeSave');
    expect(b).not.toContain('loadSave');
    expect(b).not.toContain('ResultScene');
    expect(b).not.toContain('sfx');
    expect(b).not.toContain('RoundEnded');
    expect(b).toContain("this.scene.start('MenuScene')");
    expect(b).toContain('if (this.ended) return');
  });

  it('listens to the abort event once and removes the listener in cleanup', () => {
    expect(game).toContain('hud.events.off(GameEvents.RoundAbortRequested');
    expect(game).toContain('hud.events.on(GameEvents.RoundAbortRequested');
    expect(body(game, 'cleanup')).toContain('RoundAbortRequested');
  });

  it('only the confirmed dialog sends the abort event', () => {
    const b = body(hud, 'askAbort');
    expect(hud.match(/RoundAbortRequested/g)?.length).toBe(1);
    expect(b).toContain("confirmLabel: 'RUNDE BEENDEN'");
    expect(b).toContain("cancelLabel: 'WEITERSPIELEN'");
  });

  it('ESC and P are ignored while the dialog is open', () => {
    expect(body(hud, 'onPauseKey')).toContain('this.abortDialog');
    expect(hud).toContain("keyboard?.on('keydown-ESC', this.onPauseKey");
  });
});
