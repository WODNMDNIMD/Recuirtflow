import { env } from '../../env'
import {
  syncMockTencentDocsRow,
  type MockTencentDocsSyncResult,
  type TencentDocsSyncRow,
} from './mockTencentDocs'

export type TencentDocsSyncResult =
  | MockTencentDocsSyncResult
  | {
      ok: false
      provider: 'tencent_docs'
      mode: 'api'
      status: 'not_implemented'
      row: TencentDocsSyncRow
      error: string
    }

export interface TencentDocsAdapter {
  syncRow(row: TencentDocsSyncRow): Promise<TencentDocsSyncResult>
}

export class MockTencentDocsAdapter implements TencentDocsAdapter {
  constructor(private readonly options: { filePath?: string } = {}) {}

  syncRow(row: TencentDocsSyncRow) {
    return syncMockTencentDocsRow(row, this.options)
  }
}

export class ApiTencentDocsAdapter implements TencentDocsAdapter {
  async syncRow(row: TencentDocsSyncRow): Promise<TencentDocsSyncResult> {
    return {
      ok: false,
      provider: 'tencent_docs',
      mode: 'api',
      status: 'not_implemented',
      row,
      error: 'Tencent Docs API mode is not implemented yet',
    }
  }
}

export function createTencentDocsAdapter(options: { mode?: 'mock' | 'api', filePath?: string } = {}): TencentDocsAdapter {
  const mode = options.mode ?? env.TENCENT_DOCS_MODE

  if (mode === 'api') {
    return new ApiTencentDocsAdapter()
  }

  return new MockTencentDocsAdapter({ filePath: options.filePath })
}
