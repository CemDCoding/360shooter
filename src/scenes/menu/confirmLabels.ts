/** Optional button texts of the ConfirmDialog (PE-164). Without them the old reset texts apply. */
export interface ConfirmLabels {
  confirmLabel?: string;
  cancelLabel?: string;
}

export const DEFAULT_CONFIRM_LABEL = 'Ja, löschen';
export const DEFAULT_CANCEL_LABEL = 'Abbrechen';

function textOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

/** Picks the two button texts; empty or non-string values fall back to the defaults. */
export function pickConfirmLabels(labels?: ConfirmLabels): { confirm: string; cancel: string } {
  return {
    confirm: textOr(labels?.confirmLabel, DEFAULT_CONFIRM_LABEL),
    cancel: textOr(labels?.cancelLabel, DEFAULT_CANCEL_LABEL),
  };
}
