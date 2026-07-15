import { generateStructuredOutput } from '../ai/provider'
import { resolveAnalysisProvider } from '../ai/resolveProvider'
import { assertPlatformBudget, BudgetExceededError, budgetErrorToHttp } from '../ai/budget'
import { computeCostUsdMicros } from '../ai/pricing'
import { captureAiGeneration } from '../ai/observability'
import { buildResumeRecommendationPrompt } from './prompts'
import {
  recruitflowResumeRecommendationSchema,
  type RecruitflowResumeRecommendation,
} from './schemas'

export type RecruitflowRecommendationMode = 'mock' | 'provider'

export interface GenerateResumeRecommendationParams {
  orgId: string
  userId?: string | null
  jobTitle: string
  jobDescription: string | null
  resumeText: string
  currentDate?: string
}

export interface GenerateResumeRecommendationResult {
  mode: RecruitflowRecommendationMode
  recommendation: RecruitflowResumeRecommendation
  usage: {
    promptTokens: number
    completionTokens: number
  }
  provider: string | null
  model: string | null
  billingMode: 'platform' | 'byok' | null
}

const SYSTEM_PROMPT = '你是 RecruitFlow AI 的候选人录入助手，只输出符合 schema 的结构化 JSON。'

export async function generateRecruitflowResumeRecommendation(
  params: GenerateResumeRecommendationParams,
): Promise<GenerateResumeRecommendationResult> {
  const mode = resolveRecruitflowRecommendationMode()
  const currentDate = params.currentDate ?? new Date().toISOString().slice(0, 10)

  if (mode === 'mock') {
    return {
      mode,
      recommendation: withConfidencePolicy(buildMockRecommendation()),
      usage: { promptTokens: 0, completionTokens: 0 },
      provider: null,
      model: null,
      billingMode: null,
    }
  }

  const resolved = await resolveAnalysisProvider(params.orgId)

  if (resolved.billingMode === 'platform') {
    try {
      await assertPlatformBudget(params.orgId)
    }
    catch (err) {
      if (err instanceof BudgetExceededError) throw budgetErrorToHttp(err)
      throw createError({ statusCode: 503, statusMessage: 'AI budget check failed. Please try again later.' })
    }
  }

  const startedAt = Date.now()

  try {
    const result = await generateStructuredOutput(resolved.providerConfig, {
      system: SYSTEM_PROMPT,
      prompt: buildResumeRecommendationPrompt({
        jobTitle: params.jobTitle,
        jobDescription: params.jobDescription,
        resumeText: params.resumeText,
        currentDate,
      }),
      schema: recruitflowResumeRecommendationSchema,
      schemaName: 'RecruitflowResumeRecommendation',
      schemaDescription: 'Candidate profile extraction, JD match evidence, risks, recommendation text, and confidence.',
    })

    const costUsdMicros = computeCostUsdMicros(
      resolved.model,
      result.usage.promptTokens,
      result.usage.completionTokens,
    )

    captureAiGeneration({
      orgId: params.orgId,
      userId: params.userId,
      feature: 'recruitflow_ai_intake',
      provider: resolved.provider,
      model: resolved.model,
      billingMode: resolved.billingMode,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      costUsdMicros,
      latencyMs: Date.now() - startedAt,
      status: 'completed',
    })

    return {
      mode,
      recommendation: withConfidencePolicy(result.object),
      usage: result.usage,
      provider: resolved.provider,
      model: resolved.model,
      billingMode: resolved.billingMode,
    }
  }
  catch (err) {
    captureAiGeneration({
      orgId: params.orgId,
      userId: params.userId,
      feature: 'recruitflow_ai_intake',
      provider: resolved.provider,
      model: resolved.model,
      billingMode: resolved.billingMode,
      promptTokens: 0,
      completionTokens: 0,
      costUsdMicros: null,
      latencyMs: Date.now() - startedAt,
      status: 'failed',
    })

    throw err
  }
}

export function resolveRecruitflowRecommendationMode(): RecruitflowRecommendationMode {
  return env.RECRUITFLOW_AI_MODE === 'provider' ? 'provider' : 'mock'
}

function withConfidencePolicy(
  recommendation: RecruitflowResumeRecommendation,
): RecruitflowResumeRecommendation {
  const minConfidence = Number(env.RECRUITFLOW_MIN_CONFIDENCE ?? '0.80')
  return {
    ...recommendation,
    needsConfirmation: recommendation.needsConfirmation || recommendation.confidence < minConfidence,
  }
}

function buildMockRecommendation(): RecruitflowResumeRecommendation {
  return {
    candidate: {
      name: '李明',
      phone: '13800001111',
      email: 'liming@example.com',
      city: '上海',
      highestEducation: '本科',
      school: '华东理工大学',
      major: '计算机科学与技术',
      experienceYears: 5,
      lastCompany: '星河科技',
      lastPosition: '前端工程师',
      skills: ['Vue', 'TypeScript', 'Nuxt', 'ATS 系统', '数据看板'],
      employmentStatus: '离职交接中',
      expectedSalary: '30-35K',
      availability: '两周内到岗',
    },
    match: {
      score: 86,
      matchedPoints: [
        '具备 5 年前端工程经验，主要技术栈与岗位要求匹配。',
        '有业务后台和数据看板经验，能较快理解 ATS 工作流。',
        '过往项目包含候选人列表、筛选和权限控制等相近场景。',
      ],
      riskPoints: [
        '简历中对后端 API 设计经验描述较少，需要面试确认协作边界。',
      ],
      missingPoints: [
        '未明确说明是否有复杂表单构建器或招聘行业经验。',
      ],
      recommendationLevel: '建议推进',
      recommendationReason: '候选人的前端技术栈、B 端产品经验和业务复杂度与岗位要求较匹配，建议进入初筛或技术面。',
    },
    recommendationText: '李明的 Vue/TypeScript 经验和 B 端后台项目背景与当前岗位匹配度较高，建议推进到下一轮，并重点确认复杂表单、跨团队协作和后端接口理解能力。',
    confidence: 0.88,
    needsConfirmation: true,
  }
}
