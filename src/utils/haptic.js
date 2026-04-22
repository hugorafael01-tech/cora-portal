/**
 * Haptic feedback sutil (mobile). Silencioso em desktop/iOS Safari antigo.
 * Respeita prefers-reduced-motion.
 *
 * @param {number} ms - duração da vibração em ms (default 10)
 */
export function haptic(ms = 10) {
  try {
    if (typeof window === "undefined" || !window.navigator?.vibrate) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    window.navigator.vibrate(ms);
  } catch (e) {
    /* noop */
  }
}
