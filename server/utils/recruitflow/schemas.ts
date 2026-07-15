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

