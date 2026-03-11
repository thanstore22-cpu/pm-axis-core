import { create } from 'zustand'
import type {
  Project, Task, Milestone, CostRow, LedgerEntry,
  TasksDB, CostsDB, MilestonesDB, LedgerDB,
  PageId, Theme, GdUser, GdStatus,
} from '../types'

// ── Helpers ──────────────────────────────────────────────────
export const uid = (): string => Math.random().toString(36).slice(2, 11)
export const fmt = (n: number): string => new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0)
export const fmtDate = (s?: string | null): string => {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`
}
export const today = (): Date => { const d = new Date(); d.setHours(0,0,0,0); return d }
export const parseNum = (s: string | number): number => { const n = parseFloat(String(s).replace(/,/g, '')); return isNaN(n) ? 0 : n }
export const fmtM = (v: number): string => (v / 1_000_000).toFixed(1) + ' M'
export const fmtMonthLabel = (d: Date): string => {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`
}
export const computePlan = (start?: string, end?: string): number => {
  if (!start || !end) return 0
  const s = new Date(start), e = new Date(end), t = today()
  if (t <= s) return 0
  if (t >= e) return 100
  return Math.round((t.getTime() - s.getTime()) / (e.getTime() - s.getTime()) * 100)
}

export const PROJ_COLORS = ['#2563eb','#16a34a','#ea580c','#8b5cf6','#0891b2','#d97706','#db2777','#0284c7']

// ── Demo data generators ──────────────────────────────────────
function generateCosts(pid: string, start: string, end: string, baseAmt: number, variance: number): CostRow[] {
  const s = new Date(start), e = new Date(end)
  const rows: CostRow[] = []
  const cur = new Date(s.getFullYear(), s.getMonth(), 1)
  while (cur <= e) {
    const plan = Math.round(baseAmt * (0.8 + Math.random() * 0.4))
    const act  = Math.round(plan * (1 - variance + Math.random() * variance * 2))
    rows.push({ id: uid(), proj_id: pid, month: fmtMonthLabel(cur), plan_cost: plan, actual_cost: act })
    cur.setMonth(cur.getMonth() + 1)
  }
  return rows
}

const DEMO_PROJECTS: Project[] = [
  { id:'p1', code:'PRJ-001', name:'Sky Tower Residences',    start_date:'2025-06-01', end_date:'2026-12-31', budget:95000000,  sales:120000000, is_active:true },
  { id:'p2', code:'PRJ-002', name:'Harbor Bridge Expansion', start_date:'2025-11-15', end_date:'2026-08-31', budget:70000000,  sales:85000000,  is_active:true },
  { id:'p3', code:'PRJ-003', name:'Green Valley Industrial', start_date:'2025-09-01', end_date:'2026-03-31', budget:160000000, sales:200000000, is_active:true },
]

const DEMO_TASKS: TasksDB = {
  p1: [
    { id:'t1', proj_id:'p1', name:'Foundation Works',   start_date:'2025-06-01', end_date:'2025-10-31', actual:100, weight:15, remark:'',             parent_id:null },
    { id:'t2', proj_id:'p1', name:'Structural Frame',   start_date:'2025-08-01', end_date:'2026-04-30', actual:72,  weight:25, remark:'2 week delay',  parent_id:null },
    { id:'t3', proj_id:'p1', name:'MEP Installation',   start_date:'2025-11-01', end_date:'2026-08-31', actual:38,  weight:20, remark:'',              parent_id:null },
    { id:'t4', proj_id:'p1', name:'Facade & Cladding',  start_date:'2026-01-15', end_date:'2026-09-30', actual:12,  weight:15, remark:'',              parent_id:null },
    { id:'t5', proj_id:'p1', name:'Interior Fit-Out',   start_date:'2026-04-01', end_date:'2026-11-30', actual:0,   weight:15, remark:'',              parent_id:null },
    { id:'t6', proj_id:'p1', name:'Testing & Handover', start_date:'2026-10-01', end_date:'2026-12-31', actual:0,   weight:10, remark:'',              parent_id:null },
  ],
  p2: [
    { id:'t7', proj_id:'p2', name:'Piling & Foundations',start_date:'2025-11-15', end_date:'2026-02-28', actual:85, weight:20, remark:'',             parent_id:null },
    { id:'t8', proj_id:'p2', name:'Substructure',        start_date:'2026-01-01', end_date:'2026-04-30', actual:55, weight:25, remark:'Steel delayed', parent_id:null },
    { id:'t9', proj_id:'p2', name:'Superstructure',      start_date:'2026-03-01', end_date:'2026-07-31', actual:10, weight:30, remark:'',             parent_id:null },
    { id:'t10',proj_id:'p2', name:'Bridge Deck',         start_date:'2026-05-01', end_date:'2026-08-15', actual:0,  weight:25, remark:'',             parent_id:null },
  ],
  p3: [
    { id:'t11',proj_id:'p3', name:'Site Preparation',   start_date:'2025-09-01', end_date:'2025-11-30', actual:100, weight:10, remark:'',              parent_id:null },
    { id:'t12',proj_id:'p3', name:'Civil Works',         start_date:'2025-10-01', end_date:'2026-01-31', actual:92,  weight:20, remark:'',              parent_id:null },
    { id:'t13',proj_id:'p3', name:'Process Equipment',  start_date:'2025-12-01', end_date:'2026-02-28', actual:78,  weight:30, remark:'Import delays', parent_id:null },
    { id:'t14',proj_id:'p3', name:'Piping & Electrical',start_date:'2026-01-01', end_date:'2026-03-15', actual:60,  weight:25, remark:'',              parent_id:null },
    { id:'t15',proj_id:'p3', name:'Commissioning',      start_date:'2026-02-15', end_date:'2026-03-31', actual:15,  weight:15, remark:'',              parent_id:null },
  ],
}

const DEMO_MILESTONES: MilestonesDB = {
  p1: [
    { id:'m1', proj_id:'p1', name:'Foundation Complete',  plan_date:'2025-10-31', actual_date:'2025-10-28', status:'done' },
    { id:'m2', proj_id:'p1', name:'Structure Topped Out', plan_date:'2026-04-30', actual_date:null,          status:'upcoming' },
    { id:'m3', proj_id:'p1', name:'Handover',             plan_date:'2026-12-31', actual_date:null,          status:'upcoming' },
  ],
  p2: [
    { id:'m4', proj_id:'p2', name:'Piling Complete',      plan_date:'2026-02-28', actual_date:null,          status:'upcoming' },
    { id:'m5', proj_id:'p2', name:'Bridge Complete',      plan_date:'2026-08-31', actual_date:null,          status:'upcoming' },
  ],
  p3: [
    { id:'m6', proj_id:'p3', name:'Civil Handover',       plan_date:'2026-01-31', actual_date:'2026-01-28',  status:'done' },
    { id:'m7', proj_id:'p3', name:'Mechanical Complete',  plan_date:'2026-02-28', actual_date:null,          status:'upcoming' },
    { id:'m8', proj_id:'p3', name:'Project Complete',     plan_date:'2026-03-31', actual_date:null,          status:'upcoming' },
  ],
}

const DEMO_LEDGER: LedgerDB = {
  p1: [
    { id:'l1', proj_id:'p1', date:'2025-07-15', type:'billing',    amount:8500000,  desc:'Progress Claim #1', ref:'PC-001' },
    { id:'l2', proj_id:'p1', date:'2025-08-20', type:'collection', amount:8000000,  desc:'Payment received',  ref:'INV-001' },
    { id:'l3', proj_id:'p1', date:'2025-09-15', type:'billing',    amount:10200000, desc:'Progress Claim #2', ref:'PC-002' },
    { id:'l4', proj_id:'p1', date:'2025-10-25', type:'collection', amount:9800000,  desc:'Payment received',  ref:'INV-002' },
    { id:'l5', proj_id:'p1', date:'2025-11-15', type:'billing',    amount:11500000, desc:'Progress Claim #3', ref:'PC-003' },
    { id:'l6', proj_id:'p1', date:'2025-12-20', type:'collection', amount:11000000, desc:'Payment received',  ref:'INV-003' },
    { id:'l7', proj_id:'p1', date:'2026-01-15', type:'billing',    amount:9800000,  desc:'Progress Claim #4', ref:'PC-004' },
    { id:'l8', proj_id:'p1', date:'2026-02-20', type:'collection', amount:9500000,  desc:'Payment received',  ref:'INV-004' },
  ],
  p2: [
    { id:'l9', proj_id:'p2',  date:'2025-12-15', type:'billing',    amount:6200000, desc:'Progress Claim #1', ref:'PC-001' },
    { id:'l10',proj_id:'p2',  date:'2026-01-20', type:'collection', amount:5800000, desc:'Payment received',  ref:'INV-001' },
    { id:'l11',proj_id:'p2',  date:'2026-02-15', type:'billing',    amount:7500000, desc:'Progress Claim #2', ref:'PC-002' },
  ],
  p3: [
    { id:'l12',proj_id:'p3',  date:'2025-10-15', type:'billing',    amount:15000000, desc:'Progress Claim #1', ref:'PC-001' },
    { id:'l13',proj_id:'p3',  date:'2025-11-20', type:'collection', amount:14500000, desc:'Payment received',  ref:'INV-001' },
    { id:'l14',proj_id:'p3',  date:'2025-12-15', type:'billing',    amount:18000000, desc:'Progress Claim #2', ref:'PC-002' },
    { id:'l15',proj_id:'p3',  date:'2026-01-10', type:'collection', amount:17500000, desc:'Payment received',  ref:'INV-002' },
    { id:'l16',proj_id:'p3',  date:'2026-02-15', type:'billing',    amount:16000000, desc:'Progress Claim #3', ref:'PC-003' },
    { id:'l17',proj_id:'p3',  date:'2026-03-01', type:'collection', amount:15000000, desc:'Payment received',  ref:'INV-003' },
  ],
}

// ── Store interface ───────────────────────────────────────────
interface AppState {
  activePage: PageId
  theme: Theme
  projects: Project[]
  selectedProjId: string | null
  tasks: Task[]
  milestones: Milestone[]
  costRows: CostRow[]
  ledgerRows: LedgerEntry[]
  _tasksDB: TasksDB
  _costsDB: CostsDB
  _milestonesDB: MilestonesDB
  _ledgerDB: LedgerDB
  gdConnected: boolean
  gdUser: GdUser | null
  gdStatus: GdStatus
  gdFileId: string | null
  gdFileName: string | null
  // Actions
  setActivePage: (page: PageId) => void
  setTheme: (theme: Theme) => void
  setSelectedProjId: (id: string) => void
  loadDemoData: () => void
  loadProjectData: (projId: string) => void
  updateTask: (id: string, changes: Partial<Task>) => void
  updateCostRow: (id: string, field: 'plan_cost' | 'actual_cost', value: number) => void
  setGdConnected: (user: GdUser, fileId: string | null, fileName: string | null) => void
  setGdDisconnected: () => void
  setGdStatus: (status: GdStatus) => void
}

const useAppStore = create<AppState>((set, get) => ({
  activePage: 'dashboard',
  theme: (localStorage.getItem('pm_theme') as Theme) || 'system',
  projects: [],
  selectedProjId: null,
  tasks: [],
  milestones: [],
  costRows: [],
  ledgerRows: [],
  _tasksDB: {},
  _costsDB: {},
  _milestonesDB: {},
  _ledgerDB: {},
  gdConnected: false,
  gdUser: null,
  gdStatus: 'idle',
  gdFileId: null,
  gdFileName: null,

  setActivePage: (page) => set({ activePage: page }),

  setTheme: (theme) => {
    localStorage.setItem('pm_theme', theme)
    const resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme
    document.documentElement.setAttribute('data-theme', resolved)
    set({ theme })
  },

  setSelectedProjId: (id) => {
    set({ selectedProjId: id })
    get().loadProjectData(id)
  },

  loadDemoData: () => {
    const costsDB: CostsDB = {
      p1: generateCosts('p1', '2025-06-01', '2026-12-31', 6500000, 0.12),
      p2: generateCosts('p2', '2025-11-15', '2026-08-31', 8000000, 0.08),
      p3: generateCosts('p3', '2025-09-01', '2026-03-31', 18000000, 0.15),
    }
    set({
      projects: DEMO_PROJECTS,
      selectedProjId: 'p1',
      _tasksDB: DEMO_TASKS,
      _costsDB: costsDB,
      _milestonesDB: DEMO_MILESTONES,
      _ledgerDB: DEMO_LEDGER,
    })
    get().loadProjectData('p1')
  },

  loadProjectData: (projId) => {
    const s = get()
    const tasks = (s._tasksDB[projId] || []).map(t => ({
      ...t, planned: computePlan(t.start_date, t.end_date),
    }))
    set({
      tasks,
      milestones: [...(s._milestonesDB[projId] || [])],
      costRows:   [...(s._costsDB[projId]       || [])],
      ledgerRows: [...(s._ledgerDB[projId]       || [])],
    })
  },

  updateTask: (id, changes) => {
    const { selectedProjId, _tasksDB } = get()
    if (!selectedProjId) return
    const updated: TasksDB = {
      ..._tasksDB,
      [selectedProjId]: (_tasksDB[selectedProjId] || []).map(t =>
        t.id === id ? { ...t, ...changes } : t
      ),
    }
    set({ _tasksDB: updated })
    get().loadProjectData(selectedProjId)
  },

  updateCostRow: (id, field, value) => {
    const { selectedProjId, _costsDB } = get()
    if (!selectedProjId) return
    const updated: CostsDB = {
      ..._costsDB,
      [selectedProjId]: (_costsDB[selectedProjId] || []).map(r =>
        r.id === id ? { ...r, [field]: value } : r
      ),
    }
    set({ _costsDB: updated, costRows: updated[selectedProjId] })
  },

  setGdConnected:    (user, fileId, fileName) => set({ gdConnected: true,  gdUser: user, gdFileId: fileId, gdFileName: fileName, gdStatus: 'idle' }),
  setGdDisconnected: ()                        => set({ gdConnected: false, gdUser: null, gdFileId: null,  gdFileName: null,     gdStatus: 'idle' }),
  setGdStatus:       (status)                  => set({ gdStatus: status }),
}))

export default useAppStore
