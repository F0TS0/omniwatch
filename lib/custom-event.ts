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

const relevanceWeights = { NONE: 0, WEAK: 2, MODERATE: 5, STRONG: 9 } as const;

/**
 * The model supplies only category relevance. This local, deterministic formula
 * turns it into a policy index: relevance (0–55), observation surface (0–20),
 * and a 10-point policy-activation component.
 */
export function customEnforcementIndex(
  assessment: EventAssessment,
  observedSignalCount: number,
  trained: boolean,
) {
  const rawRelevance = assessment.signalAssessments.reduce(
    (total, signal) => total + relevanceWeights[signal.relevance],
    0,
  );
  const possibleMaximum = assessment.signalAssessments.length * relevanceWeights.STRONG;
  const relevanceComponent = possibleMaximum ? (rawRelevance / possibleMaximum) * 55 : 0;
  const observationSurfaceComponent = Math.min(20, observedSignalCount * 0.8);
  const policyActivationComponent = trained ? 10 : 0;

  return {
    index: Math.min(100, Math.round(relevanceComponent + observationSurfaceComponent + policyActivationComponent)),
    relevantSignalCount: assessment.signalAssessments.filter((signal) => signal.relevance !== "NONE").length,
  };
}

export const eventAssessmentJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["normalizedEvent", "interpretation", "signalAssessments", "limitations"],
  properties: {
    normalizedEvent: { type: "string" },
    interpretation: { type: "string" },
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
          rationale: { type: "string" },
        },
      },
    },
    limitations: { type: "array", items: { type: "string" } },
  },
} as const;
