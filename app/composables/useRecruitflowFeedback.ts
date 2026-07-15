import type { RecruitflowFeedbackParse } from '~~/server/utils/recruitflow/schemas'
import type { RecruitflowFeedbackMode } from '~~/server/utils/recruitflow/feedback'

export function useRecruitflowFeedback() {
  const parseResult = ref<(RecruitflowFeedbackParse & { mode?: RecruitflowFeedbackMode }) | null>(null)
  const confirmResult = ref<any>(null)
  const isParsing = ref(false)
  const isConfirming = ref(false)
  const error = ref<any>(null)

  async function parseFeedback(rawFeedback: string, mode?: RecruitflowFeedbackMode) {
    isParsing.value = true
    error.value = null
    confirmResult.value = null

    try {
      const result = await $fetch<RecruitflowFeedbackParse & { mode?: RecruitflowFeedbackMode }>('/api/recruitflow/feedback/parse', {
        method: 'POST',
        body: {
          rawFeedback,
          ...(mode ? { mode } : {}),
        },
      })
      parseResult.value = result
      return result
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isParsing.value = false
    }
  }

  async function confirmFeedback(payload: {
    applicationId: string
    parseResult: RecruitflowFeedbackParse
  }) {
    isConfirming.value = true
    error.value = null

    try {
      const result = await $fetch('/api/recruitflow/feedback/confirm', {
        method: 'POST',
        body: payload,
      })
      confirmResult.value = result
      await refreshNuxtData('applications')
      return result
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isConfirming.value = false
    }
  }

  function resetFeedback() {
    parseResult.value = null
    confirmResult.value = null
    error.value = null
  }

  return {
    parseResult,
    confirmResult,
    isParsing,
    isConfirming,
    error,
    parseFeedback,
    confirmFeedback,
    resetFeedback,
  }
}
