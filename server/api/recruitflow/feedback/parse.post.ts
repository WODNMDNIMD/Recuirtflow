import { z } from 'zod'
import { parseRecruitflowFeedback, recruitflowFeedbackModeSchema } from '../../../utils/recruitflow/feedback'

const parseFeedbackBodySchema = z.object({
  rawFeedback: z.string().trim().min(1).max(10000),
  mode: recruitflowFeedbackModeSchema.optional(),
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { application: ['read'] })
  const orgId = session.session.activeOrganizationId
  const body = await readValidatedBody(event, parseFeedbackBodySchema.parse)

  const result = await parseRecruitflowFeedback({
    rawFeedback: body.rawFeedback,
    mode: body.mode,
    organizationId: orgId,
  })

  return {
    ...result,
    mode: body.mode ?? env.RECRUITFLOW_AI_MODE,
  }
})
