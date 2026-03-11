import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import useAppStore, { fmt, fmtDate, fmtM } from '../store/useAppStore'

Chart.register(...registerables)

// ── Cash Flow ─────────────────────────────────────────────────
export function CashFlow() {
  const store = useAppStore()
  const { costRows, ledgerRows, projects, selectedProjId } = store
  const proj = projects.find(p => p.id === selectedProjId)
  const billRef  = useRef<HTMLCanvasElement>(null)
  const cumRef   = useRef<HTMLCanvasElement>(null)
  const billChart = useRef<Chart | null>(null)
  const cumChart  = useRef<Chart | null>(null)

  const billings    = ledgerRows.filter(e => e.type === 'billing')
  const collections = ledgerRows.filter(e => e.type === 'collection')
  const totalBill   = billings.reduce((s, e)    => s + Number(e.amount), 0)
  const totalCollect= collections.reduce((s, e) => s + Number(e.amount), 0)
  const totalActCost= costRows.reduce((s, r)    => s + Number(r.actual_cost || 0), 0)

  useEffect(() => {
    if (!billRef.current || !cumRef.current) return
    billChart.current?.destroy()
    cumChart.current?.destroy()

    const monthMap = new Map<string, { bill: number; coll: number }>()
    ledgerRows.forEach(e => {
      const d = new Date(e.date)
      const k = `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}-${String(d.getFullYear()).slice(2)}`
      if (!monthMap.has(k)) monthMap.set(k, { bill: 0, coll: 0 })
      if (e.type === 'billing')    monthMap.get(k)!.bill += Number(e.amount)
      if (e.type === 'collection') monthMap.get(k)!.coll += Number(e.amount)
    })
    const labels = [...monthMap.keys()]

    billChart.current = new Chart(billRef.current, {
      type: 'bar',
      data: { labels, datasets: [
        { label: 'Billing',    data: labels.map(k => monthMap.get(k)?.bill ?? 0), backgroundColor: '#3b82f6', borderRadius: 4 },
        { label: 'Collection', data: labels.map(k => monthMap.get(k)?.coll ?? 0), backgroundColor: '#22c55e', borderRadius: 4 },
      ]},
      options: { plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }, scales: { y: { ticks: { callback: v => fmtM(v as number) } } } },
    })

    let cB = 0, cC = 0
    const cumB: number[] = [], cumC: number[] = []
    labels.forEach(k => {
      cB += monthMap.get(k)?.bill ?? 0; cumB.push(cB)
      cC += monthMap.get(k)?.coll ?? 0; cumC.push(cC)
    })
    cumChart.current = new Chart(cumRef.current, {
      type: 'line',
      data: { labels, datasets: [
        { label: 'Cum. Billing',    data: cumB, borderColor: '#3b82f6', tension: .4 },
        { label: 'Cum. Collection', data: cumC, borderColor: '#22c55e', tension: .4 },
      ]},
      options: { plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }, scales: { y: { ticks: { callback: v => fmtM(v as number) } } } },
    })

    return () => { billChart.current?.destroy(); cumChart.current?.destroy() }
  }, [ledgerRows, selectedProjId])

  return (
    <div className="page-content" style={{ padding: 24 }}>
      <div className="kpi-grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: 'Contract Value',    value: '$' + fmt(proj?.sales ?? 0),              color: 'blue'   },
          { label: 'Revenue Received',  value: '$' + fmt(totalCollect),                  color: 'green'  },
          { label: 'Remaining Revenue', value: '$' + fmt((proj?.sales ?? 0) - totalCollect), color: 'orange' },
        ].map(k => (
          <div key={k.label} className={`kpi-card bl-${k.color}`}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: `var(--${k.color})` }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px,300px) 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="section-title">Financial Profile</div>
          {[
            ['Budget (Cost)',     '$' + fmt(proj?.budget ?? 0),             '#2563eb'],
            ['Actual Cost',      '$' + fmt(totalActCost),                   '#dc2626'],
            ['Remaining Budget', '$' + fmt((proj?.budget ?? 0) - totalActCost), '#16a34a'],
            ['Start Date',       fmtDate(proj?.start_date),                 'var(--text)'],
            ['End Date',         fmtDate(proj?.end_date),                   'var(--text)'],
          ].map(([l, v, c]) => (
            <div key={String(l)} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <span className="text-muted">{l}</span>
              <span style={{ fontWeight: 700, color: String(c), fontFamily: "'JetBrains Mono',monospace" }}>{v}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div className="section-title">Monthly Revenue Plan</div>
          <canvas ref={billRef} />
        </div>
      </div>

      <div className="grid-2">
        <div className="card" style={{ padding: 18 }}>
          <div className="section-title">Cumulative Financial Forecast</div>
          <canvas ref={cumRef} />
        </div>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Cash Flow Log</div>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 280 }}>
            <table className="data-table">
              <thead><tr><th>Date</th><th>Type</th><th style={{ textAlign:'right' }}>Amount</th><th>Ref</th></tr></thead>
              <tbody>
                {ledgerRows.length === 0
                  ? <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No entries</td></tr>
                  : ledgerRows.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{fmtDate(e.date)}</td>
                      <td><span className={`badge ${e.type === 'billing' ? 'badge-blue' : 'badge-green'}`}>{e.type}</span></td>
                      <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>${fmt(e.amount)}</td>
                      <td style={{ fontSize: 11, color: 'var(--muted)' }}>{e.ref}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Revenue ───────────────────────────────────────────────────
export function Revenue() {
  const { costRows, updateCostRow } = useAppStore()
  const totalPlan   = costRows.reduce((s, r) => s + Number(r.plan_cost   || 0), 0)
  const totalActual = costRows.reduce((s, r) => s + Number(r.actual_cost || 0), 0)
  const totalVar    = totalActual - totalPlan

  return (
    <div className="page-content" style={{ padding: 24 }}>
      <div className="kpi-grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Planned Cost', value: '$' + fmt(totalPlan),   color: 'blue'   },
          { label: 'Total Actual Cost',  value: '$' + fmt(totalActual), color: 'orange' },
          { label: 'Variance',           value: (totalVar >= 0 ? '+$' : '-$') + fmt(Math.abs(totalVar)), color: totalVar <= 0 ? 'green' : 'red' },
        ].map(k => (
          <div key={k.label} className={`kpi-card bl-${k.color}`}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: `var(--${k.color})` }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Monthly Cost Analysis</div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Month</th>
                <th style={{ textAlign: 'right' }}>Plan Cost</th>
                <th style={{ textAlign: 'right' }}>Actual Cost</th>
                <th style={{ textAlign: 'right' }}>Variance</th>
                <th style={{ textAlign: 'right' }}>Cum. Plan</th>
                <th style={{ textAlign: 'right' }}>Cum. Actual</th>
              </tr>
            </thead>
            <tbody>
              {costRows.length === 0
                ? <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No data</td></tr>
                : (() => {
                    let cumP = 0, cumA = 0
                    return costRows.map(r => {
                      const plan = Number(r.plan_cost   || 0)
                      const act  = Number(r.actual_cost || 0)
                      const vari = act - plan
                      cumP += plan; cumA += act
                      return (
                        <tr key={r.id}>
                          <td className="font-mono" style={{ fontSize: 12 }}>{r.month}</td>
                          <td style={{ textAlign: 'right' }}>
                            <input type="number" defaultValue={plan}
                              onBlur={e => updateCostRow(r.id, 'plan_cost', parseFloat(e.target.value) || 0)}
                              className="inline-edit" />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input type="number" defaultValue={act}
                              onBlur={e => updateCostRow(r.id, 'actual_cost', parseFloat(e.target.value) || 0)}
                              className="inline-edit" />
                          </td>
                          <td style={{ textAlign: 'right', color: vari <= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
                            {vari > 0 ? '+' : ''}{fmt(vari)}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'var(--blue)' }}>{fmt(cumP)}</td>
                          <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'var(--orange)' }}>{fmt(cumA)}</td>
                        </tr>
                      )
                    })
                  })()
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Settings ──────────────────────────────────────────────────
export function Settings() {
  const { projects, gdConnected, gdUser, theme, setTheme } = useAppStore()
  return (
    <div className="page-content" style={{ padding: 24, maxWidth: 720 }}>
      <div className="card" style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Appearance</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['light','dark','system'] as const).map(t => (
            <button key={t} onClick={() => setTheme(t)} className={`btn btn-sm ${theme === t ? 'btn-primary' : 'btn-outline'}`}>
              {t === 'light' ? '☀ Light' : t === 'dark' ? '🌙 Dark' : '💻 System'}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Google Drive</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: gdConnected ? 'var(--green-l)' : 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            {gdConnected ? '✓' : '☁'}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{gdConnected ? 'Connected' : 'Not connected'}</div>
            {gdUser?.email && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{gdUser.email}</div>}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Projects ({projects.length})</div>
        {projects.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: ['#2563eb','#16a34a','#ea580c'][i % 3], minWidth: 8, display: 'inline-block' }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.code} · Budget: ${fmt(p.budget)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Audit ─────────────────────────────────────────────────────
export function Audit() {
  return (
    <div className="page-content" style={{ padding: 24 }}>
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>Audit & Approvals</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Audit trail and approval workflows coming soon.</div>
      </div>
    </div>
  )
}

// ── Import / Export ───────────────────────────────────────────
export function ImportExport() {
  return (
    <div className="page-content" style={{ padding: 24 }}>
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⇄</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>Import / Export</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Excel import/export functionality coming soon.</div>
      </div>
    </div>
  )
}
