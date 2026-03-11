import { useState } from 'react'
import useAppStore, { PROJ_COLORS } from '../../store/useAppStore'
import type { Theme } from '../../types'

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Executive Dashboard',
  schedule:  'Master Schedule',
  scurve:    'S-Curve Analysis',
  cashflow:  'Cash Flow',
  revenue:   'Revenue Management',
  import:    'Import / Export',
  audit:     'Audit & Approvals',
  settings:  'Settings',
}

const PAGES_WITH_SELECTOR = new Set(['schedule','scurve','cashflow','revenue'])

interface TopbarProps {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const [ddOpen, setDdOpen] = useState(false)
  const { activePage, projects, selectedProjId, setSelectedProjId, gdConnected, gdStatus, gdUser, theme, setTheme } = useAppStore()

  const proj = projects.find(p => p.id === selectedProjId)
  const showSelector = PAGES_WITH_SELECTOR.has(activePage) && !!proj
  const gdLabel = gdStatus === 'saving' ? 'Saving…' : gdConnected ? (gdUser?.name || 'Connected') : 'Connect Drive'
  const gdDotClass = gdStatus === 'saving' ? 'blue' : gdConnected ? 'green' : ''

  const THEME_ICONS: Record<Theme, string> = { light: '☀', dark: '🌙', system: '💻' }
  const nextTheme: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' }

  return (
    <header className="topbar">
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        {/* Mobile hamburger */}
        <button
          className="btn btn-ghost btn-icon show-mobile"
          onClick={onMenuClick}
          style={{ flexShrink: 0 }}
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <h1 className="ellipsis" style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>
          {PAGE_TITLES[activePage]}
        </h1>

        {/* Project selector */}
        {showSelector && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setDdOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 10px', borderRadius: 7,
                border: `1.5px solid ${ddOpen ? 'var(--blue)' : 'var(--border2)'}`,
                background: 'var(--surface)', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 600, color: 'var(--text)', fontFamily: 'inherit',
                maxWidth: 260,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: PROJ_COLORS[projects.indexOf(proj!) % PROJ_COLORS.length], minWidth: 8, display: 'inline-block' }} />
              <span className="ellipsis">{proj!.code} — {proj!.name}</span>
              <span style={{ color: 'var(--muted)', fontSize: 10, flexShrink: 0 }}>{ddOpen ? '▲' : '▼'}</span>
            </button>

            {ddOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 48 }} onClick={() => setDdOpen(false)} />
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 4,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 10, boxShadow: 'var(--shadow-lg)',
                  minWidth: 260, zIndex: 49, overflow: 'hidden',
                }}>
                  {projects.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProjId(p.id); setDdOpen(false) }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px',
                        background: p.id === selectedProjId ? 'var(--blue-l)' : 'transparent',
                        border: 'none', cursor: 'pointer',
                        color: p.id === selectedProjId ? 'var(--blue)' : 'var(--text)',
                        fontFamily: 'inherit', textAlign: 'left',
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: PROJ_COLORS[i % PROJ_COLORS.length], minWidth: 8, display: 'inline-block' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 12.5 }}>{p.code}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{p.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {/* Theme toggle */}
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => setTheme(nextTheme[theme])}
          title={`Theme: ${theme}`}
          style={{ fontSize: 14 }}
        >
          {THEME_ICONS[theme]}
        </button>

        {/* GDrive */}
        <div className={`gdrive-bar ${gdConnected ? 'connected' : ''} ${gdStatus === 'saving' ? 'saving' : ''}`}>
          <span className={`gdrive-dot ${gdDotClass}`} />
          <span className="hide-mobile" style={{ fontSize: 11.5 }}>{gdLabel}</span>
        </div>
      </div>
    </header>
  )
}
