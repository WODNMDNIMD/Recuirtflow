import { z } from 'zod'

export const recruitflowRecommendationLevelSchema = z.enum([
  '建议推进',
  '人工复核',
  '暂不推进',
])

export const recruitflowEmploymentStatusSchema = z.enum([
  '在职',
  '已离职',
  '离职交接中',
  '状态未知',
])

export const recruitflowResumeRecommendationSchema = z.object({
  candidate: z.object({
    name: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    city: z.string().nullable(),
    highestEducation: z.string().nullable(),
    school: z.string().nullable(),
    major: z.string().nullable(),
    experienceYears: z.number().nullable(),
    lastCompany: z.string().nullable(),
    lastPosition: z.string().nullable(),
    skills: z.array(z.string()).default([]),
    employmentStatus: recruitflowEmploymentStatusSchema.default('状态未知'),
    expectedSalary: z.string().nullable(),
    availability: z.string().nullable(),
  }),
  match: z.object({
    score: z.number().min(0).max(100),
    matchedPoints: z.array(z.string()).default([]),
    riskPoints: z.array(z.string()).default([]),
    missingPoints: z.array(z.string()).default([]),
    recommendationLevel: recruitflowRecommendationLevelSchema,
    recommendationReason: z.string(),
  }),
  recommendationText: z.string(),
  confidence: z.number().min(0).max(1),
  needsConfirmation: z.boolean(),
})

export const recruitflowFeedbackIntentSchema = z.enum([
  'schedule_interview',
  'reject',
  'advance_next_round',
  'offer',
  'hired',
  'hold',
  'unknown',
])

export const recruitflowFeedbackParseSchema = z.object({
  candidateName: z.string().nullable(),
  jobTitle: z.string().nullable(),
  currentRound: z.string().nullable(),
  intent: recruitflowFeedbackIntentSchema,
  nextStatus: z.enum(['new', 'screening', 'interview', 'offer', 'hired', 'rejected']).nullable(),
  suggestedTime: z.string().nullable(),
  reason: z.string().nullable(),
  replyDraft: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  needsConfirmation: z.boolean(),
})

export type RecruitflowResumeRecommendation = z.infer<typeof recruitflowResumeRecommendationSchema>
export type RecruitflowFeedbackParse = z.infer<typeof recruitflowFeedbackParseSchema>

export const recruitmentEventTypeSchema = z.enum([
  'resume_parsed',
  'recommendation_generated',
  'hr_confirmed',
  'candidate_created',
  'application_created',
  'feedback_parsed',
  'status_changed',
  'integration_synced',
  'integration_failed',
])

export const recruitmentEventStatusSchema = z.enum([
  'pending',
  'confirmed',
  'failed',
  'ignored',
])

export const recruitmentEventSourceSchema = z.enum([
  'ai',
  'manual',
  'system',
  'wecom',
  'tencent_docs',
])

export const integrationProviderSchema = z.enum([
  'ai_provider',
  'wecom',
  'tencent_docs',
  'system',
])

export const integrationLogStatusSchema = z.enum([
  'pending',
  'success',
  'failed',
])

const jsonObjectSchema = z.record(z.string(), z.unknown())
const optionalIdSchema = z.string().min(1).optional()

export const createRecruitmentEventSchema = z.object({
  organizationId: z.string().min(1),
  type: recruitmentEventTypeSchema,
  status: recruitmentEventStatusSchema.optional().default('pending'),
  source: recruitmentEventSourceSchema.optional().default('system'),
  title: z.string().min(1).max(300).optional(),
  candidateId: optionalIdSchema,
  jobId: optionalIdSchema,
  applicationId: optionalIdSchema,
  actorId: optionalIdSchema,
  payload: jsonObjectSchema.optional().default({}),
})

export const markRecruitmentEventConfirmedSchema = z.object({
  organizationId: z.string().min(1),
  eventId: z.string().min(1),
  confirmedById: z.string().min(1),
  payloadPatch: jsonObjectSchema.optional(),
})

export const createIntegrationLogSchema = z.object({
  organizationId: z.string().min(1),
  provider: integrationProviderSchema,
  operation: z.string().min(1).max(200),
  status: integrationLogStatusSchema.optional().default('pending'),
  eventId: optionalIdSchema,
  externalId: optionalIdSchema,
  requestPayload: jsonObjectSchema.optional(),
  responsePayload: jsonObjectSchema.optional(),
  errorMessage: z.string().min(1).max(2000).optional(),
})

export const recruitmentEventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  type: recruitmentEventTypeSchema.optional(),
  status: recruitmentEventStatusSchema.optional(),
  candidateId: optionalIdSchema,
  jobId: optionalIdSchema,
  applicationId: optionalIdSchema,
})

export type RecruitmentEventType = z.infer<typeof recruitmentEventTypeSchema>
export type RecruitmentEventStatus = z.infer<typeof recruitmentEventStatusSchema>
export type RecruitmentEventSource = z.infer<typeof recruitmentEventSourceSchema>
export type IntegrationProvider = z.infer<typeof integrationProviderSchema>
export type IntegrationLogStatus = z.infer<typeof integrationLogStatusSchema>
export type CreateRecruitmentEventInput = z.input<typeof createRecruitmentEventSchema>
export type MarkRecruitmentEventConfirmedInput = z.input<typeof markRecruitmentEventConfirmedSchema>
export type CreateIntegrationLogInput = z.input<typeof createIntegrationLogSchema>

