<script setup lang="ts">
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  UserCheck,
} from 'lucide-vue-next'
import type {
  RecruitflowIntakeResult,
  RecruitflowParseResponse,
} from '~/composables/useRecruitflowIntake'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

useSeoMeta({
  title: 'AI Intake — Reqcore',
  robots: 'noindex, nofollow',
})

const localePath = useLocalePath()
const { jobs, fetchStatus: jobsStatus } = useJobs()
const { parseResume, confirmIntake } = useRecruitflowIntake()
const { track } = useTrack()

const selectedJobId = ref('')
const resumeText = ref('')
const hrNotes = ref('')
const parseResponse = ref<RecruitflowParseResponse | null>(null)
const confirmResponse = ref<any>(null)
const isParsing = ref(false)
const isConfirming = ref(false)
const errorMessage = ref<string | null>(null)

const candidateForm = ref({
  name: '',
  email: '',
  phone: '',
  city: '',
})

const sampleResumes = [
  {
    label: '前端工程师',
    text: `李明
手机：13800001111
邮箱：liming@example.com
城市：上海

5 年前端开发经验，熟悉 Vue、TypeScript、Nuxt、Tailwind CSS。最近在星河科技负责招聘运营后台，包含候选人列表、岗位筛选、权限控制、数据看板和简历预览模块。

教育经历：华东理工大学，计算机科学与技术，本科。
期望薪资：30-35K。当前离职交接中，两周内可到岗。`,
  },
  {
    label: '招聘运营',
    text: `周雨
手机：13900002222
邮箱：zhouyu@example.com
城市：杭州

4 年互联网招聘运营经验，熟悉 ATS 流程、JD 梳理、候选人初筛和面试官协同。曾负责技术岗位招聘项目，维护岗位进度表，整理面试反馈并推动状态更新。

教育经历：浙江工商大学，人力资源管理，本科。
当前在职，预计一个月到岗。`,
  },
]

const selectedJob = computed(() => jobs.value.find((job: any) => job.id === selectedJobId.value))
const result = computed(() => parseResponse.value?.result ?? null)
const canParse = computed(() => !!selectedJobId.value && resumeText.value.trim().length >= 20 && !isParsing.value)
const canConfirm = computed(() => !!result.value && !!candidateForm.value.name && !!candidateForm.value.email && !isConfirming.value)

watch(jobs, (value) => {
  const firstJob = value[0]
  if (!selectedJobId.value && firstJob) {
    selectedJobId.value = firstJob.id
  }
}, { immediate: true })

function useSample(sampleText: string) {
  resumeText.value = sampleText
  parseResponse.value = null
  confirmResponse.value = null
  errorMessage.value = null
}

async function handleParse() {
  if (!canParse.value) return
  errorMessage.value = null
  confirmResponse.value = null
  isParsing.value = true

  try {
    const response = await parseResume({
      jobId: selectedJobId.value,
      resumeText: resumeText.value,
    })
    parseResponse.value = response
    syncCandidateForm(response.result)
    track('recruitflow_ai_intake_parsed')
  }
  catch (error: any) {
    errorMessage.value = error.data?.statusMessage ?? error.message ?? '解析失败'
  }
  finally {
    isParsing.value = false
  }
}

async function handleConfirm() {
  if (!parseResponse.value || !canConfirm.value) return
  errorMessage.value = null
  isConfirming.value = true

  try {
    const response = await confirmIntake({
      jobId: parseResponse.value.job.id,
      recommendation: parseResponse.value.result,
      candidate: {
        name: candidateForm.value.name,
        email: candidateForm.value.email,
        phone: candidateForm.value.phone,
        city: candidateForm.value.city,
      },
      notes: hrNotes.value || undefined,
    })
    confirmResponse.value = response
    track('recruitflow_ai_intake_confirmed')
  }
  catch (error: any) {
    errorMessage.value = error.data?.statusMessage ?? error.message ?? '确认失败'
  }
  finally {
    isConfirming.value = false
  }
}

function syncCandidateForm(intakeResult: RecruitflowIntakeResult) {
  candidateForm.value = {
    name: intakeResult.candidate.name ?? '',
    email: intakeResult.candidate.email ?? '',
    phone: intakeResult.candidate.phone ?? '',
    city: intakeResult.candidate.city ?? '',
  }
}

function resetResult() {
  parseResponse.value = null
  confirmResponse.value = null
  errorMessage.value = null
}

function scoreTone(score: number) {
  if (score >= 75) return 'text-success-600 dark:text-success-400'
  if (score >= 45) return 'text-warning-600 dark:text-warning-400'
  return 'text-danger-600 dark:text-danger-400'
}

function levelBadgeClass(level: string) {
  if (level === '建议推进') return 'bg-success-50 text-success-700 ring-success-200 dark:bg-success-950 dark:text-success-300 dark:ring-success-800'
  if (level === '人工复核') return 'bg-warning-50 text-warning-700 ring-warning-200 dark:bg-warning-950 dark:text-warning-300 dark:ring-warning-800'
  return 'bg-danger-50 text-danger-700 ring-danger-200 dark:bg-danger-950 dark:text-danger-300 dark:ring-danger-800'
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
          AI 候选人录入
        </h1>
        <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">
          简历解析、JD 匹配、推荐语预览和 HR 确认。
        </p>
      </div>
      <div
        v-if="parseResponse"
        class="inline-flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs text-surface-500 dark:border-surface-800 dark:bg-surface-900 dark:text-surface-400"
      >
        <Sparkles class="size-4 text-brand-500" />
        <span>{{ parseResponse.mode === 'mock' ? 'Mock 模式' : `${parseResponse.provider} · ${parseResponse.model}` }}</span>
      </div>
    </div>

    <div
      v-if="errorMessage"
      class="mb-5 flex items-center gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-danger-900 dark:bg-danger-950 dark:text-danger-300"
    >
      <AlertCircle class="size-4 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <div
      v-if="confirmResponse"
      class="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-800 dark:border-success-900 dark:bg-success-950 dark:text-success-200"
    >
      <CheckCircle2 class="size-4 shrink-0" />
      <span>
        已{{ confirmResponse.created.application ? '创建' : '更新' }}申请记录：
        {{ confirmResponse.candidate.displayName || `${confirmResponse.candidate.firstName} ${confirmResponse.candidate.lastName}` }}
      </span>
      <NuxtLink
        :to="localePath(`/dashboard/applications/${confirmResponse.application.id}`)"
        class="ml-auto font-medium text-success-700 underline underline-offset-2 dark:text-success-300"
      >
        查看申请
      </NuxtLink>
    </div>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section class="rounded-lg border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
        <div class="border-b border-surface-200 px-5 py-4 dark:border-surface-800">
          <div class="flex items-center gap-3">
            <div class="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
              <ClipboardList class="size-5" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">录入来源</h2>
              <p class="text-xs text-surface-500 dark:text-surface-400">Job + Resume</p>
            </div>
          </div>
        </div>

        <div class="space-y-5 p-5">
          <div>
            <label for="job" class="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
              岗位
            </label>
            <select
              id="job"
              v-model="selectedJobId"
              class="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-950 dark:text-surface-100"
              :disabled="jobsStatus === 'pending'"
              @change="resetResult"
            >
              <option value="" disabled>选择岗位</option>
              <option v-for="job in jobs" :key="job.id" :value="job.id">
                {{ job.title }} · {{ job.status }}
              </option>
            </select>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              v-for="sample in sampleResumes"
              :key="sample.label"
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg border border-surface-300 px-3 py-1.5 text-xs font-medium text-surface-700 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
              @click="useSample(sample.text)"
            >
              <FileText class="size-3.5" />
              {{ sample.label }}
            </button>
          </div>

          <div>
            <label for="resumeText" class="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
              简历文本
            </label>
            <textarea
              id="resumeText"
              v-model="resumeText"
              rows="18"
              class="w-full resize-y rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm leading-6 text-surface-900 placeholder:text-surface-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-950 dark:text-surface-100"
              placeholder="粘贴候选人简历文本"
              @input="resetResult"
            />
            <div class="mt-2 flex items-center justify-between text-xs text-surface-400">
              <span>{{ resumeText.trim().length }} chars</span>
              <span v-if="selectedJob">{{ selectedJob.title }}</span>
            </div>
          </div>

          <button
            type="button"
            :disabled="!canParse"
            class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            @click="handleParse"
          >
            <Loader2 v-if="isParsing" class="size-4 animate-spin" />
            <Sparkles v-else class="size-4" />
            {{ isParsing ? '解析中' : '解析并生成推荐' }}
          </button>
        </div>
      </section>

      <section class="rounded-lg border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
        <div class="border-b border-surface-200 px-5 py-4 dark:border-surface-800">
          <div class="flex items-center gap-3">
            <div class="flex size-9 items-center justify-center rounded-lg bg-success-50 text-success-600 dark:bg-success-950 dark:text-success-300">
              <UserCheck class="size-5" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">确认预览</h2>
              <p class="text-xs text-surface-500 dark:text-surface-400">Candidate + Application</p>
            </div>
          </div>
        </div>

        <div v-if="!result" class="flex min-h-[520px] flex-col items-center justify-center px-6 text-center">
          <Sparkles class="mb-3 size-10 text-surface-300 dark:text-surface-700" />
          <h3 class="text-base font-semibold text-surface-700 dark:text-surface-200">等待解析结果</h3>
          <p class="mt-1 max-w-sm text-sm text-surface-500 dark:text-surface-400">
            选择岗位并提交简历后，这里会显示候选人字段和推荐结论。
          </p>
        </div>

        <div v-else class="space-y-6 p-5">
          <div class="flex flex-wrap items-center gap-4 border-b border-surface-100 pb-5 dark:border-surface-800">
            <div>
              <p class="text-xs font-medium uppercase text-surface-400">Score</p>
              <p class="mt-1 text-4xl font-black tabular-nums" :class="scoreTone(result.match.score)">
                {{ result.match.score }}
              </p>
            </div>
            <span
              class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset"
              :class="levelBadgeClass(result.match.recommendationLevel)"
            >
              {{ result.match.recommendationLevel }}
            </span>
            <span class="text-xs text-surface-500 dark:text-surface-400">
              置信度 {{ Math.round(result.confidence * 100) }}%
            </span>
            <button
              type="button"
              class="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-surface-300 px-3 py-1.5 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
              @click="handleParse"
            >
              <RefreshCw class="size-3.5" />
              重新解析
            </button>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="candidateName" class="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
                姓名
              </label>
              <input
                id="candidateName"
                v-model="candidateForm.name"
                class="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-950 dark:text-surface-100"
              />
            </div>
            <div>
              <label for="candidateEmail" class="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
                邮箱
              </label>
              <input
                id="candidateEmail"
                v-model="candidateForm.email"
                type="email"
                class="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-950 dark:text-surface-100"
              />
            </div>
            <div>
              <label for="candidatePhone" class="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
                手机
              </label>
              <input
                id="candidatePhone"
                v-model="candidateForm.phone"
                class="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-950 dark:text-surface-100"
              />
            </div>
            <div>
              <label for="candidateCity" class="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
                城市
              </label>
              <input
                id="candidateCity"
                v-model="candidateForm.city"
                class="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-950 dark:text-surface-100"
              />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <div class="rounded-lg bg-surface-50 p-3 dark:bg-surface-950">
              <p class="text-xs text-surface-400">最近公司</p>
              <p class="mt-1 truncate text-sm font-medium text-surface-800 dark:text-surface-100">
                {{ result.candidate.lastCompany || '—' }}
              </p>
            </div>
            <div class="rounded-lg bg-surface-50 p-3 dark:bg-surface-950">
              <p class="text-xs text-surface-400">最近职位</p>
              <p class="mt-1 truncate text-sm font-medium text-surface-800 dark:text-surface-100">
                {{ result.candidate.lastPosition || '—' }}
              </p>
            </div>
            <div class="rounded-lg bg-surface-50 p-3 dark:bg-surface-950">
              <p class="text-xs text-surface-400">到岗时间</p>
              <p class="mt-1 truncate text-sm font-medium text-surface-800 dark:text-surface-100">
                {{ result.candidate.availability || '—' }}
              </p>
            </div>
          </div>

          <div v-if="result.candidate.skills.length" class="flex flex-wrap gap-2">
            <span
              v-for="skill in result.candidate.skills"
              :key="skill"
              class="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300"
            >
              {{ skill }}
            </span>
          </div>

          <div>
            <h3 class="mb-2 text-sm font-semibold text-surface-900 dark:text-surface-100">推荐语</h3>
            <p class="rounded-lg bg-surface-50 p-3 text-sm leading-6 text-surface-700 dark:bg-surface-950 dark:text-surface-300">
              {{ result.recommendationText }}
            </p>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <h3 class="mb-2 text-sm font-semibold text-surface-900 dark:text-surface-100">匹配点</h3>
              <ul class="space-y-2">
                <li
                  v-for="point in result.match.matchedPoints"
                  :key="point"
                  class="flex gap-2 text-sm text-surface-700 dark:text-surface-300"
                >
                  <CheckCircle2 class="mt-0.5 size-4 shrink-0 text-success-500" />
                  <span>{{ point }}</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 class="mb-2 text-sm font-semibold text-surface-900 dark:text-surface-100">风险与待确认</h3>
              <ul class="space-y-2">
                <li
                  v-for="point in [...result.match.riskPoints, ...result.match.missingPoints]"
                  :key="point"
                  class="flex gap-2 text-sm text-surface-700 dark:text-surface-300"
                >
                  <AlertCircle class="mt-0.5 size-4 shrink-0 text-warning-500" />
                  <span>{{ point }}</span>
                </li>
              </ul>
            </div>
          </div>

          <div>
            <label for="hrNotes" class="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
              HR 备注
            </label>
            <textarea
              id="hrNotes"
              v-model="hrNotes"
              rows="3"
              class="w-full resize-y rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-950 dark:text-surface-100"
            />
          </div>

          <button
            type="button"
            :disabled="!canConfirm"
            class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-success-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-success-700 disabled:cursor-not-allowed disabled:opacity-50"
            @click="handleConfirm"
          >
            <Loader2 v-if="isConfirming" class="size-4 animate-spin" />
            <UserCheck v-else class="size-4" />
            {{ isConfirming ? '确认中' : '确认并创建申请' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
