import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { document, job } from '../../../database/schema'
import { parseAndPersistDocument } from '../../../utils/document-parser'
import { extractResumeText } from '../../../utils/resume-parser'
import { generateRecruitflowResumeRecommendation } from '../../../utils/recruitflow/recommendation'

const bodySchema = z.object({
  jobId: z.string().min(1, 'Job is required'),
  resumeText: z.string().trim().min(20, 'Resume text is too short').max(60_000).optional(),
  documentId: z.string().min(1).optional(),
}).refine(body => body.resumeText || body.documentId, {
  message: 'Either resumeText or documentId is required',
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, {
    job: ['read'],
    application: ['create'],
    candidate: ['create'],
  })
  const orgId = session.session.activeOrganizationId
  const body = await readValidatedBody(event, bodySchema.parse)

  const jobRecord = await db.query.job.findFirst({
    where: and(eq(job.id, body.jobId), eq(job.organizationId, orgId)),
    columns: {
      id: true,
      title: true,
      description: true,
      status: true,
    },
  })

  if (!jobRecord) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }

  const resumeText = body.resumeText || await loadResumeTextFromDocument(body.documentId!, orgId)

  if (!resumeText) {
    throw createError({
      statusCode: 422,
      statusMessage: 'No usable resume text found. Paste text directly or parse the document first.',
    })
  }

  const result = await generateRecruitflowResumeRecommendation({
    orgId,
    userId: session.user.id,
    jobTitle: jobRecord.title,
    jobDescription: jobRecord.description,
    resumeText,
  })

  return {
    job: {
      id: jobRecord.id,
      title: jobRecord.title,
      status: jobRecord.status,
    },
    source: {
      type: body.resumeText ? 'text' : 'document',
      documentId: body.documentId ?? null,
      characterCount: resumeText.length,
    },
    mode: result.mode,
    provider: result.provider,
    model: result.model,
    billingMode: result.billingMode,
    usage: result.usage,
    result: result.recommendation,
  }
})

async function loadResumeTextFromDocument(documentId: string, orgId: string): Promise<string | null> {
  const doc = await db.query.document.findFirst({
    where: and(
      eq(document.id, documentId),
      eq(document.organizationId, orgId),
    ),
    columns: {
      id: true,
      storageKey: true,
      mimeType: true,
      parsedContent: true,
    },
  })

  if (!doc) {
    throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  }

  const existingText = extractResumeText(doc.parsedContent)
  if (existingText) return existingText

  const parsedContent = await parseAndPersistDocument(doc)
  return extractResumeText(parsedContent)
}
