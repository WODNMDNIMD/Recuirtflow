import { z } from 'zod'
import { notifyWecom } from '~~/server/utils/recruitflow/integrations/wecom'
import { logIntegrationAttempt } from '~~/server/utils/recruitflow/integrations/logIntegrationAttempt'

const bodySchema = z.object({
  candidateId: z.string().min(1).nullable().optional(),
  applicationId: z.string().min(1).nullable().optional(),
  candidateName: z.string().min(1),
  jobTitle: z.string().min(1).nullable().optional(),
  matchScore: z.number().min(0).max(100).nullable().optional(),
  recommendationLevel: z.string().min(1).nullable().optional(),
  recommendationReason: z.string().min(1).nullable().optional(),
  recommendationText: z.string().min(1),
  phone: z.string().min(1).nullable().optional(),
  email: z.string().email().nullable().optional(),
  messageType: z.enum(['markdown', 'text']).optional().default('markdown'),
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { candidate: ['read'], application: ['read'] })
  const orgId = session.session.activeOrganizationId
  const body = await readValidatedBody(event, bodySchema.parse)

  const result = await notifyWecom(body, { messageType: body.messageType })

  await logIntegrationAttempt({
    organizationId: orgId,
    userId: session.user.id,
    provider: 'wecom',
    action: 'notify_candidate_recommendation',
    status: result.status === 'sent' ? 'success' : result.status,
    targetId: body.applicationId ?? body.candidateId ?? null,
    errorMessage: result.error ?? null,
    metadata: {
      mode: result.mode,
      candidateId: body.candidateId ?? null,
      applicationId: body.applicationId ?? null,
      messageType: body.messageType,
    },
  })

  return result
})
