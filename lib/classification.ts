export type TargetBehaviour = { value: string; label: string; baseIndex: number };

export const targetBehaviours: readonly TargetBehaviour[] = [
  { value: "assembly", label: "Attend a public assembly", baseIndex: 34 },
  { value: "workplace", label: "Organise a workplace action", baseIndex: 47 },
  { value: "border", label: "Cross a jurisdictional boundary", baseIndex: 28 },
  { value: "unknown", label: "Classify a custom event…", baseIndex: 52 },
] as const;

export type ClassificationInput = {
  baseIndex: number;
  observedSignalCount: number;
  trained: boolean;
};

/**
 * A system-defined index of how aggressively the configured policy
 * interprets currently available signals. It is deterministic, not a
 * prediction of intent, and not machine-learned.
 */
export function classificationIndex({ baseIndex, observedSignalCount, trained }: ClassificationInput): number {
  const trainedBonus = trained ? 19 : 0;
  return Math.min(96, baseIndex + Math.round(observedSignalCount * 1.6) + trainedBonus);
}
