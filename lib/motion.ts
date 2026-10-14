/**
 * Read once at module load, not per render and not reactively. A visitor who
 * flips the OS setting mid-session gets the old value until reload, which is
 * the correct trade: a mid-timeline switch would strand scenes half-played.
 *
 * False during SSR. Anything that branches on this must be client-only, or it
 * will render one way on the server and another after hydration.
 */
export const reducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
