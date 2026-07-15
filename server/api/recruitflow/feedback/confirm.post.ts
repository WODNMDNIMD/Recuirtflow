import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { application, candidate, job } from '../../../database/schema'
import { recruitflowFeedbackParseSchema } from '../../../utils/recruitflow/schemas'
import {
  getNextStatusForFeedbackIntent,
  recruitflowApplicationStatusSchema,
  validateRecruitflowStatusTransition,
} from '../../../utils/recruitflow/feedback'

const confirmFeedbackBodySchema = z.object({
  applicationId: z.string().min(1),
  parseResult: recruitflowFeedbackParseSchema,
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { application: ['update'] })
  const orgId = session.session.activeOrganizationId
  const body = await readValidatedBody(event, confirmFeedbackBodySchema.parse)

  const [current] = await db
    .select({
      id: application.id,
      status: application.status,
      candidateId: application.candidateId,
      jobId: application.jobId,
      candidateFirstName: candidate.firstName,
      candidateLastName: candidate.lastName,
      candidateEmail: candidate.email,
      jobTitle: job.title,
    })
    .from(application)
    .innerJoin(candidate, eq(candidate.id, application.candidateId))
    .innerJoin(job, eq(job.id, application.jobId))
    .where(and(eq(application.id, body.applicationId), eq(application.organizationId, orgId)))
    .limit(1)

  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Application not found' })
  }

  const currentStatus = recruitflowApplicationStatusSchema.parse(current.status)
  const nextStatus = body.parseResult.nextStatus ?? getNextStatusForFeedbackIntent(body.parseResult.intent)

  if (!nextStatus) {
    throw createError({
      statusCode: 422,
      statusMessage: `Feedback intent "${body.parseResult.intent}" does not map to a status update.`,
    })
  }

  const transition = validateRecruitflowStatusTransition(currentStatus, nextStatus)
  if (!transition.valid) {
    throw createError({
      statusCode: 422,
      statusMessage: `Cannot transition from "${currentStatus}" to "${nextStatus}". Allowed: ${transition.allowed.join(', ') || 'none'}`,
    })
  }

  if (!transition.unchanged) {
    const [updated] = await db
      .update(application)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(and(eq(application.id, body.applicationId), eq(application.organizationId, orgId)))
      .returning({
        id: application.id,
        status: application.status,
        updatedAt: application.updatedAt,
      })

    if (!updated) {
      throw createError({ statusCode: 404, statusMessage: 'Application not found' })
    }

    recordActivity({
      organizationId: orgId,
      actorId: session.user.id,
      action: 'status_changed',
      resourceType: 'application',
      resourceId: body.applicationId,
      metadata: {
        source: 'recruitflow_feedback',
        from: currentStatus,
        to: nextStatus,
        intent: body.parseResult.intent,
        confidence: body.parseResult.confidence,
        reason: body.parseResult.reason,
      },
    })

    trackEvent(event, session, 'recruitflow feedback_confirmed', {
      application_id: body.applicationId,
      job_id: current.jobId,
      from_status: currentStatus,
      to_status: nextStatus,
      intent: body.parseResult.intent,
      confidence: body.parseResult.confidence,
    })
  }

  return {
    application: {
      ...current,
      status: nextStatus,
    },
    previousStatus: currentStatus,
    nextStatus,
    statusChanged: !transition.unchanged,
    parseResult: body.parseResult,
  }
})
