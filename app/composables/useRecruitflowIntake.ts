export interface RecruitflowIntakeCandidate {
  name: string | null
  phone: string | null
  email: string | null
  city: string | null
  highestEducation: string | null
  school: string | null
  major: string | null
  experienceYears: number | null
  lastCompany: string | null
  lastPosition: string | null
  skills: string[]
  employmentStatus: string
  expectedSalary: string | null
  availability: string | null
}

export interface RecruitflowIntakeResult {
  candidate: RecruitflowIntakeCandidate
  match: {
    score: number
    matchedPoints: string[]
    riskPoints: string[]
    missingPoints: string[]
    recommendationLevel: '建议推进' | '人工复核' | '暂不推进'
    recommendationReason: string
  }
  recommendationText: string
  confidence: number
  needsConfirmation: boolean
}

export interface RecruitflowParseResponse {
  job: {
    id: string
    title: string
    status: string
  }
  source: {
    type: 'text' | 'document'
    documentId: string | null
    characterCount: number
  }
  mode: 'mock' | 'provider'
  provider: string | null
  model: string | null
  billingMode: 'platform' | 'byok' | null
  usage: {
    promptTokens: number
    completionTokens: number
  }
  result: RecruitflowIntakeResult
}

export interface RecruitflowConfirmResponse {
  candidate: {
    id: string
    firstName: string
    lastName: string
    displayName: string | null
    email: string
    phone: string | null
  }
  application: {
    id: string
    candidateId: string
    jobId: string
    status: string
    score: number | null
    notes: string | null
    createdAt: string
    updatedAt: string
  }
  created: {
    candidate: boolean
    application: boolean
  }
}

export function useRecruitflowIntake() {
  const { handlePreviewReadOnlyError } = usePreviewReadOnly()

  async function parseResume(payload: {
    jobId: string
    resumeText?: string
    documentId?: string
  }) {
    try {
      return await $fetch<RecruitflowParseResponse>('/api/recruitflow/intake/parse', {
        method: 'POST',
        body: payload,
      })
    }
    catch (error) {
      handlePreviewReadOnlyError(error)
      throw error
    }
  }

  async function confirmIntake(payload: {
    jobId: string
    documentId?: string
    recommendation: RecruitflowIntakeResult
    candidate?: {
      name?: string
      email?: string
      phone?: string
      city?: string
    }
    notes?: string
  }) {
    try {
      return await $fetch<RecruitflowConfirmResponse>('/api/recruitflow/intake/confirm', {
        method: 'POST',
        body: payload,
      })
    }
    catch (error) {
      handlePreviewReadOnlyError(error)
      throw error
    }
  }

  return {
    parseResume,
    confirmIntake,
  }
}
