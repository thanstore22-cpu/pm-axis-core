import useAppStore from '../../store/useAppStore'
import type { PageId } from '../../types'

interface NavItem { id: PageId; label: string; icon: string }

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard',       icon: '▦'  },
  { id: 'schedule',  label: 'Master Schedule', icon: '📋' },
  { id: 'scurve',    label: 'S-Curve',         icon: '📈' },
  { id: 'cashflow',  label: 'Cash Flow',       icon: '💰' },
  { id: 'revenue',   label: 'Revenue',         icon: '📊' },
  { id: 'import',    label: 'Import / Export', icon: '⇄'  },
  { id: 'audit',     label: 'Audit',           icon: '🔍' },
  { id: 'settings',  label: 'Settings',        icon: '⚙'  },
]

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onCollapse: (v: boolean) => void
  onMobileClose: () => void
}

export default function Sidebar({ collapsed, mobileOpen, onCollapse, onMobileClose }: SidebarProps) {
  const { activePage, setActivePage } = useAppStore()

  const handleNav = (id: PageId) => {
    setActivePage(id)
    onMobileClose()
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && <div className="sidebar-backdrop" onClick={onMobileClose} />}

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? '20px 0' : '20px 18px',
          display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '1px solid rgba(255,255,255,.07)',
          minHeight: 64, justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <div style={{
            width: 34, height: 34, minWidth: 34, borderRadius: 9,
            background: 'rgba(37,99,235,.25)', border: '1.5px solid rgba(37,99,235,.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#60a5fa', fontSize: 16, flexShrink: 0,
          }}>⬡</div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>PM AXIS CORE</div>
              <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,.4)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Enterprise Portfolio</div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const isActive = activePage === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                title={collapsed ? item.label : undefined}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  gap: 10, padding: collapsed ? '10px 0' : '10px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 8, marginBottom: 2,
                  background: isActive ? 'rgba(37,99,235,.25)' : 'transparent',
                  border: isActive ? '1px solid rgba(37,99,235,.3)' : '1px solid transparent',
                  color: isActive ? '#93c5fd' : 'rgba(255,255,255,.55)',
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 15, minWidth: 18, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => onCollapse(!collapsed)}
          className="hide-mobile"
          style={{
            margin: 8, padding: 8, borderRadius: 7,
            background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)',
            color: 'rgba(255,255,255,.4)', cursor: 'pointer', fontSize: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontFamily: 'inherit',
          }}
        >
          {collapsed ? '→' : '← Collapse'}
        </button>
      </aside>
    </>
  )
}
