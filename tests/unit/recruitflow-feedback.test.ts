import { describe, expect, it } from 'vitest'
import {
  getNextStatusForFeedbackIntent,
  inferFeedbackIntent,
  parseRecruitflowFeedbackMock,
  validateRecruitflowStatusTransition,
} from '../../server/utils/recruitflow/feedback'

describe('recruitflow feedback workflow', () => {
  it('maps interviewer intent to the expected application status', () => {
    expect(getNextStatusForFeedbackIntent('schedule_interview')).toBe('interview')
    expect(getNextStatusForFeedbackIntent('advance_next_round')).toBe('interview')
    expect(getNextStatusForFeedbackIntent('reject')).toBe('rejected')
    expect(getNextStatusForFeedbackIntent('offer')).toBe('offer')
    expect(getNextStatusForFeedbackIntent('hired')).toBe('hired')
    expect(getNextStatusForFeedbackIntent('hold')).toBeNull()
    expect(getNextStatusForFeedbackIntent('unknown')).toBeNull()
  })

  it('detects an advance-next-round feedback and maps it to interview', () => {
    const parsed = parseRecruitflowFeedbackMock(
      '候选人：张三\n岗位：前端工程师\n技术面反馈不错，建议进入下一轮复试。',
      { minConfidence: 0.8 },
    )

    expect(parsed.candidateName).toBe('张三')
    expect(parsed.jobTitle).toBe('前端工程师')
    expect(parsed.intent).toBe('advance_next_round')
    expect(parsed.nextStatus).toBe('interview')
    expect(parsed.needsConfirmation).toBe(false)
  })

  it('detects rejection feedback', () => {
    const detected = inferFeedbackIntent('候选人沟通一般，经验不匹配，建议不通过。')

    expect(detected.intent).toBe('reject')
    expect(getNextStatusForFeedbackIntent(detected.intent)).toBe('rejected')
  })

  it('blocks illegal application status transitions', () => {
    const transition = validateRecruitflowStatusTransition('hired', 'offer')

    expect(transition.valid).toBe(false)
    expect(transition.allowed).toEqual([])
  })

  it('allows legal application status transitions', () => {
    const transition = validateRecruitflowStatusTransition('interview', 'offer')

    expect(transition.valid).toBe(true)
    expect(transition.unchanged).toBe(false)
  })
})
