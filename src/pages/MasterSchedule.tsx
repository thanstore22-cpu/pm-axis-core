import { useState } from 'react'
import useAppStore, { fmtDate, computePlan } from '../store/useAppStore'
import { buildTree } from '../lib/computations'
import type { TaskNode } from '../types'

interface RowProps {
  node: TaskNode
  depth: number
  expanded: Set<string>
  toggle: (id: string) => void
}

function TaskRow({ node, depth, expanded, toggle }: RowProps) {
  const isParent = node.children.length > 0
  const planPct  = Math.round(node.planned ?? computePlan(node.start_date, node.end_date))
  const actual   = Math.round(node.actual ?? 0)
  const variance = actual - planPct
  const statusCls = actual >= planPct ? 'badge-green' : actual >= planPct - 10 ? 'badge-orange' : 'badge-red'
  const statusTxt = actual >= planPct ? 'On Track'    : actual >= planPct - 10 ? 'At Risk'      : 'Critical'

  return (
    <>
      <tr style={{ background: isParent ? 'var(--bg)' : 'var(--surface)' }}>
        <td style={{ paddingLeft: 12 + depth * 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isParent
              ? <button onClick={() => toggle(node.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 11, width: 18 }}>{expanded.has(node.id) ? '▼' : '▶'}</button>
              : <span style={{ width: 18, display: 'inline-block' }} />}
            <span style={{ fontSize: 12.5, fontWeight: isParent ? 700 : 500, color: 'var(--text)' }}>{node.name}</span>
          </div>
        </td>
        <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>{node.weight}%</td>
        <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>{planPct}%</td>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, maxWidth: 80 }}>
              <div className="pbar-wrap">
                <div className={`pbar-fill ${actual >= planPct ? 'pbar-green' : 'pbar-orange'}`} style={{ width: actual + '%' }} />
              </div>
            </div>
            <span className="font-mono" style={{ fontSize: 12 }}>{actual}%</span>
          </div>
        </td>
        <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: variance >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
          {variance >= 0 ? '+' : ''}{variance}%
        </td>
        <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(node.start_date)}</td>
        <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(node.end_date)}</td>
        <td style={{ fontSize: 12, whiteSpace: 'nowrap', color: node.actual_close_date ? 'var(--green)' : 'var(--muted)' }}>
          {node.actual_close_date ? fmtDate(node.actual_close_date) : '—'}
        </td>
        <td><span className={`badge ${statusCls}`}>{statusTxt}</span></td>
        <td style={{ fontSize: 12 }}>
          {isParent && (node._issues?.length ?? 0) > 0
            ? <span style={{ color: 'var(--orange)', fontWeight: 600, fontSize: 11 }}>{node._issues!.length} issue{node._issues!.length > 1 ? 's' : ''}</span>
            : <span style={{ color: node.remark ? 'var(--orange)' : 'var(--muted)' }}>{node.remark || '—'}</span>}
        </td>
      </tr>
      {isParent && expanded.has(node.id) && node.children.map(c => (
        <TaskRow key={c.id} node={c} depth={depth + 1} expanded={expanded} toggle={toggle} />
      ))}
    </>
  )
}

export default function MasterSchedule() {
  const { tasks } = useAppStore()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const roots = buildTree(tasks.map(t => ({ ...t, planned: computePlan(t.start_date, t.end_date) })))
  const tw = roots.reduce((s, r) => s + Number(r.weight), 0)
  const planOverall = tw > 0 ? Math.round(roots.reduce((s, r) => s + computePlan(r.start_date, r.end_date) * Number(r.weight), 0) / tw) : 0
  const actOverall  = tw > 0 ? Math.round(roots.reduce((s, r) => s + Number(r.actual) * Number(r.weight), 0) / tw) : 0
  const toggle = (id: string) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div className="page-content" style={{ padding: 24 }}>
      <div className="kpi-grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: 'Plan Progress',   value: planOverall + '%', color: 'blue'   },
          { label: 'Actual Progress', value: actOverall  + '%', color: 'green'  },
          { label: 'Variance',        value: (actOverall - planOverall >= 0 ? '+' : '') + (actOverall - planOverall) + '%', color: actOverall >= planOverall ? 'green' : 'red' },
        ].map(k => (
          <div key={k.label} className={`kpi-card bl-${k.color}`}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: `var(--${k.color})` }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>Work Breakdown</th>
                <th style={{ textAlign: 'right' }}>Weight</th>
                <th style={{ textAlign: 'right' }}>Plan %</th>
                <th style={{ minWidth: 140 }}>Actual %</th>
                <th style={{ textAlign: 'right' }}>Variance</th>
                <th style={{ whiteSpace: 'nowrap' }}>Plan Start</th>
                <th style={{ whiteSpace: 'nowrap' }}>Plan End</th>
                <th style={{ whiteSpace: 'nowrap' }}>Actual Close</th>
                <th>Status</th>
                <th>Issues / Remarks</th>
              </tr>
            </thead>
            <tbody>
              {roots.length === 0
                ? <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No tasks — select a project</td></tr>
                : roots.map(r => <TaskRow key={r.id} node={r} depth={0} expanded={expanded} toggle={toggle} />)
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
