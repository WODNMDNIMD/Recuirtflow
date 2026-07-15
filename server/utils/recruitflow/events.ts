import { and, desc, eq } from 'drizzle-orm'
import { createError } from 'h3'
import { integrationLog, recruitmentEvent } from '../../database/schema'
import { db } from '../db'
import {
  createIntegrationLogSchema,
  createRecruitmentEventSchema,
  markRecruitmentEventConfirmedSchema,
  type CreateIntegrationLogInput,
  type CreateRecruitmentEventInput,
  type MarkRecruitmentEventConfirmedInput,
} from './schemas'

export async function createRecruitmentEvent(input: CreateRecruitmentEventInput) {
  const data = createRecruitmentEventSchema.parse(input)

  const [row] = await db
    .insert(recruitmentEvent)
    .values({
      organizationId: data.organizationId,
      type: data.type,
      status: data.status,
      source: data.source,
      title: data.title,
      candidateId: data.candidateId,
      jobId: data.jobId,
      applicationId: data.applicationId,
      actorId: data.actorId,
      payload: data.payload,
    })
    .returning()

  return row
}

export async function markRecruitmentEventConfirmed(input: MarkRecruitmentEventConfirmedInput) {
  const data = markRecruitmentEventConfirmedSchema.parse(input)

  const [existing] = await db
    .select({
      id: recruitmentEvent.id,
      payload: recruitmentEvent.payload,
    })
    .from(recruitmentEvent)
    .where(and(
      eq(recruitmentEvent.id, data.eventId),
      eq(recruitmentEvent.organizationId, data.organizationId),
    ))
    .limit(1)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Recruitment event not found' })
  }

  const payload = data.payloadPatch
    ? { ...(existing.payload ?? {}), ...data.payloadPatch }
    : existing.payload

  const [row] = await db
    .update(recruitmentEvent)
    .set({
      status: 'confirmed',
      confirmedAt: new Date(),
      confirmedById: data.confirmedById,
      payload,
      updatedAt: new Date(),
    })
    .where(and(
      eq(recruitmentEvent.id, data.eventId),
      eq(recruitmentEvent.organizationId, data.organizationId),
    ))
    .returning()

  return row
}

export async function createIntegrationLog(input: CreateIntegrationLogInput) {
  const data = createIntegrationLogSchema.parse(input)

  const [row] = await db
    .insert(integrationLog)
    .values({
      organizationId: data.organizationId,
      provider: data.provider,
      operation: data.operation,
      status: data.status,
      eventId: data.eventId,
      externalId: data.externalId,
      requestPayload: data.requestPayload,
      responsePayload: data.responsePayload,
      errorMessage: data.errorMessage,
    })
    .returning()

  return row
}

export async function listRecentRecruitmentEvents(organizationId: string, limit = 50) {
  return db
    .select()
    .from(recruitmentEvent)
    .where(eq(recruitmentEvent.organizationId, organizationId))
    .orderBy(desc(recruitmentEvent.createdAt))
    .limit(limit)
}
