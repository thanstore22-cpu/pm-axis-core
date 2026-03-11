import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import useAppStore from '../store/useAppStore'
import { buildSCurveData, computeRoots } from '../lib/computations'
import type { PmisStatus } from '../types'

Chart.register(...registerables)

interface PmisCell { label: string; sub: string; thai: string; key: PmisStatus }

const MATRIX: PmisCell[] = [
  { label: 'Good',       sub: '≥0.9/≥0.9', thai: 'ตามแผน',    key: 'good'      },
  { label: 'Risk',       sub: '≥0.9/<0.9', thai: 'เริ่มแย่ลง', key: 'risk'      },
  { label: 'Recovering', sub: '<0.9/≥0.9', thai: 'กำลังเร่ง',  key: 'recovering'},
  { label: 'Critical',   sub: '<0.9/<0.9', thai: 'ล่าช้า+แย่', key: 'critical'  },
]

export default function SCurve() {
  const { tasks, selectedProjId } = useAppStore()
  const cumRef = useRef<HTMLCanvasElement>(null)
  const monRef = useRef<HTMLCanvasElement>(null)
  const cumChart = useRef<Chart | null>(null)
  const monChart = useRef<Chart | null>(null)

  const { labels, cumPlan, cumActual, forecast, mPlan, mAct } = buildSCurveData(tasks)

  const lastPlan   = cumPlan.filter(v => v !== null).pop() ?? 0
  const lastActual = (cumActual.filter((v): v is number => v !== null)).pop() ?? 0
  const spiOverall = lastPlan > 0 ? +(lastActual / lastPlan).toFixed(2) : 1.00

  const actMonths  = mAct.filter((v): v is number => v !== null)
  const planMonths = mPlan.slice(0, actMonths.length)
  const lastMP = planMonths[planMonths.length - 1] ?? 0
  const lastMA = actMonths[actMonths.length - 1]   ?? 0
  const spiMonth = lastMP > 0 ? +(lastMA / lastMP).toFixed(2) : 1.00

  const variance = +(lastActual - lastPlan).toFixed(1)
  const gain     = +(lastMA - lastMP).toFixed(1)

  type TrendInfo = { label: string; color: string; thai: string; key: PmisStatus }
  const trend: TrendInfo = spiOverall >= 0.9 && spiMonth >= 0.9
    ? { label: 'Good',       color: '#16a34a', thai: 'ดำเนินการตามแผน · ไม่มีความล่าช้า',     key: 'good'       }
    : spiOverall >= 0.9 && spiMonth < 0.9
    ? { label: 'Risk',       color: '#ca8a04', thai: 'เคยดีแต่กำลังแย่ลง · ควรเฝ้าระวัง',    key: 'risk'       }
    : spiOverall < 0.9 && spiMonth >= 0.9
    ? { label: 'Recovering', color: '#2563eb', thai: 'ล่าช้าแต่กำลังเร่งงาน · มีแนวโน้มดีขึ้น', key: 'recovering' }
    : { label: 'Critical',   color: '#dc2626', thai: 'ล่าช้าและยังแย่ลงเรื่อยๆ · ต้องแก้ไขเร่งด่วน', key: 'critical' }

  const physLabel = spiOverall >= 0.95 ? 'On Plan' : spiOverall >= 0.85 ? '↓ At Risk' : '↓↓ Behind Plan'
  const physColor = spiOverall >= 0.95 ? '#16a34a' : spiOverall >= 0.85 ? '#ea580c' : '#dc2626'

  const alphaBg     = `rgba(${trend.color === '#16a34a' ? '22,163,74' : trend.color === '#dc2626' ? '220,38,38' : trend.color === '#ca8a04' ? '202,138,4' : '37,99,235'},.06)`
  const alphaBorder = `rgba(${trend.color === '#16a34a' ? '22,163,74' : trend.color === '#dc2626' ? '220,38,38' : trend.color === '#ca8a04' ? '202,138,4' : '37,99,235'},.2)`

  const roots = computeRoots(tasks)
  const tw    = roots.reduce((s, r) => s + Number(r.weight), 0)

  useEffect(() => {
    if (!cumRef.current || !monRef.current || !labels.length) return
    cumChart.current?.destroy()
    monChart.current?.destroy()

    cumChart.current = new Chart(cumRef.current, {
      type: 'line',
      data: { labels, datasets: [
        { label: 'Planned',  data: cumPlan,   borderColor: '#93c5fd', backgroundColor: 'rgba(147,197,253,.12)', fill: true, tension: .4, pointRadius: 2 },
        { label: 'Actual',   data: cumActual, borderColor: '#fb923c', borderWidth: 2, tension: .4, pointRadius: 3, spanGaps: true },
        { label: 'Forecast', data: forecast,  borderColor: '#fbbf24', borderDash: [5,4], tension: .4, pointRadius: 2, spanGaps: true },
      ]},
      options: { plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { min: 0, max: 100, ticks: { callback: v => v + '%' } } } },
    })

    monChart.current = new Chart(monRef.current, {
      type: 'bar',
      data: { labels, datasets: [
        { label: 'Planned', data: mPlan, backgroundColor: '#3b82f6', borderRadius: 3 },
        { label: 'Actual',  data: mAct,  backgroundColor: '#22c55e', borderRadius: 3 },
      ]},
      options: { plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { callback: v => v + '%' } } } },
    })

    return () => { cumChart.current?.destroy(); monChart.current?.destroy() }
  }, [tasks, selectedProjId])

  return (
    <div className="page-content" style={{ padding: 24 }}>
      {/* KPIs */}
      <div className="kpi-grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: 'SPI Overall',    value: spiOverall.toFixed(2), color: spiOverall >= 0.9 ? 'green' : spiOverall >= 0.8 ? 'orange' : 'red' },
          { label: 'SPI This Month', value: spiMonth.toFixed(2),   color: spiMonth  >= 0.9 ? 'green' : spiMonth  >= 0.8 ? 'orange' : 'red' },
          { label: 'Plan Progress',  value: lastPlan.toFixed(1) + '%',   color: 'blue'   },
          { label: 'Actual Progress',value: lastActual.toFixed(1) + '%', color: 'orange' },
        ].map(k => (
          <div key={k.label} className={`kpi-card bl-${k.color}`}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: `var(--${k.color})` }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Health + Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,300px) 1fr', gap: 16, marginBottom: 16 }}>
        {/* Health box */}
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="section-title">Health Analysis Review</div>
          <div style={{ borderRadius: 10, padding: '14px 16px', border: `1.5px solid ${alphaBorder}`, background: alphaBg }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: trend.color, textTransform: 'uppercase', letterSpacing: '.05em' }}>Physical Trend Alert</div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: trend.color, color: '#fff' }}>{trend.label}</span>
            </div>

            {/* Physical status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${alphaBorder}` }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>กายภาพ (PHYSICAL)</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: physColor }}>{physLabel}</span>
            </div>

            {/* SPI grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${alphaBorder}` }}>
              {[
                { label: 'SPI Overall', val: spiOverall, sub: `ตามหลัง ${Math.abs(variance).toFixed(1)}%` },
                { label: 'SPI Month',   val: spiMonth,   sub: `${gain >= 0 ? '+' : ''}${gain.toFixed(1)}% เดือนนี้` },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: item.val >= 0.9 ? '#16a34a' : item.val >= 0.8 ? '#ea580c' : '#dc2626' }}>{item.val.toFixed(2)}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{item.sub}</div>
                </div>
              ))}
            </div>

            {/* PMIS Matrix */}
            <div className="section-title" style={{ marginBottom: 6 }}>PMIS Rate Matrix</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {MATRIX.map(cell => (
                <div key={cell.key} style={{
                  padding: '7px 10px', borderRadius: 7,
                  border: cell.key === trend.key ? `2px solid ${trend.color}` : '1.5px solid var(--border)',
                  background: cell.key === trend.key ? alphaBg : 'var(--bg)',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: cell.key === trend.key ? trend.color : 'var(--text2)' }}>{cell.label}</div>
                  <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--muted)' }}>{cell.sub}</div>
                  <div style={{ fontSize: 9.5, color: cell.key === trend.key ? trend.color : 'var(--muted)' }}>{cell.thai}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: trend.color, textAlign: 'center', padding: '8px 0 0', borderTop: `1px solid ${alphaBorder}`, marginTop: 8 }}>{trend.thai}</div>
          </div>

          {/* Work packages */}
          {roots.length > 0 && (
            <div>
              <div className="section-title">Work Package Weights</div>
              {roots.map(r => {
                const wpct = tw > 0 ? Math.round(Number(r.weight) / tw * 100) : 0
                return (
                  <div key={r.id} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{r.name}</span>
                      <span className="font-mono text-muted" style={{ fontSize: 11 }}>{r.actual.toFixed(1)}% / wt {wpct}%</span>
                    </div>
                    <div className="pbar-wrap"><div className="pbar-fill pbar-blue" style={{ width: r.actual + '%' }} /></div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ padding: 18, flex: 1 }}>
            <div className="section-title">Cumulative Physical S-Curve (%)</div>
            <canvas ref={cumRef} />
          </div>
          <div className="card" style={{ padding: 18, flex: 1 }}>
            <div className="section-title">Physical Progress History</div>
            <canvas ref={monRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
