export const RECRUITFLOW_STATUS_LABELS: Record<string, string> = {
  new: '新候选人',
  screening: '待二审',
  interview: '面试中',
  offer: 'Offer阶段',
  hired: '已入职',
  rejected: '已淘汰',
}

export const RECRUITFLOW_INTENT_TO_STATUS: Record<string, string | null> = {
  schedule_interview: 'interview',
  reject: 'rejected',
  advance_next_round: 'interview',
  offer: 'offer',
  hired: 'hired',
  hold: null,
  unknown: null,
}

export function getRecruitflowStatusLabel(status: string) {
  return RECRUITFLOW_STATUS_LABELS[status] ?? status
}

