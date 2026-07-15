export type IntegrationProvider = 'wecom' | 'tencent_docs'
export type IntegrationStatus = 'mocked' | 'success' | 'failed' | 'not_implemented'

export interface IntegrationLogAttempt {
  organizationId: string
  userId?: string | null
  provider: IntegrationProvider
  action: string
  status: IntegrationStatus
  targetId?: string | null
  errorMessage?: string | null
  metadata?: Record<string, unknown>
}

export async function logIntegrationAttempt(attempt: IntegrationLogAttempt) {
  logInfo('recruitflow.integration.attempt', {
    org_id: attempt.organizationId,
    user_id: attempt.userId ?? undefined,
    provider: attempt.provider,
    action: attempt.action,
    status: attempt.status,
    target_id: attempt.targetId ?? undefined,
    error_message: attempt.errorMessage ?? undefined,
  })

  return {
    stored: false,
    reason: 'integration_log table is not available yet',
    attempt,
  }
}
