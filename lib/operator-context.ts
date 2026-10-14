const KEY = "omniwatch-operator-context";

/**
 * Carries only the minimum needed to make the dossier and the historical
 * experiment feel like one system. Deliberately excludes raw signals (user
 * agent, etc.) — only counts and the visitor's own choices survive.
 */
export type OperatorContext = {
  dossierId: string;
  observedSignalCount: number;
  selectedBehaviourLabel: string;
  trained: boolean;
  classificationIndex: number;
  interventionThreshold?: number;
};

export function readOperatorContext(): OperatorContext | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OperatorContext) : null;
  } catch {
    return null;
  }
}

export function writeOperatorContext(context: OperatorContext): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(context));
  } catch {
    // sessionStorage unavailable (private mode, quota) — continuity indicator just won't show.
  }
}
