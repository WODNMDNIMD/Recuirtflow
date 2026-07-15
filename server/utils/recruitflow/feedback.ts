import { z } from 'zod'
import { APPLICATION_STATUS_TRANSITIONS } from '~~/shared/status-transitions'
import { env } from '../env'
import { generateStructuredOutput } from '../ai/provider'
import { resolveAnalysisProvider } from '../ai/resolveProvider'
import { recruitflowFeedbackParseSchema, type RecruitflowFeedbackParse } from './schemas'

export const recruitflowFeedbackModeSchema = z.enum(['mock', 'provider'])
export type RecruitflowFeedbackMode = z.infer<typeof recruitflowFeedbackModeSchema>

export const recruitflowApplicationStatusSchema = z.enum([
  'new',
  'screening',
  'interview',
  'offer',
  'hired',
  'rejected',
])

export type RecruitflowApplicationStatus = z.infer<typeof recruitflowApplicationStatusSchema>
export type RecruitflowFeedbackIntent = RecruitflowFeedbackParse['intent']

export const RECRUITFLOW_FEEDBACK_INTENT_TO_STATUS: Record<RecruitflowFeedbackIntent, RecruitflowApplicationStatus | null> = {
  schedule_interview: 'interview',
  reject: 'rejected',
  advance_next_round: 'interview',
  offer: 'offer',
  hired: 'hired',
  hold: null,
  unknown: null,
}

const INTENT_PATTERNS: Array<{
  intent: RecruitflowFeedbackIntent
  patterns: RegExp[]
  confidence: number
  reason: string
}> = [
  {
    intent: 'hired',
    patterns: [/入职|录用|已接受|accept(?:ed)?\s+offer/i],
    confidence: 0.9,
    reason: 'Feedback indicates the candidate accepted or will join.',
  },
  {
    intent: 'offer',
    patterns: [/发\s*offer|offer|薪资方案|录用审批/i],
    confidence: 0.88,
    reason: 'Feedback indicates an offer should be prepared.',
  },
  {
    intent: 'reject',
    patterns: [/不通过|淘汰|拒绝|不合适|暂不考虑|pass\s+on|reject/i],
    confidence: 0.9,
    reason: 'Feedback indicates the candidate should not continue.',
  },
  {
    intent: 'advance_next_round',
    patterns: [/下一轮|复试|终面|推进|继续面|进入下一/i],
    confidence: 0.84,
    reason: 'Feedback indicates the candidate should advance to another interview round.',
  },
  {
    intent: 'schedule_interview',
    patterns: [/安排面试|约面|面试时间|schedule|interview/i],
    confidence: 0.82,
    reason: 'Feedback asks HR to schedule or coordinate an interview.',
  },
  {
    intent: 'hold',
    patterns: [/待定|保留|再看看|hold|pending|暂缓/i],
    confidence: 0.74,
    reason: 'Feedback asks HR to keep the application on hold.',
  },
]

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function extractCandidateName(rawFeedback: string): string | null {
  const patterns = [
    /候选人[:：][ \t]*([A-Za-z\u4e00-\u9fa5][A-Za-z\u4e00-\u9fa5 .-]{0,30})/i,
    /candidate[:：][ \t]*([A-Za-z\u4e00-\u9fa5][A-Za-z\u4e00-\u9fa5 .-]{0,30})/i,
    /关于\s*([A-Za-z\u4e00-\u9fa5]{2,8})\s*(?:的)?(?:面试|反馈|候选人)/,
    /^([A-Za-z\u4e00-\u9fa5]{2,8})\s*(?:面试|反馈|一面|二面|终面)/m,
  ]

  for (const pattern of patterns) {
    const match = rawFeedback.match(pattern)
    if (match?.[1]) return compactWhitespace(match[1]).replace(/[，。；,;].*$/, '')
  }

  return null
}

function extractJobTitle(rawFeedback: string): string | null {
  const patterns = [
    /岗位[:：][ \t]*([A-Za-z0-9\u4e00-\u9fa5][A-Za-z0-9\u4e00-\u9fa5 /().+-]{0,50})/i,
    /职位[:：][ \t]*([A-Za-z0-9\u4e00-\u9fa5][A-Za-z0-9\u4e00-\u9fa5 /().+-]{0,50})/i,
    /job[:：][ \t]*([A-Za-z0-9\u4e00-\u9fa5][A-Za-z0-9\u4e00-\u9fa5 /().+-]{0,50})/i,
    /面试[ \t]*([A-Za-z0-9\u4e00-\u9fa5][A-Za-z0-9\u4e00-\u9fa5 /().+-]{1,30})[ \t]*岗位/,
  ]

  for (const pattern of patterns) {
    const match = rawFeedback.match(pattern)
    if (match?.[1]) return compactWhitespace(match[1]).replace(/[，。；,;].*$/, '')
  }

  return null
}

function extractCurrentRound(rawFeedback: string): string | null {
  const match = rawFeedback.match(/(一面|二面|三面|初面|复试|终面|HR\s*面|技术面|业务面)/i)
  return match?.[1] ? compactWhitespace(match[1]) : null
}

function extractSuggestedTime(rawFeedback: string): string | null {
  const match = rawFeedback.match(/((?:今天|明天|后天|周[一二三四五六日天]|下周[一二三四五六日天]?|[0-9]{1,2}[\/.-][0-9]{1,2})(?:\s*[上下午晚]?\s*[0-9]{1,2}(?::[0-9]{2})?)?)/)
  return match?.[1] ? compactWhitespace(match[1]) : null
}

export function inferFeedbackIntent(rawFeedback: string): {
  intent: RecruitflowFeedbackIntent
  confidence: number
  reason: string | null
} {
  for (const entry of INTENT_PATTERNS) {
    if (entry.patterns.some(pattern => pattern.test(rawFeedback))) {
      return {
        intent: entry.intent,
        confidence: entry.confidence,
        reason: entry.reason,
      }
    }
  }

  return {
    intent: 'unknown',
    confidence: 0.35,
    reason: 'No clear recruiting action was detected.',
  }
}

export function getNextStatusForFeedbackIntent(intent: RecruitflowFeedbackIntent) {
  return RECRUITFLOW_FEEDBACK_INTENT_TO_STATUS[intent]
}

export function validateRecruitflowStatusTransition(
  currentStatus: RecruitflowApplicationStatus,
  nextStatus: RecruitflowApplicationStatus,
) {
  if (currentStatus === nextStatus) {
    return { valid: true, allowed: APPLICATION_STATUS_TRANSITIONS[currentStatus] ?? [], unchanged: true }
  }

  const allowed = APPLICATION_STATUS_TRANSITIONS[currentStatus] ?? []
  return {
    valid: allowed.includes(nextStatus),
    allowed,
    unchanged: false,
  }
}

export function parseRecruitflowFeedbackMock(
  rawFeedback: string,
  options: { minConfidence?: number } = {},
): RecruitflowFeedbackParse {
  const normalized = rawFeedback.trim()
  const detected = inferFeedbackIntent(normalized)
  const nextStatus = getNextStatusForFeedbackIntent(detected.intent)
  const candidateName = extractCandidateName(normalized)
  const jobTitle = extractJobTitle(normalized)
  const suggestedTime = extractSuggestedTime(normalized)
  const currentRound = extractCurrentRound(normalized)

  const confidence = Math.max(
    0.2,
    Math.min(0.98, detected.confidence - (candidateName ? 0 : 0.12) - (jobTitle ? 0 : 0.08)),
  )

  return recruitflowFeedbackParseSchema.parse({
    candidateName,
    jobTitle,
    currentRound,
    intent: detected.intent,
    nextStatus,
    suggestedTime,
    reason: detected.reason,
    replyDraft: buildReplyDraft({
      candidateName,
      jobTitle,
      intent: detected.intent,
      suggestedTime,
    }),
    confidence,
    needsConfirmation: confidence < (options.minConfidence ?? 0.8) || !candidateName || detected.intent === 'unknown',
  })
}

function buildReplyDraft(params: {
  candidateName: string | null
  jobTitle: string | null
  intent: RecruitflowFeedbackIntent
  suggestedTime: string | null
}) {
  const name = params.candidateName ?? '该候选人'
  const job = params.jobTitle ? `「${params.jobTitle}」` : '该岗位'

  switch (params.intent) {
    case 'schedule_interview':
      return `${name}${job}反馈已收到，我会协调${params.suggestedTime ?? '合适'}的面试时间并同步确认。`
    case 'advance_next_round':
      return `${name}${job}反馈已收到，我会推进下一轮安排并更新系统状态。`
    case 'offer':
      return `${name}${job}反馈已收到，我会进入 Offer 准备流程并同步后续进展。`
    case 'hired':
      return `${name}${job}入职反馈已收到，我会标记为已入职并跟进交接信息。`
    case 'reject':
      return `${name}${job}反馈已收到，我会更新为不通过并准备候选人沟通。`
    case 'hold':
      return `${name}${job}反馈已收到，我会先保留当前状态，等待进一步确认。`
    default:
      return `${name}${job}反馈已收到，我会先人工确认后再更新流程。`
  }
}

async function parseRecruitflowFeedbackProvider(params: {
  rawFeedback: string
  organizationId: string
}) {
  const resolved = await resolveAnalysisProvider(params.organizationId)
  const result = await generateStructuredOutput(resolved.providerConfig, {
    system: 'You parse recruiter and interviewer feedback into strict JSON for an ATS. Do not invent facts. Use null for missing fields.',
    prompt: [
      `Current date: ${new Date().toISOString().slice(0, 10)}`,
      '',
      'Extract candidateName, jobTitle, currentRound, intent, nextStatus, suggestedTime, reason, replyDraft, confidence, and needsConfirmation.',
      'Allowed intent values: schedule_interview, reject, advance_next_round, offer, hired, hold, unknown.',
      'Allowed nextStatus values: new, screening, interview, offer, hired, rejected, or null.',
      'Map intent to nextStatus unless the feedback means hold or unknown.',
      '',
      'Feedback:',
      params.rawFeedback,
    ].join('\n'),
    schema: recruitflowFeedbackParseSchema,
    schemaName: 'RecruitflowFeedbackParse',
    schemaDescription: 'Parsed recruiting feedback action for an application workflow',
  })

  const parsed = recruitflowFeedbackParseSchema.parse(result.object)
  return {
    ...parsed,
    nextStatus: parsed.nextStatus ?? getNextStatusForFeedbackIntent(parsed.intent),
  }
}

export async function parseRecruitflowFeedback(params: {
  rawFeedback: string
  mode?: RecruitflowFeedbackMode
  organizationId?: string
}) {
  const mode = params.mode ?? env.RECRUITFLOW_AI_MODE

  if (mode === 'mock') {
    return parseRecruitflowFeedbackMock(params.rawFeedback, {
      minConfidence: Number(env.RECRUITFLOW_MIN_CONFIDENCE),
    })
  }

  if (!params.organizationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'organizationId is required when using provider mode',
    })
  }

  return parseRecruitflowFeedbackProvider({
    rawFeedback: params.rawFeedback,
    organizationId: params.organizationId,
  })
}
