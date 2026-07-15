import { z } from 'zod'
import { createTencentDocsAdapter } from '~~/server/utils/recruitflow/integrations/tencentDocs'
import { logIntegrationAttempt } from '~~/server/utils/recruitflow/integrations/logIntegrationAttempt'

const bodySchema = z.object({
  applicationId: z.string().min(1),
  candidateId: z.string().min(1).nullable().optional(),
  candidateName: z.string().min(1),
  jobTitle: z.string().min(1).nullable().optional(),
  status: z.string().min(1).nullable().optional(),
  matchScore: z.number().min(0).max(100).nullable().optional(),
  recommendationLevel: z.string().min(1).nullable().optional(),
  recommendationReason: z.string().min(1).nullable().optional(),
  recommendationText: z.string().min(1).nullable().optional(),
  feedbackSummary: z.string().min(1).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { candidate: ['read'], application: ['read'] })
  const orgId = session.session.activeOrganizationId
  const body = await readValidatedBody(event, bodySchema.parse)
  const adapter = createTencentDocsAdapter()
  const result = await adapter.syncRow(body)

  await logIntegrationAttempt({
    organizationId: orgId,
    userId: session.user.id,
    provider: 'tencent_docs',
    action: 'sync_candidate_row',
    status: result.status,
    targetId: body.applicationId,
    errorMessage: 'error' in result ? result.error : null,
    metadata: {
      mode: result.mode,
      candidateId: body.candidateId ?? null,
      applicationId: body.applicationId,
    },
  })

  return result
})
