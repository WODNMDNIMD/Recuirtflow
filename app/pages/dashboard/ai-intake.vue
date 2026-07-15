<script setup lang="ts">
import { ArrowRight, Briefcase, FileText, Sparkles, Upload, Users } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

useSeoMeta({
  title: 'AI Intake - RecruitFlow',
  description: 'RecruitFlow AI candidate intake workspace',
})

const localePath = useLocalePath()

const intakeSteps = [
  {
    title: 'Resume captured',
    description: 'Candidate profile and document metadata land in Reqcore candidates/documents.',
    icon: FileText,
  },
  {
    title: 'JD matched',
    description: 'The parser will map the candidate to an open job before HR confirmation.',
    icon: Briefcase,
  },
  {
    title: 'Pipeline staged',
    description: 'Confirmed records become Candidate + Application + RecruitFlow event rows.',
    icon: Users,
  },
]
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase text-surface-400 dark:text-surface-500">RecruitFlow intake</p>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-surface-950 dark:text-surface-50">
          AI Candidate Intake
        </h1>
        <p class="mt-1 max-w-2xl text-sm text-surface-500 dark:text-surface-400">
          Demo workspace for resume ingestion, JD matching, and HR confirmation handoff. Core parse/confirm actions are intentionally left for the intake module.
        </p>
      </div>
      <NuxtLink
        :to="localePath('/dashboard/candidates/new')"
        class="inline-flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs font-semibold text-surface-700 no-underline transition-colors hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200 dark:hover:bg-surface-800"
      >
        Manual candidate
        <ArrowRight class="size-3.5" />
      </NuxtLink>
    </div>

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <section class="rounded-lg border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
            <Upload class="size-5" />
          </div>
          <div>
            <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Resume drop zone</h2>
            <p class="text-xs text-surface-500 dark:text-surface-400">Placeholder only; no parse request is sent from this page.</p>
          </div>
        </div>

        <div class="mt-5 rounded-lg border border-dashed border-surface-300 bg-surface-50 px-5 py-12 text-center dark:border-surface-700 dark:bg-surface-950">
          <Sparkles class="mx-auto size-8 text-brand-500" />
          <p class="mt-3 text-sm font-semibold text-surface-800 dark:text-surface-100">Paste or upload a resume in the intake module</p>
          <p class="mx-auto mt-1 max-w-md text-xs leading-5 text-surface-500 dark:text-surface-400">
            This polish module keeps the route and Demo story ready while avoiding unmerged AI parse/confirm dependencies.
          </p>
          <button
            type="button"
            disabled
            class="mt-5 inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-surface-200 px-3 py-2 text-xs font-semibold text-surface-500 dark:bg-surface-800 dark:text-surface-400"
          >
            Parse preview pending
          </button>
        </div>
      </section>

      <aside class="rounded-lg border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
        <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Handoff structure</h2>
        <div class="mt-4 space-y-3">
          <div
            v-for="step in intakeSteps"
            :key="step.title"
            class="flex gap-3 rounded-lg bg-surface-50 p-3 dark:bg-surface-950"
          >
            <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-surface-500 ring-1 ring-surface-200 dark:bg-surface-900 dark:text-surface-400 dark:ring-surface-800">
              <component :is="step.icon" class="size-4" />
            </div>
            <div>
              <div class="text-xs font-semibold text-surface-800 dark:text-surface-100">{{ step.title }}</div>
              <p class="mt-0.5 text-xs leading-5 text-surface-500 dark:text-surface-400">{{ step.description }}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
