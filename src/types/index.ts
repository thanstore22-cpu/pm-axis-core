// ── Core domain types ────────────────────────────────────────

export interface Project {
  id: string
  code: string
  name: string
  start_date: string
  end_date: string
  budget: number
  sales: number
  is_active: boolean
}

export interface Task {
  id: string
  proj_id: string
  name: string
  start_date: string
  end_date: string
  actual: number       // 0–100 %
  planned?: number     // computed: plan % at today
  weight: number
  remark?: string
  parent_id?: string | null
  actual_close_date?: string | null
}

export interface TaskNode extends Task {
  children: TaskNode[]
  _leaf: boolean
  _issues?: { name: string; remark: string }[]
}

export interface Milestone {
  id: string
  proj_id: string
  name: string
  plan_date: string
  actual_date: string | null
  status: 'done' | 'upcoming' | 'overdue'
}

export interface CostRow {
  id: string
  proj_id: string
  month: string        // e.g. "Jan-25"
  plan_cost: number
  actual_cost: number
}

export interface LedgerEntry {
  id: string
  proj_id: string
  date: string
  type: 'billing' | 'collection'
  amount: number
  desc: string
  ref: string
}

// ── Computed types ────────────────────────────────────────────

export type HealthStatus = 'on-track' | 'at-risk' | 'critical'
export type PmisStatus   = 'good' | 'risk' | 'recovering' | 'critical'
export type GdStatus     = 'idle' | 'connecting' | 'saving' | 'error'

export interface ProjectHealth {
  planPct: number
  actualPct: number
  planBudget: number
  actualBudget: number
  payments: number
  revPct: number
  status: HealthStatus
  spi: number
  cpi: number
}

export interface SCurveData {
  labels: string[]
  cumPlan: number[]
  cumActual: (number | null)[]
  forecast: (number | null)[]
  mPlan: number[]
  mAct: (number | null)[]
}

export interface GdUser {
  name?: string
  email?: string
  picture?: string
}

// ── Store shape ───────────────────────────────────────────────

export type PageId = 'dashboard' | 'schedule' | 'scurve' | 'cashflow' | 'revenue' | 'import' | 'audit' | 'settings'
export type Theme  = 'light' | 'dark' | 'system'

export interface TasksDB  { [projId: string]: Task[] }
export interface CostsDB  { [projId: string]: CostRow[] }
export interface MilestonesDB { [projId: string]: Milestone[] }
export interface LedgerDB { [projId: string]: LedgerEntry[] }
