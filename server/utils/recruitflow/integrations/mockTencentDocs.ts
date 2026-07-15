import { dirname, resolve } from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { env } from '../../env'

export interface TencentDocsSyncRow {
  applicationId: string
  candidateId?: string | null
  candidateName: string
  jobTitle?: string | null
  status?: string | null
  matchScore?: number | null
  recommendationLevel?: string | null
  recommendationReason?: string | null
  recommendationText?: string | null
  feedbackSummary?: string | null
  syncedAt?: string | null
}

export interface MockTencentDocsSyncResult {
  ok: boolean
  provider: 'tencent_docs'
  mode: 'mock'
  status: 'success'
  filePath: string
  operation: 'inserted' | 'updated'
  row: Required<TencentDocsSyncRow>
}

const CSV_HEADERS = [
  'application_id',
  'candidate_id',
  'candidate_name',
  'job_title',
  'status',
  'match_score',
  'recommendation_level',
  'recommendation_reason',
  'recommendation_text',
  'feedback_summary',
  'synced_at',
] as const

function normalizeRow(row: TencentDocsSyncRow): Required<TencentDocsSyncRow> {
  return {
    applicationId: row.applicationId,
    candidateId: row.candidateId ?? '',
    candidateName: row.candidateName,
    jobTitle: row.jobTitle ?? '',
    status: row.status ?? '',
    matchScore: row.matchScore ?? null,
    recommendationLevel: row.recommendationLevel ?? '',
    recommendationReason: row.recommendationReason ?? '',
    recommendationText: row.recommendationText ?? '',
    feedbackSummary: row.feedbackSummary ?? '',
    syncedAt: row.syncedAt ?? new Date().toISOString(),
  }
}

function csvEscape(value: string | number | null) {
  const text = value === null ? '' : String(value)
  if (!/[",\n\r]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

function parseCsvLine(line: string) {
  const values: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
      continue
    }

    if (char === '"') {
      quoted = !quoted
      continue
    }

    if (char === ',' && !quoted) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }

  values.push(current)
  return values
}

function rowToCsv(row: Required<TencentDocsSyncRow>) {
  return [
    row.applicationId,
    row.candidateId,
    row.candidateName,
    row.jobTitle,
    row.status,
    row.matchScore,
    row.recommendationLevel,
    row.recommendationReason,
    row.recommendationText,
    row.feedbackSummary,
    row.syncedAt,
  ].map(csvEscape).join(',')
}

function csvValuesToRow(values: string[]): Required<TencentDocsSyncRow> {
  return {
    applicationId: values[0] ?? '',
    candidateId: values[1] ?? '',
    candidateName: values[2] ?? '',
    jobTitle: values[3] ?? '',
    status: values[4] ?? '',
    matchScore: values[5] ? Number(values[5]) : null,
    recommendationLevel: values[6] ?? '',
    recommendationReason: values[7] ?? '',
    recommendationText: values[8] ?? '',
    feedbackSummary: values[9] ?? '',
    syncedAt: values[10] ?? '',
  }
}

export async function syncMockTencentDocsRow(
  row: TencentDocsSyncRow,
  options: { filePath?: string } = {},
): Promise<MockTencentDocsSyncResult> {
  const filePath = resolve(options.filePath ?? env.TENCENT_DOCS_MOCK_FILE)
  const nextRow = normalizeRow(row)
  await mkdir(dirname(filePath), { recursive: true })

  let existingRows: Required<TencentDocsSyncRow>[] = []
  try {
    const content = await readFile(filePath, 'utf8')
    const lines = content.split(/\r?\n/).filter(Boolean)
    existingRows = lines.slice(1).map((line) => csvValuesToRow(parseCsvLine(line)))
  }
  catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }

  const existingIndex = existingRows.findIndex((existing) => existing.applicationId === nextRow.applicationId)
  const operation = existingIndex >= 0 ? 'updated' : 'inserted'

  if (existingIndex >= 0) {
    existingRows[existingIndex] = nextRow
  }
  else {
    existingRows.push(nextRow)
  }

  const csv = [
    CSV_HEADERS.join(','),
    ...existingRows.map(rowToCsv),
  ].join('\n') + '\n'

  await writeFile(filePath, csv, 'utf8')

  return {
    ok: true,
    provider: 'tencent_docs',
    mode: 'mock',
    status: 'success',
    filePath,
    operation,
    row: nextRow,
  }
}

export { CSV_HEADERS as TENCENT_DOCS_MOCK_CSV_HEADERS }
