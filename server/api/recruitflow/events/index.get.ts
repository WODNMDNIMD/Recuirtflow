import { and, desc, eq } from 'drizzle-orm'
import { recruitmentEvent } from '../../../database/schema'
import { recruitmentEventsQuerySchema } from '../../../utils/recruitflow/schemas'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { activityLog: ['read'] })
  const orgId = session.session.activeOrganizationId
  const query = await getValidatedQuery(event, recruitmentEventsQuerySchema.parse)

  const conditions = [eq(recruitmentEvent.organizationId, orgId)]

  if (query.type) {
    conditions.push(eq(recruitmentEvent.type, query.type))
  }

  if (query.status) {
    conditions.push(eq(recruitmentEvent.status, query.status))
  }

  if (query.candidateId) {
    conditions.push(eq(recruitmentEvent.candidateId, query.candidateId))
  }

  if (query.jobId) {
    conditions.push(eq(recruitmentEvent.jobId, query.jobId))
  }

  if (query.applicationId) {
    conditions.push(eq(recruitmentEvent.applicationId, query.applicationId))
  }

  const items = await db
    .select()
    .from(recruitmentEvent)
    .where(and(...conditions))
    .orderBy(desc(recruitmentEvent.createdAt))
    .limit(query.limit)

  return { items }
})
