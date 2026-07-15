import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { application, candidate, job } from '../../../database/schema'
import { recruitflowResumeRecommendationSchema } from '../../../utils/recruitflow/schemas'

const candidateOverrideSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email().max(255).transform(value => value.toLowerCase()).optional(),
  phone: z.string().trim().max(50).optional(),
  city: z.string().trim().max(100).optional(),
}).partial()

const bodySchema = z.object({
  jobId: z.string().min(1, 'Job is required'),
  documentId: z.string().min(1).optional(),
  recommendation: recruitflowResumeRecommendationSchema,
  candidate: candidateOverrideSchema.optional(),
  notes: z.string().trim().max(5000).optional(),
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, {
    job: ['read'],
    candidate: ['create', 'update'],
    application: ['create', 'update'],
  })
  const orgId = session.session.activeOrganizationId
  const body = await readValidatedBody(event, bodySchema.parse)

  const jobRecord = await db.query.job.findFirst({
    where: and(eq(job.id, body.jobId), eq(job.organizationId, orgId)),
    columns: { id: true, title: true },
  })

  if (!jobRecord) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }

  const extracted = body.recommendation.candidate
  const displayName = body.candidate?.name || extracted.name || ''
  const email = body.candidate?.email || extracted.email || ''
  const phone = body.candidate?.phone || extracted.phone || null

  if (!email) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Candidate email is required to confirm and de-duplicate intake.',
    })
  }

  if (!displayName) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Candidate name is required to confirm intake.',
    })
  }

  const nameParts = splitCandidateName(displayName)
  const applicationNotes = buildApplicationNotes({
    recommendation: body.recommendation,
    extraNotes: body.notes,
  })

  const result = await db.transaction(async (tx) => {
    let candidateRecord = await tx.query.candidate.findFirst({
      where: and(
        eq(candidate.organizationId, orgId),
        eq(candidate.email, email),
      ),
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        email: true,
        phone: true,
      },
    })
    let candidateCreated = false

    if (!candidateRecord) {
      const [created] = await tx.insert(candidate).values({
        organizationId: orgId,
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        displayName,
        email,
        phone,
        quickNotes: buildCandidateQuickNotes(body.recommendation),
      }).returning({
        id: candidate.id,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        displayName: candidate.displayName,
        email: candidate.email,
        phone: candidate.phone,
      })

      if (!created) {
        throw createError({ statusCode: 500, statusMessage: 'Failed to create candidate' })
      }

      candidateRecord = created
      candidateCreated = true
    }
    else if (!candidateRecord.phone && phone) {
      const [updated] = await tx.update(candidate)
        .set({ phone, updatedAt: new Date() })
        .where(eq(candidate.id, candidateRecord.id))
        .returning({
          id: candidate.id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          displayName: candidate.displayName,
          email: candidate.email,
          phone: candidate.phone,
        })
      if (updated) candidateRecord = updated
    }

    let applicationRecord = await tx.query.application.findFirst({
      where: and(
        eq(application.organizationId, orgId),
        eq(application.candidateId, candidateRecord.id),
        eq(application.jobId, body.jobId),
      ),
      columns: {
        id: true,
        candidateId: true,
        jobId: true,
        status: true,
        score: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    let applicationCreated = false

    if (!applicationRecord) {
      const [created] = await tx.insert(application).values({
        organizationId: orgId,
        candidateId: candidateRecord.id,
        jobId: body.jobId,
        status: 'new',
        score: body.recommendation.match.score,
        notes: applicationNotes,
      }).returning({
        id: application.id,
        candidateId: application.candidateId,
        jobId: application.jobId,
        status: application.status,
        score: application.score,
        notes: application.notes,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
      })

      if (!created) {
        throw createError({ statusCode: 500, statusMessage: 'Failed to create application' })
      }

      applicationRecord = created
      applicationCreated = true
    }
    else {
      const [updated] = await tx.update(application)
        .set({
          score: body.recommendation.match.score,
          notes: mergeApplicationNotes(applicationRecord.notes, applicationNotes),
          updatedAt: new Date(),
        })
        .where(eq(application.id, applicationRecord.id))
        .returning({
          id: application.id,
          candidateId: application.candidateId,
          jobId: application.jobId,
          status: application.status,
          score: application.score,
          notes: application.notes,
          createdAt: application.createdAt,
          updatedAt: application.updatedAt,
        })
      if (updated) applicationRecord = updated
    }

    return {
      candidate: candidateRecord,
      application: applicationRecord,
      created: {
        candidate: candidateCreated,
        application: applicationCreated,
      },
    }
  })

  recordActivity({
    organizationId: orgId,
    actorId: session.user.id,
    action: result.created.application ? 'created' : 'updated',
    resourceType: 'application',
    resourceId: result.application.id,
    metadata: {
      source: 'recruitflow_ai_intake',
      candidateId: result.candidate.id,
      jobId: body.jobId,
      score: body.recommendation.match.score,
      recommendationLevel: body.recommendation.match.recommendationLevel,
    },
  })

  await recordRecruitflowIntakeEvent({
    organizationId: orgId,
    actorId: session.user.id,
    jobId: body.jobId,
    candidateId: result.candidate.id,
    applicationId: result.application.id,
    documentId: body.documentId ?? null,
    recommendationLevel: body.recommendation.match.recommendationLevel,
    score: body.recommendation.match.score,
  })

  setResponseStatus(event, result.created.application ? 201 : 200)
  return result
})

function splitCandidateName(displayName: string): { firstName: string; lastName: string } {
  const normalized = displayName.trim().replace(/\s+/g, ' ')
  const parts = normalized.split(' ')
  if (parts.length >= 2) {
    return {
      firstName: parts.slice(0, -1).join(' '),
      lastName: parts.at(-1)!,
    }
  }

  if (/[\u4E00-\u9FFF]/.test(normalized) && normalized.length >= 2) {
    return {
      firstName: normalized.slice(1),
      lastName: normalized.slice(0, 1),
    }
  }

  return {
    firstName: normalized,
    lastName: 'Candidate',
  }
}

function buildCandidateQuickNotes(recommendation: z.infer<typeof recruitflowResumeRecommendationSchema>): string {
  return [
    `AI 推荐：${recommendation.match.recommendationLevel}，匹配分 ${recommendation.match.score}/100。`,
    recommendation.recommendationText,
  ].filter(Boolean).join('\n')
}

function buildApplicationNotes(params: {
  recommendation: z.infer<typeof recruitflowResumeRecommendationSchema>
  extraNotes?: string
}): string {
  const { recommendation, extraNotes } = params
  const lines = [
    '[RecruitFlow AI Intake]',
    `推荐结论：${recommendation.match.recommendationLevel}`,
    `匹配分：${recommendation.match.score}/100`,
    `推荐语：${recommendation.recommendationText}`,
    recommendation.match.matchedPoints.length ? `匹配点：${recommendation.match.matchedPoints.join('；')}` : null,
    recommendation.match.riskPoints.length ? `风险点：${recommendation.match.riskPoints.join('；')}` : null,
    recommendation.match.missingPoints.length ? `待确认：${recommendation.match.missingPoints.join('；')}` : null,
    `置信度：${Math.round(recommendation.confidence * 100)}%`,
    extraNotes ? `HR 备注：${extraNotes}` : null,
  ]

  return lines.filter(Boolean).join('\n')
}

function mergeApplicationNotes(existing: string | null, incoming: string): string {
  if (!existing?.trim()) return incoming
  return `${existing.trim()}\n\n${incoming}`
}

async function recordRecruitflowIntakeEvent(payload: {
  organizationId: string
  actorId: string
  jobId: string
  candidateId: string
  applicationId: string
  documentId: string | null
  recommendationLevel: string
  score: number
}) {
  // TODO(module/01-data-events): Replace this no-op with an insert into
  // recruitment_event once the shared event table lands.
  logInfo('recruitflow.intake.confirmed', {
    org_id: payload.organizationId,
    actor_id: payload.actorId,
    job_id: payload.jobId,
    candidate_id: payload.candidateId,
    application_id: payload.applicationId,
    document_id: payload.documentId,
    recommendation_level: payload.recommendationLevel,
    score: payload.score,
  })
}
