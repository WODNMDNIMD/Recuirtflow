import { and, asc, desc, eq, gte, inArray, lte, sql, count } from 'drizzle-orm'
import { activityLog, application, candidate, job } from '../../database/schema'
import { getRecruitflowStatusLabel } from '../../utils/recruitflow/stateMachine'

const ACTIVE_APPLICATION_STATUSES = ['new', 'screening', 'interview', 'offer'] as const
const TODO_APPLICATION_STATUSES = ['new', 'screening', 'interview'] as const

/**
 * GET /api/recruitflow/metrics
 *
 * RecruitFlow MVP dashboard metrics. This endpoint intentionally reads the
 * stable Reqcore core tables first, so the dashboard can land before the
 * RecruitFlow event/integration tables are merged.
 *
 * Switch point: once `recruitment_event` exists, replace the `recentActivity`
 * query with that table and keep the response shape below.
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { job: ['read'], candidate: ['read'], application: ['read'] })
  const orgId = session.session.activeOrganizationId

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const overdueCutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

  const [
    funnelRows,
    jobRows,
    overdueRows,
    recentActivityRows,
    recentCandidateCount,
    recentApplicationCount,
    recentJobCount,
  ] = await Promise.all([
    db
      .select({
        status: application.status,
        count: count().as('count'),
      })
      .from(application)
      .where(eq(application.organizationId, orgId))
      .groupBy(application.status),

    db
      .select({
        id: job.id,
        title: job.title,
        status: job.status,
        applicationCount: count(application.id).as('application_count'),
        activeCount: sql<number>`count(case when ${application.status} in ('new', 'screening', 'interview', 'offer') then 1 end)`.as('active_count'),
        newCount: sql<number>`count(case when ${application.status} = 'new' then 1 end)`.as('new_count'),
        screeningCount: sql<number>`count(case when ${application.status} = 'screening' then 1 end)`.as('screening_count'),
        interviewCount: sql<number>`count(case when ${application.status} = 'interview' then 1 end)`.as('interview_count'),
        offerCount: sql<number>`count(case when ${application.status} = 'offer' then 1 end)`.as('offer_count'),
      })
      .from(job)
      .leftJoin(application, eq(application.jobId, job.id))
      .where(eq(job.organizationId, orgId))
      .groupBy(job.id)
      .orderBy(sql`count(${application.id}) desc`)
      .limit(6),

    db
      .select({
        id: application.id,
        status: application.status,
        updatedAt: application.updatedAt,
        candidateFirstName: candidate.firstName,
        candidateLastName: candidate.lastName,
        jobTitle: job.title,
      })
      .from(application)
      .innerJoin(candidate, eq(candidate.id, application.candidateId))
      .innerJoin(job, eq(job.id, application.jobId))
      .where(and(
        eq(application.organizationId, orgId),
        inArray(application.status, TODO_APPLICATION_STATUSES),
        lte(application.updatedAt, overdueCutoff),
      ))
      .orderBy(asc(application.updatedAt))
      .limit(8),

    db
      .select({
        id: activityLog.id,
        action: activityLog.action,
        resourceType: activityLog.resourceType,
        resourceId: activityLog.resourceId,
        metadata: activityLog.metadata,
        createdAt: activityLog.createdAt,
      })
      .from(activityLog)
      .where(and(
        eq(activityLog.organizationId, orgId),
        gte(activityLog.createdAt, sevenDaysAgo),
      ))
      .orderBy(desc(activityLog.createdAt))
      .limit(8),

    db.$count(candidate, and(eq(candidate.organizationId, orgId), gte(candidate.createdAt, sevenDaysAgo))),
    db.$count(application, and(eq(application.organizationId, orgId), gte(application.createdAt, sevenDaysAgo))),
    db.$count(job, and(eq(job.organizationId, orgId), gte(job.createdAt, sevenDaysAgo))),
  ])

  const funnel = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'].map((status) => ({
    key: status,
    label: getRecruitflowStatusLabel(status),
    count: funnelRows.find((row) => row.status === status)?.count ?? 0,
  }))

  return {
    mode: 'live_from_reqcore_core_tables',
    switchPoint: 'When recruitment_event is merged, replace recentActivity with event rows and keep this response shape.',
    generatedAt: now.toISOString(),
    funnel,
    jobs: jobRows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      total: row.applicationCount,
      active: row.activeCount,
      stages: {
        new: row.newCount,
        screening: row.screeningCount,
        interview: row.interviewCount,
        offer: row.offerCount,
      },
    })),
    overdue: {
      cutoffDays: 3,
      total: overdueRows.length,
      items: overdueRows.map((row) => ({
        id: row.id,
        candidateName: `${row.candidateFirstName} ${row.candidateLastName}`.trim(),
        jobTitle: row.jobTitle,
        status: row.status,
        statusLabel: getRecruitflowStatusLabel(row.status),
        daysOpen: Math.max(0, Math.floor((now.getTime() - row.updatedAt.getTime()) / 86400000)),
        updatedAt: row.updatedAt,
      })),
    },
    last7Days: {
      candidates: recentCandidateCount,
      applications: recentApplicationCount,
      jobs: recentJobCount,
      activity: recentActivityRows.map((row) => ({
        id: row.id,
        type: row.resourceType,
        title: `${row.resourceType} ${row.action}`.replace(/_/g, ' '),
        resourceId: row.resourceId,
        metadata: row.metadata ?? {},
        createdAt: row.createdAt,
      })),
    },
    activeStatuses: ACTIVE_APPLICATION_STATUSES,
  }
})
