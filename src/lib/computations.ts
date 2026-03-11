import { computePlan } from '../store/useAppStore'
import type { Task, TaskNode, ProjectHealth, SCurveData } from '../types'
import type { Project, CostRow, LedgerEntry, TasksDB, CostsDB, LedgerDB } from '../types'

// ── Tree builder ──────────────────────────────────────────────
export function buildTree(flat: Task[]): TaskNode[] {
  if (!flat.length) return []
  const map = new Map<string, TaskNode>()
  flat.forEach(t => map.set(t.id, { ...t, children: [], _leaf: false }))
  flat.forEach(t => {
    if (t.parent_id && map.has(t.parent_id))
      map.get(t.parent_id)!.children.push(map.get(t.id)!)
  })
  const roots = [...map.values()].filter(t => !t.parent_id)

  const allDescendantCloses = (node: TaskNode): string[] => {
    const dates: string[] = []
    if (node.actual_close_date) dates.push(node.actual_close_date)
    node.children.forEach(c => dates.push(...allDescendantCloses(c)))
    return dates
  }
  const allDescendantIssues = (node: TaskNode): { name: string; remark: string }[] => {
    const issues: { name: string; remark: string }[] = []
    if (node.remark?.trim()) issues.push({ name: node.name, remark: node.remark.trim() })
    node.children.forEach(c => issues.push(...allDescendantIssues(c)))
    return issues
  }

  const aggregate = (node: TaskNode): void => {
    if (!node.children.length) { node._leaf = true; return }
    node.children.forEach(aggregate)
    node.weight = node.children.reduce((s, c) => s + Number(c.weight), 0)
    const tw = node.weight
    if (tw > 0) {
      node.planned = node.children.reduce((s, c) => s + Number(c.planned ?? 0) * Number(c.weight), 0) / tw
      node.actual  = node.children.reduce((s, c) => s + Number(c.actual)  * Number(c.weight), 0) / tw
    }
    const starts = node.children.map(c => c.start_date).filter(Boolean).sort()
    const ends   = node.children.map(c => c.end_date).filter(Boolean).sort().reverse()
    if (starts.length) node.start_date = starts[0]
    if (ends.length)   node.end_date   = ends[0]
    const closes = allDescendantCloses(node)
    node.actual_close_date = closes.length ? closes.sort().reverse()[0] : null
    node._issues = allDescendantIssues(node)
  }
  roots.forEach(aggregate)
  return roots
}

// ── Flat roots computation ────────────────────────────────────
export function computeRoots(flatTasks: Task[]): TaskNode[] {
  if (!flatTasks.length) return []
  const map = new Map<string, TaskNode>()
  flatTasks.forEach(t => map.set(t.id, { ...t, children: [], _leaf: false }))
  flatTasks.forEach(t => {
    if (t.parent_id && map.has(t.parent_id))
      map.get(t.parent_id)!.children.push(map.get(t.id)!)
  })
  const roots = [...map.values()].filter(t => !t.parent_id)

  const walkActual = (node: TaskNode): number => {
    if (!node.children.length) return Number(node.actual)
    const tw = node.children.reduce((s, c) => s + Number(c.weight), 0)
    if (!tw) return 0
    return node.children.reduce((s, c) => s + walkActual(c) * Number(c.weight), 0) / tw
  }
  roots.forEach(r => { r.actual = walkActual(r) })
  return roots
}

// ── Project health ────────────────────────────────────────────
interface HealthStore {
  _tasksDB: TasksDB; _costsDB: CostsDB; _ledgerDB: LedgerDB; projects: Project[]
}

export function computeProjectHealth(projId: string, store: HealthStore): ProjectHealth {
  const tasks  = store._tasksDB[projId]  || []
  const costs  = store._costsDB[projId]  || []
  const ledger = store._ledgerDB[projId] || []
  const proj   = store.projects.find(p => p.id === projId)

  const roots   = computeRoots(tasks)
  const tw      = roots.reduce((s, r) => s + Number(r.weight), 0)
  const planPct = tw > 0 ? Math.round(roots.reduce((s, r) => s + computePlan(r.start_date, r.end_date) * Number(r.weight), 0) / tw) : 0
  const actualPct = tw > 0 ? Math.round(roots.reduce((s, r) => s + Number(r.actual) * Number(r.weight), 0) / tw) : 0
  const planBudget   = proj?.budget ?? 0
  const actualBudget = costs.reduce((s, c) => s + Number(c.actual_cost || 0), 0)
  const payments     = ledger.filter(e => e.type === 'collection').reduce((s, e) => s + Number(e.amount), 0)
  const revPct       = proj && proj.sales > 0 ? Math.round(payments / proj.sales * 100) : 0
  const spi   = planPct > 0 ? actualPct / planPct : 1
  const cpi   = actualBudget > 0 ? planBudget / actualBudget : 1
  const score = spi * 50 + cpi * 40 + (revPct / 100) * 10
  const status = score < 65 || spi < 0.75 || cpi < 0.75
    ? 'critical'
    : score >= 80 && spi >= 0.90 && cpi >= 0.90 ? 'on-track' : 'at-risk'

  return { planPct, actualPct, planBudget, actualBudget, payments, revPct, status, spi, cpi }
}

// ── S-Curve data ──────────────────────────────────────────────
export function buildSCurveData(tasks: Task[]): SCurveData {
  const empty: SCurveData = { labels: [], cumPlan: [], cumActual: [], forecast: [], mPlan: [], mAct: [] }
  if (!tasks.length) return empty

  const starts = tasks.map(t => t.start_date).filter(Boolean).sort()
  const ends   = tasks.map(t => t.end_date).filter(Boolean).sort().reverse()
  if (!starts.length || !ends.length) return empty

  const tw = tasks.reduce((s, t) => s + Number(t.weight || 0), 0)
  if (!tw) return empty

  const s = new Date(starts[0]), e = new Date(ends[0])
  const labels: string[] = [], cumPlan: number[] = [], cumActual: (number|null)[] = []
  const forecast: (number|null)[] = [], mPlan: number[] = [], mAct: (number|null)[] = []
  let cumP = 0, cumA = 0

  const months: Date[] = []
  const cur = new Date(s.getFullYear(), s.getMonth(), 1)
  while (cur <= e) { months.push(new Date(cur)); cur.setMonth(cur.getMonth() + 1) }

  const todayMs = new Date().setHours(0,0,0,0)
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  months.forEach(m => {
    const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0)
    labels.push(`${MONTHS[m.getMonth()]}-${String(m.getFullYear()).slice(2)}`)

    let planInc = 0
    tasks.forEach(t => {
      if (!t.start_date || !t.end_date) return
      const ts = new Date(t.start_date), te = new Date(t.end_date)
      const total = Math.max(1, te.getTime() - ts.getTime())
      const overlapStart = Math.max(ts.getTime(), m.getTime())
      const overlapEnd   = Math.min(te.getTime(), mEnd.getTime())
      if (overlapEnd > overlapStart)
        planInc += ((overlapEnd - overlapStart) / total) * (Number(t.weight) / tw) * 100
    })
    cumP = Math.min(100, cumP + planInc)
    cumPlan.push(+cumP.toFixed(2))
    mPlan.push(+planInc.toFixed(2))

    if (mEnd.getTime() <= todayMs) {
      let actInc = 0
      tasks.forEach(t => {
        if (!t.start_date || !t.end_date) return
        const ts = new Date(t.start_date), te = new Date(t.end_date)
        const total = Math.max(1, te.getTime() - ts.getTime())
        const overlapStart = Math.max(ts.getTime(), m.getTime())
        const overlapEnd   = Math.min(te.getTime(), mEnd.getTime())
        if (overlapEnd > overlapStart)
          actInc += ((overlapEnd - overlapStart) / total) * (Number(t.actual || 0) / 100) * (Number(t.weight) / tw) * 100
      })
      cumA = Math.min(100, cumA + actInc)
      cumActual.push(+cumA.toFixed(2))
      mAct.push(+actInc.toFixed(2))
      forecast.push(null)
    } else {
      cumActual.push(null)
      mAct.push(null)
      const latestActual = [...cumActual].filter((v): v is number => v !== null).pop() ?? 0
      const spi = cumPlan[cumPlan.length - 1] > 0 ? latestActual / cumPlan[cumPlan.length - 1] : 1
      forecast.push(+(Math.min(100, cumP * (0.9 + spi * 0.1))).toFixed(2))
    }
  })

  return { labels, cumPlan, cumActual, forecast, mPlan, mAct }
}
