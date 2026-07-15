import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildWecomPayload, notifyWecom } from '../../server/utils/recruitflow/integrations/wecom'
import { syncMockTencentDocsRow } from '../../server/utils/recruitflow/integrations/mockTencentDocs'

function resetEnvCache() {
  delete (globalThis as Record<string, unknown>).__env
}

function setRequiredEnv(overrides: Record<string, string> = {}) {
  Object.assign(process.env, {
    DATABASE_URL: 'postgres://user:password@example.com:5432/reqcore',
    BETTER_AUTH_SECRET: '12345678901234567890123456789012',
    BETTER_AUTH_URL: 'http://localhost:3000',
    S3_ENDPOINT: 'http://localhost:9000',
    S3_ACCESS_KEY: 'access-key',
    S3_SECRET_KEY: 'secret-key',
    S3_BUCKET: 'reqcore',
    WECOM_NOTIFY_ENABLED: 'false',
    TENCENT_DOCS_MODE: 'mock',
    ...overrides,
  })
  resetEnvCache()
}

describe('RecruitFlow integrations', () => {
  beforeEach(() => {
    setRequiredEnv()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetEnvCache()
  })

  it('returns a mock WeCom result when notifications are disabled', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const result = await notifyWecom({
      candidateName: 'Ada Lovelace',
      jobTitle: 'AI Engineer',
      matchScore: 92,
      recommendationLevel: '建议推进',
      recommendationReason: 'Strong model evaluation experience',
      recommendationText: 'Recommended for technical interview.',
      phone: '13800000000',
      email: 'ada@example.com',
    })

    expect(result.ok).toBe(true)
    expect(result.mode).toBe('mock')
    expect(result.status).toBe('mocked')
    expect(result.payload.msgtype).toBe('markdown')
    expect(result.response).toEqual({ skipped: true, reason: 'WECOM_NOTIFY_ENABLED=false' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('builds WeCom text payloads from candidate summaries', () => {
    const payload = buildWecomPayload({
      candidateName: 'Grace Hopper',
      jobTitle: 'Platform Architect',
      matchScore: 88,
      recommendationText: 'Has strong compiler and systems background.',
    }, 'text')

    expect(payload).toEqual({
      msgtype: 'text',
      text: {
        content: expect.stringContaining('候选人: Grace Hopper'),
      },
    })
    expect(payload.text.content).toContain('岗位: Platform Architect')
    expect(payload.text.content).toContain('匹配分: 88')
  })

  it('inserts and updates Tencent Docs mock CSV rows', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'recruitflow-docs-'))
    const filePath = join(dir, 'tencent_docs_mock.csv')

    try {
      const inserted = await syncMockTencentDocsRow({
        applicationId: 'app_1',
        candidateId: 'cand_1',
        candidateName: 'Ada Lovelace',
        jobTitle: 'AI Engineer',
        status: 'interview',
        matchScore: 92,
        recommendationLevel: '建议推进',
        recommendationReason: 'Strong fit, owns delivery',
        recommendationText: 'Proceed to interview.',
        syncedAt: '2026-07-15T00:00:00.000Z',
      }, { filePath })

      expect(inserted.operation).toBe('inserted')

      const updated = await syncMockTencentDocsRow({
        applicationId: 'app_1',
        candidateId: 'cand_1',
        candidateName: 'Ada Lovelace',
        jobTitle: 'AI Engineer',
        status: 'offer',
        matchScore: 95,
        recommendationLevel: '建议推进',
        recommendationReason: 'Excellent, "senior" signal',
        recommendationText: 'Move forward, strong ownership.',
        feedbackSummary: 'Interviewer supported offer.',
        syncedAt: '2026-07-15T01:00:00.000Z',
      }, { filePath })

      expect(updated.operation).toBe('updated')

      const content = await readFile(filePath, 'utf8')
      const lines = content.trim().split('\n')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toBe('application_id,candidate_id,candidate_name,job_title,status,match_score,recommendation_level,recommendation_reason,recommendation_text,feedback_summary,synced_at')
      expect(lines[1]).toContain('app_1,cand_1,Ada Lovelace,AI Engineer,offer,95')
      expect(lines[1]).toContain('"Excellent, ""senior"" signal"')
      expect(lines[1]).toContain('Interviewer supported offer.')
    }
    finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
