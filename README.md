# PM AXIS CORE v2 — React + TypeScript

Enterprise Construction Portfolio Monitoring Dashboard

## Stack
- **React 18** + **Vite 5** + **TypeScript**
- **Zustand** — global state (typed)
- **Chart.js 4** — S-Curve, bar, pie charts
- **Google Drive API** — auto-save to Excel
- **Dark mode** — light / dark / system
- **Mobile responsive** — sidebar overlay on mobile

---

## Quick Start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run type-check # TypeScript check without build
```

---

## Project Structure

```
src/
├── types/
│   └── index.ts           ← All TypeScript interfaces
├── store/
│   └── useAppStore.ts     ← Zustand store (typed) + demo data
├── lib/
│   ├── computations.ts    ← buildTree, computeRoots, computeProjectHealth, buildSCurveData
│   └── googleDrive.ts     ← Google OAuth + Drive API
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx    ← Nav + mobile overlay + collapse
│   │   ├── Topbar.tsx     ← Header + project selector + theme toggle
│   │   └── SignInScreen.tsx
│   └── ui/
│       └── Toast.tsx      ← Toast notifications + Modal
├── pages/
│   ├── Dashboard.tsx
│   ├── MasterSchedule.tsx
│   ├── SCurve.tsx
│   └── OtherPages.tsx     ← CashFlow, Revenue, Settings, Audit, Import
├── index.css              ← Design tokens + light/dark themes + responsive
├── mobile.css             ← Mobile breakpoint helpers
└── App.tsx                ← Shell + routing + theme init
```

---

## Deploy to Vercel

### Method 1: Vercel CLI (fastest)
```bash
npm install -g vercel
vercel login
vercel          # follow prompts
# → deploys instantly, get URL
```

### Method 2: GitHub + Vercel (recommended for teams)
```bash
# 1. Push to GitHub
git init && git add . && git commit -m "init"
git remote add origin https://github.com/YOUR_USERNAME/pm-axis-core.git
git push -u origin main

# 2. Go to vercel.com → Import project → select repo
# Framework: Vite  |  Build: npm run build  |  Output: dist
```

### Vercel settings
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

`vercel.json` is already configured for SPA routing.

---

## Google OAuth Setup

1. [Google Cloud Console](https://console.cloud.google.com) → Create project
2. Enable **Google Drive API**
3. APIs & Services → Credentials → Create **OAuth 2.0 Client ID** → Web application
4. Add to **Authorised JavaScript Origins:**
   ```
   https://your-app.vercel.app
   http://localhost:5173
   ```
5. **OAuth consent screen** → Publishing status → **PUBLISH APP**
   - (Removes 100-user test limit — anyone can sign in)

---

## Dark Mode

Toggle via topbar button (☀ / 🌙 / 💻) or Settings page.
- Persists to `localStorage`
- Respects `prefers-color-scheme` in system mode
- All CSS uses `[data-theme="dark"]` variables

---

## Mobile

- Sidebar becomes fullscreen overlay (hamburger menu in topbar)
- KPI grids collapse from 4-col → 2-col → 1-col
- Tables are horizontally scrollable
- Tested at 375px (iPhone SE) upward

---

## Adding a New Page

1. Create `src/pages/NewPage.tsx`
2. Add `PageId` to `src/types/index.ts`
3. Add to `NAV_ITEMS` in `Sidebar.tsx`
4. Add to `pages` map in `App.tsx`
