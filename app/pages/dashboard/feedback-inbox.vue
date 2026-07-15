<script setup lang="ts">
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardPaste, Inbox, Loader2, RefreshCw, Send, Sparkles } from 'lucide-vue-next'
import { APPLICATION_STATUS_TRANSITIONS } from '~~/shared/status-transitions'
import type { RecruitflowFeedbackMode } from '~~/server/utils/recruitflow/feedback'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

useSeoMeta({
  title: 'Feedback Inbox — Reqcore',
  description: 'Parse interviewer feedback and confirm application status updates',
})

type ApplicationRow = {
  id: string
  status: string
  candidateFirstName: string
  candidateLastName: string
  candidateEmail: string
  jobTitle: string
}

const SAMPLE_FEEDBACK = '候选人：张三\n岗位：前端工程师\n技术面反馈：沟通清楚，Vue 和工程化经验匹配，建议进入下一轮。'

const rawFeedback = ref('')
const selectedMode = ref<RecruitflowFeedbackMode>('mock')
const selectedApplicationId = ref('')

const toast = useToast()
const { parseResult, confirmResult, isParsing, isConfirming, parseFeedback, confirmFeedback, resetFeedback } = useRecruitflowFeedback()
const { handlePreviewReadOnlyError } = usePreviewReadOnly()

const { data: applicationsData, status: applicationsStatus, refresh: refreshApplications } = useFetch<{
  data: ApplicationRow[]
}>('/api/applications', {
  key: 'recruitflow-feedback-applications',
  query: {
    page: 1,
    limit: 100,
    sort: 'updated-desc',
  },
  headers: useRequestHeaders(['cookie']),
})

const applications = computed(() => applicationsData.value?.data ?? [])

const statusLabels: Record<string, string> = {
  new: 'New',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
}

const intentLabels: Record<string, string> = {
  schedule_interview: 'Schedule interview',
  reject: 'Reject',
  advance_next_round: 'Advance next round',
  offer: 'Offer',
  hired: 'Hired',
  hold: 'Hold',
  unknown: 'Unknown',
}

const statusBadgeClasses: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  screening: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  interview: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  offer: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  hired: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  rejected: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300',
}

function normalize(value: string | null | undefined) {
  return (value ?? '').toLowerCase().replace(/\s+/g, '')
}

function candidateName(app: ApplicationRow) {
  return `${app.candidateFirstName} ${app.candidateLastName}`.trim()
}

const matchedApplications = computed(() => {
  if (!parseResult.value) return []

  const parsedName = normalize(parseResult.value.candidateName)
  const parsedJob = normalize(parseResult.value.jobTitle)

  return applications.value
    .map((app) => {
      const appName = normalize(candidateName(app))
      const appJob = normalize(app.jobTitle)
      let score = 0

      if (parsedName && (appName.includes(parsedName) || parsedName.includes(appName))) score += 2
      if (parsedJob && (appJob.includes(parsedJob) || parsedJob.includes(appJob))) score += 2
      if (parsedName && normalize(app.candidateEmail).includes(parsedName)) score += 1

      return { app, score }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.app)
})

const selectedApplication = computed(() =>
  applications.value.find(app => app.id === selectedApplicationId.value) ?? null,
)

const nextStatus = computed(() => parseResult.value?.nextStatus ?? null)

const transitionState = computed(() => {
  if (!selectedApplication.value || !nextStatus.value) {
    return { valid: false, allowed: [] as string[], unchanged: false }
  }

  if (selectedApplication.value.status === nextStatus.value) {
    return { valid: true, allowed: APPLICATION_STATUS_TRANSITIONS[selectedApplication.value.status] ?? [], unchanged: true }
  }

  const allowed = APPLICATION_STATUS_TRANSITIONS[selectedApplication.value.status] ?? []
  return {
    valid: allowed.includes(nextStatus.value),
    allowed,
    unchanged: false,
  }
})

const canConfirm = computed(() =>
  Boolean(parseResult.value && selectedApplication.value && nextStatus.value && transitionState.value.valid),
)

watch(matchedApplications, (matches) => {
  if (matches[0]) selectedApplicationId.value = matches[0].id
})

async function handleParse() {
  const text = rawFeedback.value.trim()
  if (!text) return

  try {
    resetFeedback()
    selectedApplicationId.value = ''
    await parseFeedback(text, selectedMode.value)
  } catch (err: any) {
    toast.error('Failed to parse feedback', {
      message: err.data?.statusMessage ?? err.message,
      statusCode: err.data?.statusCode,
    })
  }
}

async function handleConfirm() {
  if (!parseResult.value || !selectedApplication.value) return

  try {
    await confirmFeedback({
      applicationId: selectedApplication.value.id,
      parseResult: parseResult.value,
    })
    await refreshApplications()
    toast.success(
      'Status updated',
      transitionState.value.unchanged
        ? 'Application already had the suggested status.'
        : `${statusLabels[selectedApplication.value.status]} -> ${statusLabels[nextStatus.value!]}`,
    )
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    toast.error('Failed to confirm feedback', {
      message: err.data?.statusMessage ?? err.message,
      statusCode: err.data?.statusCode,
    })
  }
}

function useSample() {
  rawFeedback.value = SAMPLE_FEEDBACK
}
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-4">
    <div class="flex flex-col gap-3 border-b border-surface-200 pb-4 dark:border-surface-800 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
          <Inbox class="size-4" />
          RecruitFlow
        </div>
        <h1 class="text-2xl font-semibold text-surface-950 dark:text-surface-50">
          Feedback Inbox
        </h1>
      </div>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm font-medium text-surface-700 transition-colors hover:bg-surface-50 dark:border-surface-800 dark:bg-surface-900 dark:text-surface-200 dark:hover:bg-surface-800"
        @click="refreshApplications()"
      >
        <RefreshCw class="size-4" />
        Refresh applications
      </button>
    </div>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
      <section class="rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <label for="raw-feedback" class="inline-flex items-center gap-2 text-sm font-semibold text-surface-800 dark:text-surface-100">
            <ClipboardPaste class="size-4 text-surface-500" />
            Raw feedback
          </label>
          <div class="inline-flex rounded-lg border border-surface-200 bg-surface-50 p-0.5 dark:border-surface-800 dark:bg-surface-950">
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              :class="selectedMode === 'mock' ? 'bg-white text-surface-900 shadow-sm dark:bg-surface-800 dark:text-surface-50' : 'text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-100'"
              @click="selectedMode = 'mock'"
            >
              Mock
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              :class="selectedMode === 'provider' ? 'bg-white text-surface-900 shadow-sm dark:bg-surface-800 dark:text-surface-50' : 'text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-100'"
              @click="selectedMode = 'provider'"
            >
              Provider
            </button>
          </div>
        </div>

        <textarea
          id="raw-feedback"
          v-model="rawFeedback"
          rows="14"
          placeholder="Paste interviewer or HR feedback..."
          class="min-h-[320px] w-full resize-y rounded-lg border border-surface-200 bg-surface-50 px-3 py-3 text-sm leading-6 text-surface-900 outline-none transition-colors placeholder:text-surface-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-surface-800 dark:bg-surface-950 dark:text-surface-100 dark:focus:bg-surface-900"
        />

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            :disabled="isParsing || !rawFeedback.trim()"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            @click="handleParse"
          >
            <Loader2 v-if="isParsing" class="size-4 animate-spin" />
            <Sparkles v-else class="size-4" />
            {{ isParsing ? 'Parsing...' : 'Parse feedback' }}
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-lg border border-surface-200 px-3 py-2 text-sm font-medium text-surface-600 transition-colors hover:bg-surface-50 dark:border-surface-800 dark:text-surface-300 dark:hover:bg-surface-800"
            @click="useSample"
          >
            Use sample
          </button>
        </div>
      </section>

      <section class="rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-surface-800 dark:text-surface-100">
            Confirmation
          </h2>
          <span
            v-if="parseResult"
            class="rounded-full bg-surface-100 px-2 py-1 text-xs font-medium text-surface-600 dark:bg-surface-800 dark:text-surface-300"
          >
            {{ Math.round(parseResult.confidence * 100) }}% confidence
          </span>
        </div>

        <div v-if="!parseResult" class="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-surface-200 text-center text-sm text-surface-400 dark:border-surface-800">
          Parsed feedback will appear here.
        </div>

        <div v-else class="space-y-4">
          <dl class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-xs font-medium uppercase tracking-wide text-surface-400">Candidate</dt>
              <dd class="mt-1 font-semibold text-surface-900 dark:text-surface-100">{{ parseResult.candidateName ?? 'Unknown' }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium uppercase tracking-wide text-surface-400">Job</dt>
              <dd class="mt-1 font-semibold text-surface-900 dark:text-surface-100">{{ parseResult.jobTitle ?? 'Unknown' }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium uppercase tracking-wide text-surface-400">Intent</dt>
              <dd class="mt-1 font-semibold text-surface-900 dark:text-surface-100">{{ intentLabels[parseResult.intent] ?? parseResult.intent }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium uppercase tracking-wide text-surface-400">Round</dt>
              <dd class="mt-1 font-semibold text-surface-900 dark:text-surface-100">{{ parseResult.currentRound ?? '—' }}</dd>
            </div>
          </dl>

          <div>
            <label for="application-match" class="mb-2 block text-xs font-medium uppercase tracking-wide text-surface-400">
              Application match
            </label>
            <select
              id="application-match"
              v-model="selectedApplicationId"
              class="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-surface-800 dark:bg-surface-950 dark:text-surface-100"
            >
              <option value="" disabled>
                {{ applicationsStatus === 'pending' ? 'Loading applications...' : 'Select application' }}
              </option>
              <option
                v-for="app in matchedApplications.length ? matchedApplications : applications"
                :key="app.id"
                :value="app.id"
              >
                {{ candidateName(app) }} - {{ app.jobTitle }} - {{ statusLabels[app.status] ?? app.status }}
              </option>
            </select>
          </div>

          <div class="rounded-lg border border-surface-200 p-3 dark:border-surface-800">
            <div class="mb-3 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-surface-400">
              <span>Status update</span>
              <span v-if="transitionState.unchanged" class="text-surface-500">No change</span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="statusBadgeClasses[selectedApplication?.status ?? ''] ?? 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300'"
              >
                {{ selectedApplication ? statusLabels[selectedApplication.status] ?? selectedApplication.status : 'Current' }}
              </span>
              <ArrowRight class="size-4 text-surface-400" />
              <span
                class="rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="statusBadgeClasses[nextStatus ?? ''] ?? 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300'"
              >
                {{ nextStatus ? statusLabels[nextStatus] ?? nextStatus : 'No mapped status' }}
              </span>
            </div>
            <div
              v-if="selectedApplication && nextStatus && !transitionState.valid"
              class="mt-3 flex gap-2 rounded-md bg-danger-50 px-3 py-2 text-xs text-danger-700 dark:bg-danger-950 dark:text-danger-300"
            >
              <AlertTriangle class="mt-0.5 size-4 shrink-0" />
              <span>Blocked by status rules. Allowed next statuses: {{ transitionState.allowed.join(', ') || 'none' }}.</span>
            </div>
            <div
              v-else-if="parseResult.needsConfirmation"
              class="mt-3 flex gap-2 rounded-md bg-warning-50 px-3 py-2 text-xs text-warning-700 dark:bg-warning-950 dark:text-warning-300"
            >
              <AlertTriangle class="mt-0.5 size-4 shrink-0" />
              <span>Review before confirming because confidence or identity matching is incomplete.</span>
            </div>
          </div>

          <button
            type="button"
            :disabled="!canConfirm || isConfirming"
            class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-surface-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-surface-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface-100 dark:text-surface-950 dark:hover:bg-white"
            @click="handleConfirm"
          >
            <Loader2 v-if="isConfirming" class="size-4 animate-spin" />
            <Send v-else class="size-4" />
            {{ isConfirming ? 'Confirming...' : 'Confirm status update' }}
          </button>

          <div
            v-if="confirmResult"
            class="flex items-center gap-2 rounded-lg bg-success-50 px-3 py-2 text-sm font-medium text-success-700 dark:bg-success-950 dark:text-success-300"
          >
            <CheckCircle2 class="size-4" />
            Confirmed: {{ statusLabels[confirmResult.previousStatus] ?? confirmResult.previousStatus }} -> {{ statusLabels[confirmResult.nextStatus] ?? confirmResult.nextStatus }}
          </div>
        </div>
      </section>
    </div>

    <section
      v-if="parseResult"
      class="grid gap-4 lg:grid-cols-2"
    >
      <div class="rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
        <h2 class="mb-2 text-sm font-semibold text-surface-800 dark:text-surface-100">Reason</h2>
        <p class="text-sm leading-6 text-surface-600 dark:text-surface-300">
          {{ parseResult.reason ?? 'No reason extracted.' }}
        </p>
      </div>
      <div class="rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
        <h2 class="mb-2 text-sm font-semibold text-surface-800 dark:text-surface-100">Reply draft</h2>
        <p class="text-sm leading-6 text-surface-600 dark:text-surface-300">
          {{ parseResult.replyDraft ?? 'No reply draft generated.' }}
        </p>
      </div>
    </section>
  </div>
</template>
