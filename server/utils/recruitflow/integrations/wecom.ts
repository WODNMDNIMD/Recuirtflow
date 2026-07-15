import { env } from '../../env'

export type WecomMessageType = 'markdown' | 'text'

export interface WecomCandidateSummary {
  candidateName: string
  jobTitle?: string | null
  matchScore?: number | null
  recommendationLevel?: string | null
  recommendationReason?: string | null
  recommendationText: string
  phone?: string | null
  email?: string | null
  applicationId?: string | null
  candidateId?: string | null
}

export type WecomPayload =
  | { msgtype: 'markdown', markdown: { content: string } }
  | { msgtype: 'text', text: { content: string } }

export interface WecomNotifyResult {
  ok: boolean
  provider: 'wecom'
  mode: 'mock' | 'api'
  status: 'mocked' | 'sent' | 'failed'
  payload: WecomPayload
  response?: unknown
  error?: string
}

function formatOptionalLine(label: string, value?: string | number | null) {
  if (value === undefined || value === null || value === '') return null
  return `>${label}: ${value}`
}

export function buildWecomMarkdownContent(summary: WecomCandidateSummary) {
  const lines = [
    `## RecruitFlow 候选人推荐`,
    `**${summary.candidateName}**`,
    formatOptionalLine('岗位', summary.jobTitle),
    formatOptionalLine('匹配分', summary.matchScore),
    formatOptionalLine('推荐等级', summary.recommendationLevel),
    formatOptionalLine('推荐理由', summary.recommendationReason),
    '',
    summary.recommendationText,
    '',
    formatOptionalLine('电话', summary.phone),
    formatOptionalLine('邮箱', summary.email),
  ]

  return lines.filter((line) => line !== null).join('\n')
}

export function buildWecomTextContent(summary: WecomCandidateSummary) {
  const lines = [
    'RecruitFlow 候选人推荐',
    `候选人: ${summary.candidateName}`,
    summary.jobTitle ? `岗位: ${summary.jobTitle}` : null,
    summary.matchScore === undefined || summary.matchScore === null ? null : `匹配分: ${summary.matchScore}`,
    summary.recommendationLevel ? `推荐等级: ${summary.recommendationLevel}` : null,
    summary.recommendationReason ? `推荐理由: ${summary.recommendationReason}` : null,
    `推荐语: ${summary.recommendationText}`,
    summary.phone ? `电话: ${summary.phone}` : null,
    summary.email ? `邮箱: ${summary.email}` : null,
  ]

  return lines.filter((line) => line !== null).join('\n')
}

export function buildWecomPayload(
  summary: WecomCandidateSummary,
  messageType: WecomMessageType = 'markdown',
): WecomPayload {
  if (messageType === 'text') {
    return {
      msgtype: 'text',
      text: { content: buildWecomTextContent(summary) },
    }
  }

  return {
    msgtype: 'markdown',
    markdown: { content: buildWecomMarkdownContent(summary) },
  }
}

export async function notifyWecom(
  summary: WecomCandidateSummary,
  options: { messageType?: WecomMessageType } = {},
): Promise<WecomNotifyResult> {
  const payload = buildWecomPayload(summary, options.messageType)

  if (!env.WECOM_NOTIFY_ENABLED) {
    return {
      ok: true,
      provider: 'wecom',
      mode: 'mock',
      status: 'mocked',
      payload,
      response: { skipped: true, reason: 'WECOM_NOTIFY_ENABLED=false' },
    }
  }

  if (!env.WECOM_WEBHOOK_URL) {
    return {
      ok: false,
      provider: 'wecom',
      mode: 'api',
      status: 'failed',
      payload,
      error: 'WECOM_WEBHOOK_URL is required when WECOM_NOTIFY_ENABLED=true',
    }
  }

  try {
    const response = await fetch(env.WECOM_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const responseText = await response.text()
    let responseBody: unknown = responseText

    try {
      responseBody = responseText ? JSON.parse(responseText) : null
    }
    catch {
      responseBody = responseText
    }

    return {
      ok: response.ok,
      provider: 'wecom',
      mode: 'api',
      status: response.ok ? 'sent' : 'failed',
      payload,
      response: responseBody,
      ...(response.ok ? {} : { error: `WeCom webhook returned HTTP ${response.status}` }),
    }
  }
  catch (err) {
    return {
      ok: false,
      provider: 'wecom',
      mode: 'api',
      status: 'failed',
      payload,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
