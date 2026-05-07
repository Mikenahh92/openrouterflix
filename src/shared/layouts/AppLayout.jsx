import { NavLink, Outlet } from 'react-router'
import CompareBar from '../components/CompareBar.jsx'

const navLinks = [
  { to: '/', label: 'Catalog' },
  { to: '/compare', label: 'Compare' },
  { to: '/playground', label: 'Playground' },
]

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-surface-base font-sans text-slate-100 animate-fadeIn flex flex-col">
      {/* Header — 64px height per Style Guide, sunken background */}
      <header className="h-16 bg-surface-sunken flex items-center justify-between px-12 shrink-0 border-b border-slate-800/50">
        <span className="text-xl font-bold tracking-tight">
          OpenRouterFlix
        </span>
        <nav className="flex items-center gap-6">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-violet-400' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Main content area */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Floating compare bar — visible when 2+ models selected */}
      <CompareBar />
    </div>
  )
}
