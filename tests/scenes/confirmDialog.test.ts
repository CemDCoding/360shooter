import { describe, expect, it } from 'vitest';
import { pickConfirmLabels } from '../../src/scenes/menu/confirmLabels';

describe('pickConfirmLabels (ConfirmDialog button texts)', () => {
  it('keeps the old reset texts without labels', () => {
    expect(pickConfirmLabels()).toEqual({ confirm: 'Ja, löschen', cancel: 'Abbrechen' });
    expect(pickConfirmLabels({})).toEqual({ confirm: 'Ja, löschen', cancel: 'Abbrechen' });
  });

  it('uses the given texts', () => {
    expect(
      pickConfirmLabels({ confirmLabel: 'RUNDE BEENDEN', cancelLabel: 'WEITERSPIELEN' }),
    ).toEqual({ confirm: 'RUNDE BEENDEN', cancel: 'WEITERSPIELEN' });
  });

  it('replaces only the given text and ignores blank values', () => {
    expect(pickConfirmLabels({ confirmLabel: 'OK' })).toEqual({
      confirm: 'OK',
      cancel: 'Abbrechen',
    });
    expect(pickConfirmLabels({ cancelLabel: '   ' })).toEqual({
      confirm: 'Ja, löschen',
      cancel: 'Abbrechen',
    });
  });
});
