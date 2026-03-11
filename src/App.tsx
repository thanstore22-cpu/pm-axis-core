import { useState, useEffect } from 'react'
import Sidebar from './components/layout/Sidebar'
import Topbar  from './components/layout/Topbar'
import SignInScreen from './components/layout/SignInScreen'
import { ToastContainer } from './components/ui/Toast'
import Dashboard     from './pages/Dashboard'
import MasterSchedule from './pages/MasterSchedule'
import SCurve        from './pages/SCurve'
import { CashFlow, Revenue, Settings, Audit, ImportExport } from './pages/OtherPages'
import useAppStore from './store/useAppStore'
import type { PageId } from './types'

export default function App() {
  const [showSignIn,  setShowSignIn]  = useState(true)
  const [collapsed,   setCollapsed]   = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const { activePage, loadDemoData, theme, setTheme } = useAppStore()

  // Init theme on mount
  useEffect(() => {
    const saved = (localStorage.getItem('pm_theme') || 'system') as 'light' | 'dark' | 'system'
    setTheme(saved)
  }, [])

  // Auto-skip sign-in if previously dismissed
  useEffect(() => {
    if (localStorage.getItem('pm_axis_signin_skipped')) {
      loadDemoData()
      setShowSignIn(false)
    }
  }, [])

  const handleCloseSignIn = () => {
    localStorage.setItem('pm_axis_signin_skipped', '1')
    setShowSignIn(false)
  }

  const pages: Record<PageId, JSX.Element> = {
    dashboard: <Dashboard />,
    schedule:  <MasterSchedule />,
    scurve:    <SCurve />,
    cashflow:  <CashFlow />,
    revenue:   <Revenue />,
    import:    <ImportExport />,
    audit:     <Audit />,
    settings:  <Settings />,
  }

  return (
    <>
      {showSignIn && <SignInScreen onClose={handleCloseSignIn} />}

      {!showSignIn && (
        <div className="app-shell">
          <Sidebar
            collapsed={collapsed}
            mobileOpen={mobileOpen}
            onCollapse={setCollapsed}
            onMobileClose={() => setMobileOpen(false)}
          />
          <div className={`app-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
            <Topbar onMenuClick={() => setMobileOpen(o => !o)} />
            <main style={{ flex: 1, overflowY: 'auto' }}>
              {pages[activePage] ?? <Dashboard />}
            </main>
          </div>
        </div>
      )}

      <ToastContainer />
    </>
  )
}
