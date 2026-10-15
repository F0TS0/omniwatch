import { z } from "zod";

export const observedSignalCategories = [
  "timezone",
  "language",
  "browser_environment",
  "screen_context",
  "device_capability",
  "network_type",
] as const;

const relevanceSchema = z.enum(["NONE", "WEAK", "MODERATE", "STRONG"]);

export const customEventRequestSchema = z.object({
  event: z.string().trim().min(2).max(280),
  observedSignalCategories: z.array(z.enum(observedSignalCategories)).length(observedSignalCategories.length),
}).strict().refine(
  ({ observedSignalCategories: categories }) => new Set(categories).size === observedSignalCategories.length,
  "Each observed signal category must be supplied once.",
);

export const eventAssessmentSchema = z.object({
  normalizedEvent: z.string().min(1).max(280),
  interpretation: z.string().min(1).max(600),
  contentAssessment: z.object({
    explicitViolentLanguage: z.boolean(),
    rationale: z.string().min(1).max(300),
  }).strict(),
  signalAssessments: z.array(z.object({
    signalCategory: z.enum(observedSignalCategories),
    relevance: relevanceSchema,
    rationale: z.string().min(1).max(300),
  }).strict()).length(observedSignalCategories.length).superRefine((assessments, context) => {
    const categories = assessments.map((assessment) => assessment.signalCategory);
    if (new Set(categories).size !== observedSignalCategories.length) {
      context.addIssue({ code: "custom", message: "Each signal category must be assessed once." });
    }
  }),
  limitations: z.array(z.string().min(1).max(300)).min(1).max(4),
}).strict();

export type EventAssessment = z.infer<typeof eventAssessmentSchema>;

const materialRelevanceWeights = { NONE: 0, WEAK: 0, MODERATE: 5, STRONG: 9 } as const;

/**
 * The model supplies category relevance. This local, deterministic formula
 * reports only material browser-context relevance; weak associations do not
 * count as evidence and the presence of ordinary signals adds no baseline.
 */
export function customContextRelevance(assessment: EventAssessment) {
  const rawRelevance = assessment.signalAssessments.reduce(
    (total, signal) => total + materialRelevanceWeights[signal.relevance],
    0,
  );
  const possibleMaximum = assessment.signalAssessments.length * materialRelevanceWeights.STRONG;

  return {
    index: possibleMaximum ? Math.round((rawRelevance / possibleMaximum) * 100) : 0,
    relevantSignalCount: assessment.signalAssessments.filter(
      (signal) => signal.relevance === "MODERATE" || signal.relevance === "STRONG",
    ).length,
  };
}

export const eventAssessmentJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["normalizedEvent", "interpretation", "contentAssessment", "signalAssessments", "limitations"],
  properties: {
    normalizedEvent: { type: "string", minLength: 1, maxLength: 280 },
    interpretation: { type: "string", minLength: 1, maxLength: 600 },
    contentAssessment: {
      type: "object",
      additionalProperties: false,
      required: ["explicitViolentLanguage", "rationale"],
      properties: {
        explicitViolentLanguage: { type: "boolean" },
        rationale: { type: "string", minLength: 1, maxLength: 300 },
      },
    },
    signalAssessments: {
      type: "array",
      minItems: observedSignalCategories.length,
      maxItems: observedSignalCategories.length,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["signalCategory", "relevance", "rationale"],
        properties: {
          signalCategory: { type: "string", enum: observedSignalCategories },
          relevance: { type: "string", enum: ["NONE", "WEAK", "MODERATE", "STRONG"] },
          rationale: { type: "string", minLength: 1, maxLength: 300 },
        },
      },
    },
    limitations: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: { type: "string", minLength: 1, maxLength: 300 },
    },
  },
} as const;
