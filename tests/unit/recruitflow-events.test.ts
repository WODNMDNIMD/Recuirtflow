import { describe, expect, it } from 'vitest'
import {
  createIntegrationLogSchema,
  createRecruitmentEventSchema,
  markRecruitmentEventConfirmedSchema,
  recruitmentEventStatusSchema,
} from '../../server/utils/recruitflow/schemas'

describe('RecruitFlow event schemas', () => {
  it('accepts a minimal event and applies event defaults', () => {
    const event = createRecruitmentEventSchema.parse({
      organizationId: 'org-1',
      type: 'recommendation_generated',
      payload: {
        candidateName: 'Ada Lovelace',
        score: 92,
      },
    })

    expect(event.status).toBe('pending')
    expect(event.source).toBe('system')
    expect(event.payload).toEqual({
      candidateName: 'Ada Lovelace',
      score: 92,
    })
  })

  it('rejects unknown event types before persistence', () => {
    expect(() =>
      createRecruitmentEventSchema.parse({
        organizationId: 'org-1',
        type: 'unknown_event',
      }),
    ).toThrow()
  })

  it('keeps confirmed as an explicit recruitment event status', () => {
    expect(recruitmentEventStatusSchema.parse('confirmed')).toBe('confirmed')
    expect(() => recruitmentEventStatusSchema.parse('done')).toThrow()
  })

  it('validates confirmation payload patches', () => {
    const input = markRecruitmentEventConfirmedSchema.parse({
      organizationId: 'org-1',
      eventId: 'event-1',
      confirmedById: 'user-1',
      payloadPatch: { confirmed: true },
    })

    expect(input.payloadPatch).toEqual({ confirmed: true })
  })

  it('requires integration log operations and known providers', () => {
    const log = createIntegrationLogSchema.parse({
      organizationId: 'org-1',
      provider: 'ai_provider',
      operation: 'resume.parse',
    })

    expect(log.status).toBe('pending')
    expect(() =>
      createIntegrationLogSchema.parse({
        organizationId: 'org-1',
        provider: 'spreadsheet',
        operation: 'sync',
      }),
    ).toThrow()
  })
})
