import type { CaseStatus, HistoricalCase } from "@/data/cases";

export type SimulationPhase = "MONITORING" | "INTERVENTION" | "OUTCOME";

export type SimulationState = {
  revealedCount: number;
  phase: SimulationPhase;
  interventionAt: string | null;
};

export function startSimulation(): SimulationState {
  return { revealedCount: 1, phase: "MONITORING", interventionAt: null };
}

export function statusForConfidence(confidence: number, threshold: number): CaseStatus {
  return confidence >= threshold ? "PENDING_INTERVENTION" : "MONITORED";
}

export function snapshotFor(caseData: HistoricalCase, revealedCount: number) {
  const signal = caseData.signals[Math.max(0, revealedCount - 1)];
  if (!signal) throw new Error(`No signal exists at position ${revealedCount}.`);
  const confidence = signal.confidenceAfter;
  const thresholdCrossed = confidence >= caseData.threshold;
  const status: CaseStatus = thresholdCrossed
    ? (signal.statusChange ?? statusForConfidence(confidence, caseData.threshold))
    : "MONITORED";

  return {
    signal,
    confidence,
    thresholdCrossed,
    status,
    canContinue: revealedCount < caseData.signals.length,
  };
}

export function continueMonitoring(caseData: HistoricalCase, state: SimulationState): SimulationState {
  if (state.phase !== "MONITORING" || state.revealedCount >= caseData.signals.length) return state;
  return { ...state, revealedCount: state.revealedCount + 1 };
}

export function interveneNow(caseData: HistoricalCase, state: SimulationState): SimulationState {
  const { thresholdCrossed, signal } = snapshotFor(caseData, state.revealedCount);
  if (state.phase !== "MONITORING" || !thresholdCrossed) return state;
  return { ...state, phase: "INTERVENTION", interventionAt: signal.id };
}

export function showOutcome(state: SimulationState): SimulationState {
  return state.phase === "INTERVENTION" ? { ...state, phase: "OUTCOME" } : state;
}

/**
 * Derives an effective case with a visitor-chosen threshold, without
 * mutating the canonical curated case. The confidence sequence itself is
 * never recalculated — only which existing signal first meets the policy
 * changes.
 */
export function withThreshold(caseData: HistoricalCase, threshold: number): HistoricalCase {
  return { ...caseData, threshold };
}
