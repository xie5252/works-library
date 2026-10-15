// Node 运行时适配层（阿里云服务器部署用）：
//   better-sqlite3 → 包装成 D1 接口（prepare/bind/all/first/run/batch）
//   本地磁盘目录   → 包装成 R2 接口（get/put）
// Cloudflare 版完全不受影响（走真实 D1/R2 绑定），路由代码零改动。
import Database from 'better-sqlite3'
import { createReadStream } from 'node:fs'
import { stat, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'

/* ---------------- D1 适配 ---------------- */

type D1Row = Record<string, unknown>

interface BoundStmt {
  bind: (...params: unknown[]) => BoundStmt
  all: () => Promise<{ results: D1Row[] }>
  first: () => Promise<D1Row | null>
  run: () => Promise<{ success: boolean; meta: { changes: number; last_row_id: number } }>
  // 同步执行体：better-sqlite3 事务内不允许异步（batch 用）
  _runSync: () => { success: boolean; meta: { changes: number; last_row_id: number } }
}

export class LocalD1 {
  private db: Database.Database

  constructor(file: string) {
    this.db = new Database(file)
    this.db.pragma('journal_mode = WAL')
  }

  private execRun(
    stmt: Database.Statement,
    params: unknown[],
  ): { success: boolean; meta: { changes: number; last_row_id: number } } {
    const info = stmt.run(...(params as never[]))
    return {
      success: true,
      meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) },
    }
  }

  prepare(sql: string): BoundStmt {
    const stmt = this.db.prepare(sql)
    const make = (params: unknown[]): BoundStmt => ({
      bind: (...p: unknown[]) => make([...p]),
      all: async () => ({ results: stmt.all(...(params as never[])) as D1Row[] }),
      first: async () => (stmt.get(...(params as never[])) as D1Row | undefined) ?? null,
      run: async () => this.execRun(stmt, params),
      _runSync: () => this.execRun(stmt, params),
    })
    return make([])
  }

  // 事务内顺序执行（等价 D1 batch）
  // 注意：better-sqlite3 的事务函数必须是同步的，异步会抛
  // "Transaction function cannot return a promise"
  async batch(statements: BoundStmt[]) {
    const tx = this.db.transaction((stmts: BoundStmt[]) => stmts.map((s) => s._runSync()))
    return tx(statements)
  }
}

/* ---------------- R2 适配 ---------------- */

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
  pdf: 'application/pdf',
}

export class LocalR2 {
  constructor(private root: string) {}

  // key 校验与 worker.ts /media 路由一致，防止路径穿越
  private file(key: string): string {
    if (key.includes('..') || key.includes('\\') || key.startsWith('/')) {
      throw new Error(`非法 key: ${key}`)
    }
    return path.join(this.root, key)
  }

  async get(key: string) {
    const file = this.file(key)
    let s
    try {
      s = await stat(file)
    } catch {
      return null
    }
    const ext = (key.split('.').pop() || '').toLowerCase()
    const type = CONTENT_TYPES[ext] || 'application/octet-stream'
    const body = Readable.toWeb(createReadStream(file)) as unknown as ReadableStream
    return {
      body,
      httpEtag: `"${s.size.toString(16)}-${Math.floor(s.mtimeMs).toString(16)}"`,
      writeHttpMetadata: (h: Headers) => h.set('content-type', type),
    }
  }

  async put(key: string, data: ArrayBuffer | Uint8Array) {
    const file = this.file(key)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, new Uint8Array(data))
    return {}
  }
}
