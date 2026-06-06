// AI Style Enhancement is OFF by default. When OFF, the simulation NEVER
// calls the AI gateway — all NPC dialogue is rendered deterministically.
// When ON, the AI may rephrase a deterministic line for variety, but it is
// discarded if it changes length drastically or comes back empty/meta.

const KEY = 'aiStyleEnhancement';

export function isAIStyleEnhancementEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setAIStyleEnhancement(on: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* noop */
  }
}
