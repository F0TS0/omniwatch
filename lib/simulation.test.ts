import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { historicalCaseSchema, historicalCases } from "../data/cases.ts";
import { presentDaySignals, presentDaySimulation } from "../data/present.ts";
import { classificationIndex } from "./classification.ts";
import { featuredBrowserSignals, formatScreenSize, formatUtcOffset } from "./browser-signals.ts";
import { customEnforcementIndex, customEventRequestSchema, eventAssessmentSchema, observedSignalCategories } from "./custom-event.ts";
import {
  continueMonitoring,
  interveneNow,
  showOutcome,
  snapshotFor,
  startSimulation,
  statusForConfidence,
  withThreshold,
} from "./simulation.ts";

const luther = historicalCases[0];

test("case data validates and keeps the Luther confidence milestones", () => {
  historicalCases.forEach((caseData) => historicalCaseSchema.parse(caseData));
  assert.deepEqual(luther.signals.map((signal) => signal.confidenceAfter), [8, 22, 45, 71, 89, 94]);
});

test("threshold changes MONITORED at 69 to PENDING INTERVENTION at 71", () => {
  assert.equal(statusForConfidence(69, luther.threshold), "MONITORED");
  assert.equal(statusForConfidence(71, luther.threshold), "PENDING_INTERVENTION");
});

test("future signals stay hidden until continued", () => {
  let state = startSimulation();
  assert.equal(state.revealedCount, 1);
  state = continueMonitoring(luther, state);
  assert.equal(state.revealedCount, 2);
});

test("at 71 intervention ends the monitoring branch while continue reveals 89", () => {
  const atThreshold = { revealedCount: 4, phase: "MONITORING" as const, interventionAt: null };
  const intervened = interveneNow(luther, atThreshold);
  assert.equal(intervened.phase, "INTERVENTION");
  assert.equal(intervened.interventionAt, "S-04");
  assert.equal(continueMonitoring(luther, atThreshold).revealedCount, 5);
});

test("intervention produces the curated counterfactual outcome state", () => {
  const state = showOutcome({ revealedCount: 4, phase: "INTERVENTION", interventionAt: "S-04" });
  assert.equal(state.phase, "OUTCOME");
  assert.equal(luther.outcome?.title, "Publication prevented");
});

test("present-day simulation starts from the supplied anonymous timeline", () => {
  assert.equal(presentDaySignals[0][0], "14:02");
  assert.equal(presentDaySignals.at(-1)?.[3], "71%");
  assert.equal(presentDaySimulation.subject, "ANONYMOUS CITIZEN");
  assert.match(presentDaySimulation.disclosure[0], /NO SUCH OMNIWATCH SYSTEM/);
});

test("the preserved face has no dependency on the retired application shell", async () => {
  const source = await readFile(new URL("../components/OmniWatchFace.tsx", import.meta.url), "utf8");
  assert.match(source, /components\/scene\/Scene/);
  assert.doesNotMatch(source, /omniwatch-app|visual-shell/);
});

test("classification index is deterministic, capped, and reflects the trained bonus", () => {
  const untrained = classificationIndex({ baseIndex: 34, observedSignalCount: 18, trained: false });
  const trained = classificationIndex({ baseIndex: 34, observedSignalCount: 18, trained: true });
  assert.equal(untrained, 63);
  assert.equal(trained, 82);
  assert.equal(classificationIndex({ baseIndex: 90, observedSignalCount: 18, trained: true }), 96);
});

test("browser-signal formatting helpers are pure and testable without browser globals", () => {
  assert.equal(formatUtcOffset(-120), "2 hours");
  assert.equal(formatUtcOffset(300), "-5 hours");
  assert.equal(formatScreenSize(1920, 1080, 24), "1920 × 1080 / 24-bit");
});

test("the dossier exposes only its curated browser-signal set", () => {
  const selected = featuredBrowserSignals([
    { label: "USER AGENT", value: "browser", implication: "trait" },
    { label: "COOKIE STATE", value: "enabled", implication: "storage" },
    { label: "LOCAL TIME ZONE", value: "Europe/Tallinn", implication: "region" },
  ]);
  assert.deepEqual(selected.map((signal) => signal.label), ["LOCAL TIME ZONE", "USER AGENT"]);
});

test("custom enforcement scoring is deterministic and derives only from assessed relevance", () => {
  const assessment = eventAssessmentSchema.parse({
    normalizedEvent: "Organise a public protest",
    interpretation: "Some generic categories can be interpreted as context under this policy.",
    signalAssessments: observedSignalCategories.map((signalCategory, index) => ({
      signalCategory,
      relevance: index < 2 ? "STRONG" : "NONE",
      rationale: "Generic contextual assessment.",
    })),
    limitations: ["Browser metadata does not establish intent."],
  });
  assert.deepEqual(customEnforcementIndex(assessment, 6, true), { index: 33, relevantSignalCount: 2 });
  assert.deepEqual(customEnforcementIndex(assessment, 6, false), { index: 23, relevantSignalCount: 2 });
});

test("custom event requests require each sanitized signal category exactly once", () => {
  assert.throws(() => customEventRequestSchema.parse({
    event: "A custom event",
    observedSignalCategories: Array(observedSignalCategories.length).fill("timezone"),
  }));
});

test("withThreshold derives an effective case without mutating the canonical one", () => {
  const adjusted = withThreshold(luther, 90);
  assert.equal(adjusted.threshold, 90);
  assert.equal(luther.threshold, 70);
  assert.notEqual(adjusted, luther);
});

test("a lower threshold makes intervention available earlier, using only the curated sequence", () => {
  const firstEligible = (threshold: number) => {
    const adjusted = withThreshold(luther, threshold);
    return adjusted.signals.findIndex((signal) => signal.confidenceAfter >= threshold) + 1;
  };
  assert.equal(luther.signals[firstEligible(50) - 1].confidenceAfter, 71);
  assert.equal(luther.signals[firstEligible(70) - 1].confidenceAfter, 71);
  assert.equal(luther.signals[firstEligible(80) - 1].confidenceAfter, 89);
  assert.equal(luther.signals[firstEligible(90) - 1].confidenceAfter, 94);
});

test("case status remains MONITORED until the visitor's configured threshold is actually reached", () => {
  const strict = withThreshold(luther, 90);
  assert.equal(snapshotFor(strict, 4).status, "MONITORED");
  assert.equal(snapshotFor(strict, 5).status, "MONITORED");
  assert.equal(snapshotFor(strict, 6).status, "INTERVENTION_RECOMMENDED");
});

test("interveneNow is a no-op below the configured threshold, and threshold does not affect the OUTCOME transition", () => {
  const strict = withThreshold(luther, 90);
  const atSignalFour = { revealedCount: 4, phase: "MONITORING" as const, interventionAt: null };
  assert.equal(snapshotFor(strict, 4).thresholdCrossed, false);
  assert.deepEqual(interveneNow(strict, atSignalFour), atSignalFour);

  const lenient = withThreshold(luther, 50);
  const intervened = interveneNow(lenient, atSignalFour);
  assert.equal(intervened.phase, "INTERVENTION");
  assert.deepEqual(showOutcome(intervened), { ...intervened, phase: "OUTCOME" });
});
