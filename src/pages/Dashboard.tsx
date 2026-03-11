import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import useAppStore, { fmt, fmtDate, PROJ_COLORS } from '../store/useAppStore'
import { computeProjectHealth, computeRoots } from '../lib/computations'
import type { HealthStatus } from '../types'

Chart.register(...registerables)

function StatusBadge({ status }: { status: HealthStatus }) {
  const map: Record<HealthStatus, [string, string]> = {
    'on-track': ['badge-green',  'On Track'],
    'at-risk':  ['badge-orange', 'At Risk'],
    'critical': ['badge-red',    'Critical'],
  }
  const [cls, label] = map[status]
  return <span className={`badge ${cls}`}>{label}</span>
}

export default function Dashboard() {
  const store = useAppStore()
  const { projects, _costsDB, _ledgerDB, _tasksDB, setSelectedProjId, setActivePage } = store
  const pieRef = useRef<HTMLCanvasElement>(null)
  const barRef = useRef<HTMLCanvasElement>(null)
  const pieChart = useRef<Chart | null>(null)
  const barChart = useRef<Chart | null>(null)

  const active = projects.filter(p => p.is_active)
  const healthList = active.map(p => ({ proj: p, health: computeProjectHealth(p.id, store) }))

  const totalBudget  = active.reduce((s, p) => s + p.budget, 0)
  const totalSales   = active.reduce((s, p) => s + p.sales,  0)
  const totalActual  = active.reduce((s, p) => s + (_costsDB[p.id] || []).reduce((ss, c) => ss + Number(c.actual_cost || 0), 0), 0)
  const totalCollect = active.reduce((s, p) => s + (_ledgerDB[p.id] || []).filter(e => e.type === 'collection').reduce((ss, e) => ss + Number(e.amount), 0), 0)

  const allRoots = active.flatMap(p => computeRoots(_tasksDB[p.id] || []))
  const tw = allRoots.reduce((s, r) => s + Number(r.weight), 0)
  const overallPct = tw > 0 ? Math.round(allRoots.reduce((s, r) => s + r.actual * Number(r.weight), 0) / tw) : 0

  useEffect(() => {
    if (!pieRef.current || !barRef.current || !active.length) return
    pieChart.current?.destroy()
    barChart.current?.destroy()

    const statusCounts: Record<string, number> = {}
    healthList.forEach(({ health }) => { statusCounts[health.status] = (statusCounts[health.status] || 0) + 1 })
    const pieLabels: Record<string, string> = { 'on-track': 'On Track', 'at-risk': 'At Risk', 'critical': 'Critical' }
    const pieColors: Record<string, string> = { 'on-track': '#16a34a', 'at-risk': '#ea580c',  'critical': '#dc2626' }
    const pieEntries = Object.entries(statusCounts)

    pieChart.current = new Chart(pieRef.current, {
      type: 'doughnut',
      data: {
        labels: pieEntries.map(([k]) => pieLabels[k] || k),
        datasets: [{ data: pieEntries.map(([, v]) => v), backgroundColor: pieEntries.map(([k]) => pieColors[k] || '#94a3b8'), borderWidth: 2, borderColor: 'var(--surface)' }],
      },
      options: { plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } } }, cutout: '60%' },
    })

    const budgetMap = new Map<string, { planned: number; actual: number }>()
    active.forEach(p => {
      ;(_costsDB[p.id] || []).forEach(r => {
        if (!budgetMap.has(r.month)) budgetMap.set(r.month, { planned: 0, actual: 0 })
        budgetMap.get(r.month)!.planned += Number(r.plan_cost || 0)
        budgetMap.get(r.month)!.actual  += Number(r.actual_cost || 0)
      })
    })
    const bLabels = [...budgetMap.keys()].slice(0, 18)
    barChart.current = new Chart(barRef.current, {
      type: 'bar',
      data: {
        labels: bLabels,
        datasets: [
          { label: 'Planned', data: bLabels.map(k => budgetMap.get(k)?.planned ?? 0), backgroundColor: '#3b82f6', borderRadius: 4 },
          { label: 'Actual',  data: bLabels.map(k => budgetMap.get(k)?.actual  ?? 0), backgroundColor: '#22c55e', borderRadius: 4 },
        ],
      },
      options: { plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { callback: v => '$' + fmt(v as number) } } } },
    })

    return () => { pieChart.current?.destroy(); barChart.current?.destroy() }
  }, [projects, _costsDB])

  return (
    <div className="page-content" style={{ padding: 24 }}>
      {/* KPIs */}
      <div className="kpi-grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Active Projects',  value: active.length,           sub: 'In portfolio',    color: 'blue'   },
          { label: 'Total Budget',     value: '$' + fmt(totalBudget),  sub: 'All projects',    color: 'green'  },
          { label: 'Cost to Date',     value: '$' + fmt(totalActual),  sub: `${totalBudget > 0 ? ((totalActual/totalBudget)*100).toFixed(1) : 0}% of budget`, color: 'orange' },
          { label: 'Total Sales',      value: '$' + fmt(totalSales),   sub: 'Contract value',  color: 'blue'   },
        ].map(k => (
          <div key={k.label} className={`kpi-card bl-${k.color}`}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{k.value}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card" style={{ padding: 18 }}>
          <div className="section-title">Project Status Distribution</div>
          <canvas ref={pieRef} height={160} />
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div className="section-title">Portfolio Budget Trend</div>
          <canvas ref={barRef} height={160} />
        </div>
      </div>

      {/* Summary + Health table */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,220px) 1fr', gap: 14 }}>
        <div className="card" style={{ padding: 18 }}>
          <div className="section-title">Portfolio Summary</div>
          {[
            ['Active Projects',  active.length,  '#2563eb'],
            ['Budget Spent',     (totalBudget > 0 ? ((totalActual/totalBudget)*100).toFixed(1) : 0) + '%', '#16a34a'],
            ['Overall Progress', overallPct + '%',              '#ea580c'],
            ['Total Collected',  '$' + fmt(totalCollect),      '#0891b2'],
          ].map(([l, v, c]) => (
            <div key={String(l)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{l}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: String(c) }}>{v}</span>
            </div>
          ))}
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Project Health Overview</div>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Project</th>
                  <th style={{ minWidth: 150 }}>Plan vs Actual</th>
                  <th style={{ minWidth: 120 }}>Budget</th>
                  <th style={{ minWidth: 120 }}>Revenue</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {healthList.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No projects</td></tr>
                )}
                {healthList.map(({ proj, health }, i) => (
                  <tr key={proj.id} onClick={() => { setSelectedProjId(proj.id); setActivePage('schedule') }} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: PROJ_COLORS[i % PROJ_COLORS.length], minWidth: 8, display: 'inline-block' }} />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--blue)', fontSize: 13 }}>{proj.name}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: "'JetBrains Mono',monospace" }}>{proj.code}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="pbar-wrap" style={{ marginBottom: 3 }}>
                        <div className={`pbar-fill ${health.actualPct >= health.planPct ? 'pbar-green' : 'pbar-orange'}`} style={{ width: health.actualPct + '%' }} />
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>A: {health.actualPct}% / P: {health.planPct}%</div>
                    </td>
                    <td>
                      <div className="pbar-wrap" style={{ marginBottom: 3 }}>
                        <div className={`pbar-fill ${health.actualBudget > health.planBudget ? 'pbar-red' : 'pbar-blue'}`} style={{ width: Math.min(100, health.planBudget > 0 ? Math.round(health.actualBudget / health.planBudget * 100) : 0) + '%' }} />
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{health.planBudget > 0 ? Math.round(health.actualBudget / health.planBudget * 100) : 0}%</div>
                    </td>
                    <td>
                      <div className="pbar-wrap" style={{ marginBottom: 3 }}>
                        <div className="pbar-fill pbar-blue" style={{ width: health.revPct + '%' }} />
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{health.revPct}%</div>
                    </td>
                    <td><StatusBadge status={health.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
