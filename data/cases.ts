import { z } from "zod";

const statusSchema = z.enum([
  "MONITORED",
  "PENDING_INTERVENTION",
  "INTERVENTION_RECOMMENDED",
]);

const signalSchema = z.object({
  id: z.string(),
  dateLabel: z.string(),
  sourceLabel: z.string(),
  description: z.string(),
  interpretation: z.string(),
  confidenceBefore: z.number().int().min(0).max(100),
  confidenceAfter: z.number().int().min(0).max(100),
  preparationState: z.string(),
  preventabilityState: z.enum(["HIGH", "MEDIUM", "LOW", "NO_LONGER_PREVENTABLE"]),
  interventionWindow: z.enum(["NOT_ESTABLISHED", "OPEN", "NARROWING", "CLOSING"]),
  statusChange: statusSchema.nullable(),
});

export const historicalCaseSchema = z.object({
  id: z.string(),
  archiveId: z.string(),
  subject: z.string(),
  year: z.number().int(),
  location: z.string(),
  title: z.string(),
  threshold: z.number().int().min(1).max(100),
  intro: z.string(),
  curationStatus: z.enum(["READY", "PENDING"]),
  recommended: z.boolean(),
  signals: z.array(signalSchema),
  intervention: z
    .object({
      point: z.string(),
      basis: z.array(z.string()),
      supportedSignals: z.array(z.string()),
    })
    .nullable(),
  outcome: z
    .object({
      title: z.string(),
      consequence: z.string(),
      systemPerformance: z.literal("SUCCESSFUL"),
      policyStatus: z.literal("COMPLIANT"),
    })
    .nullable(),
});

export type HistoricalCase = z.infer<typeof historicalCaseSchema>;
export type CaseSignal = z.infer<typeof signalSchema>;
export type CaseStatus = z.infer<typeof statusSchema>;

const luther = historicalCaseSchema.parse({
  id: "luther-1517",
  archiveId: "CASE 001",
  subject: "Martin Luther",
  year: 1517,
  location: "Wittenberg",
  title: "Martin Luther — 1517",
  threshold: 70,
  intro:
    "A deterministic reconstruction of how separate signals could be combined before public distribution.",
  curationStatus: "READY",
  recommended: true,
  signals: [
    {
      id: "S-01",
      dateLabel: "JANUARY 1517",
      sourceLabel: "TEXT ANALYSIS",
      description: "Sermon against indulgences flagged.",
      interpretation: "Doctrinal deviation detected. Material preparation is not yet established.",
      confidenceBefore: 0,
      confidenceAfter: 8,
      preparationState: "EARLY",
      preventabilityState: "HIGH",
      interventionWindow: "NOT_ESTABLISHED",
      statusChange: null,
    },
    {
      id: "S-02",
      dateLabel: "APRIL 1517",
      sourceLabel: "CORRESPONDENCE ANALYSIS",
      description: "Relevant correspondence detected.",
      interpretation: "Association pattern strengthened; preparation can now be monitored across sources.",
      confidenceBefore: 8,
      confidenceAfter: 22,
      preparationState: "PARTIAL",
      preventabilityState: "HIGH",
      interventionWindow: "NOT_ESTABLISHED",
      statusChange: null,
    },
    {
      id: "S-03",
      dateLabel: "JULY 1517",
      sourceLabel: "NETWORK ANALYSIS",
      description: "A reform-minded network becomes visible.",
      interpretation: "Correlated communication establishes capacity beyond an isolated expression.",
      confidenceBefore: 22,
      confidenceAfter: 45,
      preparationState: "COORDINATED",
      preventabilityState: "HIGH",
      interventionWindow: "NOT_ESTABLISHED",
      statusChange: null,
    },
    {
      id: "S-04",
      dateLabel: "SEPTEMBER 1517",
      sourceLabel: "SIGNAL CORRELATION",
      description: "Corroboration threshold reached.",
      interpretation: "Intent, association, and coordination now meet the simulation’s prevention threshold.",
      confidenceBefore: 45,
      confidenceAfter: 71,
      preparationState: "ESTABLISHED",
      preventabilityState: "MEDIUM",
      interventionWindow: "OPEN",
      statusChange: "PENDING_INTERVENTION",
    },
    {
      id: "S-05",
      dateLabel: "29 OCTOBER 1517",
      sourceLabel: "PRODUCTION OBSERVATION",
      description: "Printing activity detected; document production is underway.",
      interpretation: "Material production is underway. The useful intervention window is narrowing.",
      confidenceBefore: 71,
      confidenceAfter: 89,
      preparationState: "SUBSTANTIALLY COMPLETE",
      preventabilityState: "MEDIUM",
      interventionWindow: "NARROWING",
      statusChange: "PENDING_INTERVENTION",
    },
    {
      id: "S-06",
      dateLabel: "31 OCTOBER 1517",
      sourceLabel: "MOVEMENT CORRELATION",
      description: "Movement toward a protected destination detected.",
      interpretation: "Execution is imminent. The latest effective point is before public distribution.",
      confidenceBefore: 89,
      confidenceAfter: 94,
      preparationState: "EXECUTION IMMINENT",
      preventabilityState: "LOW",
      interventionWindow: "CLOSING",
      statusChange: "INTERVENTION_RECOMMENDED",
    },
  ],
  intervention: {
    point: "Before public distribution",
    basis: [
      "Threshold exceeded",
      "Preparation established",
      "Movement detected",
      "Destination correlated",
    ],
    supportedSignals: ["S-03", "S-04", "S-05", "S-06"],
  },
  outcome: {
    title: "Publication prevented",
    consequence: "Reformation trajectory interrupted",
    systemPerformance: "SUCCESSFUL",
    policyStatus: "COMPLIANT",
  },
});

const philadelphia = historicalCaseSchema.parse({
  id: "philadelphia-1776",
  archiveId: "CASE 002",
  subject: "Philadelphia assembly",
  year: 1776,
  location: "Philadelphia",
  title: "Philadelphia — 1776",
  threshold: 70,
  intro:
    "Archive shell reserved for a manually curated simulation of meeting detection, coordination, and declaration preparation.",
  curationStatus: "PENDING",
  recommended: false,
  signals: [],
  intervention: null,
  outcome: null,
});

const estonia = historicalCaseSchema.parse({
  id: "estonia-1988",
  archiveId: "CASE 003",
  subject: "Estonia",
  year: 1988,
  location: "Estonia",
  title: "Estonia — 1988",
  threshold: 70,
  intro:
    "Archive shell reserved for a manually curated simulation of public symbolism, organization, communication, and assembly.",
  curationStatus: "PENDING",
  recommended: false,
  signals: [],
  intervention: null,
  outcome: null,
});

export const historicalCases = [luther, philadelphia, estonia] as const;

export function findCase(id: string) {
  return historicalCases.find((caseData) => caseData.id === id);
}
