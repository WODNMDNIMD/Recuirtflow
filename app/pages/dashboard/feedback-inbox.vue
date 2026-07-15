<script setup lang="ts">
import { ArrowRight, CheckCircle2, Clock, Inbox, MessageSquareText } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

useSeoMeta({
  title: 'Feedback Inbox - RecruitFlow',
  description: 'RecruitFlow interviewer feedback inbox',
})

const localePath = useLocalePath()

const demoFeedback = [
  {
    interviewer: 'Hiring Manager',
    candidate: 'Awaiting parsed candidate',
    signal: 'Strong technical signal, needs compensation follow-up',
    status: 'Ready for parse module',
  },
  {
    interviewer: 'Panel Lead',
    candidate: 'Awaiting parsed candidate',
    signal: 'Advance to next round if availability matches',
    status: 'Queued',
  },
  {
    interviewer: 'Recruiter',
    candidate: 'Awaiting parsed candidate',
    signal: 'Hold until JD match confidence is available',
    status: 'Needs review',
  },
]
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase text-surface-400 dark:text-surface-500">RecruitFlow feedback</p>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-surface-950 dark:text-surface-50">
          Feedback Inbox
        </h1>
        <p class="mt-1 max-w-2xl text-sm text-surface-500 dark:text-surface-400">
          Demo queue for interviewer comments, intent extraction, and pipeline update review. Confirm actions remain out of scope for this module.
        </p>
      </div>
      <NuxtLink
        :to="localePath('/dashboard/applications')"
        class="inline-flex items-center gap-2 rounded-lg bg-surface-950 px-3 py-2 text-xs font-semibold text-white no-underline transition-colors hover:bg-surface-800 dark:bg-white dark:text-surface-950 dark:hover:bg-surface-200"
      >
        Open pipeline
        <ArrowRight class="size-3.5" />
      </NuxtLink>
    </div>

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <aside class="rounded-lg border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
            <Inbox class="size-5" />
          </div>
          <div>
            <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Inbox state</h2>
            <p class="text-xs text-surface-500 dark:text-surface-400">Prepared for feedback parse/confirm integration.</p>
          </div>
        </div>

        <div class="mt-5 grid grid-cols-3 gap-2">
          <div class="rounded-lg bg-surface-50 px-2 py-3 text-center dark:bg-surface-950">
            <div class="text-xl font-semibold text-surface-950 dark:text-surface-50">3</div>
            <div class="text-[10px] font-medium text-surface-400 dark:text-surface-500">Queued</div>
          </div>
          <div class="rounded-lg bg-surface-50 px-2 py-3 text-center dark:bg-surface-950">
            <div class="text-xl font-semibold text-surface-950 dark:text-surface-50">0</div>
            <div class="text-[10px] font-medium text-surface-400 dark:text-surface-500">Parsed</div>
          </div>
          <div class="rounded-lg bg-surface-50 px-2 py-3 text-center dark:bg-surface-950">
            <div class="text-xl font-semibold text-surface-950 dark:text-surface-50">0</div>
            <div class="text-[10px] font-medium text-surface-400 dark:text-surface-500">Confirmed</div>
          </div>
        </div>
      </aside>

      <section class="rounded-lg border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
        <div class="flex items-center justify-between border-b border-surface-100 px-5 py-4 dark:border-surface-800">
          <div class="flex items-center gap-2.5">
            <MessageSquareText class="size-4 text-surface-500 dark:text-surface-400" />
            <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Demo feedback queue</h2>
          </div>
          <span class="rounded-full bg-surface-100 px-2 py-1 text-[11px] font-medium text-surface-500 dark:bg-surface-800 dark:text-surface-400">
            Mock until API lands
          </span>
        </div>

        <div class="divide-y divide-surface-100 dark:divide-surface-800">
          <div
            v-for="item in demoFeedback"
            :key="item.signal"
            class="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-surface-900 dark:text-surface-100">{{ item.interviewer }}</span>
                <span class="text-xs text-surface-400 dark:text-surface-500">for {{ item.candidate }}</span>
              </div>
              <p class="mt-1 text-sm text-surface-600 dark:text-surface-300">{{ item.signal }}</p>
            </div>
            <div class="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
              <Clock v-if="item.status !== 'Ready for parse module'" class="size-3.5" />
              <CheckCircle2 v-else class="size-3.5 text-success-500" />
              {{ item.status }}
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
