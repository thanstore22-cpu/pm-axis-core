import { useState } from 'react'
import { signIn } from '../../lib/googleDrive'
import useAppStore from '../../store/useAppStore'
import { toast } from '../ui/Toast'

export default function SignInScreen({ onClose }: { onClose: () => void }) {
  const [choice, setChoice] = useState<'connect' | 'demo' | null>(null)
  const [showCustomId, setShowCustomId] = useState(false)
  const [customId, setCustomId] = useState('')
  const [loading, setLoading] = useState(false)
  const { loadDemoData, setGdConnected, setGdStatus } = useAppStore()

  const handleContinue = async () => {
    if (!choice) return
    if (choice === 'demo') { loadDemoData(); onClose(); return }

    setLoading(true)
    setGdStatus('connecting')
    if (customId.trim()) localStorage.setItem('gd_client_id', customId.trim())

    signIn(
      (user) => {
        setGdConnected(user, null, null)
        toast('Signed in as ' + (user.name || user.email), 'success')
        loadDemoData()
        onClose()
        setLoading(false)
      },
      (err) => {
        toast(err, 'error')
        setGdStatus('idle')
        setLoading(false)
      }
    )
  }

  const OptionCard = ({ id, icon, title, desc }: { id: 'connect'|'demo'; icon: string; title: string; desc: string }) => (
    <div
      onClick={() => setChoice(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', borderRadius: 12, marginBottom: 10,
        border: `1.5px solid ${choice === id ? 'var(--blue)' : 'var(--border)'}`,
        background: choice === id ? 'var(--blue-l)' : 'var(--surface)',
        cursor: 'pointer', transition: 'all .15s',
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 10, background: choice === id ? 'rgba(37,99,235,.15)' : 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, minWidth: 40 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ width: '100%', padding: '40px 24px 32px', background: 'linear-gradient(160deg, var(--navy) 0%, var(--navy3) 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 58, height: 58, borderRadius: 16, background: 'rgba(255,255,255,.1)', border: '1.5px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#93c5fd' }}>⬡</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '.05em' }}>PM AXIS CORE</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 3 }}>Enterprise Portfolio Monitoring</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, width: '100%', maxWidth: 520, padding: '28px 20px' }}>
        <p style={{ fontSize: 13.5, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 20 }}>
          Sign in with Google to load your project data from Drive, or continue with demo data to explore the app.
        </p>

        <OptionCard id="connect" icon="🔵" title="Sign in with Google"
          desc="Connect Google Drive to load your project data. All changes auto-save to a single Excel file." />
        <OptionCard id="demo" icon="🖥️" title="Explore with Demo Data"
          desc="Try the app with sample projects — no account needed. Connect Drive any time from the toolbar." />

        {/* Client ID */}
        {choice === 'connect' && (
          <div style={{ marginBottom: 20 }}>
            {!showCustomId ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'var(--green-l)', border: '1px solid rgba(22,163,74,.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🔒</span>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>OAuth Client ID:</span>
                  <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: 'var(--text2)' }}>Pre-configured</span>
                  <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 10, background: 'var(--green-l)', color: 'var(--green)', fontWeight: 700, border: '1px solid rgba(22,163,74,.3)' }}>✓</span>
                </div>
                <button onClick={() => setShowCustomId(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11.5, color: 'var(--blue)', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' }}>
                  Get one ↗
                </button>
              </div>
            ) : (
              <div>
                <label className="form-label">Custom Google OAuth Client ID</label>
                <input className="form-input" value={customId} onChange={e => setCustomId(e.target.value)}
                  placeholder="xxxxxxxxxx.apps.googleusercontent.com"
                  style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5 }} />
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5, lineHeight: 1.6 }}>
                  In <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>Google Cloud Console</a>: enable <strong>Google Drive API</strong>, create an OAuth 2.0 Web Client.
                </p>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline btn-sm" onClick={() => { loadDemoData(); onClose() }}>Skip for now</button>
          <button className="btn btn-primary btn-sm" disabled={!choice || loading} onClick={handleContinue}>
            {loading ? 'Connecting…' : 'Continue'}
          </button>
        </div>
      </div>

      <p style={{ fontSize: 10.5, color: 'var(--muted2)', padding: 16, textAlign: 'center' }}>
        © 2026 PM Axis Core · Enterprise Construction Portfolio Monitoring
      </p>
    </div>
  )
}
