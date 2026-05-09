import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'
import AppLayout from './shared/layouts/AppLayout'
import CatalogPage from './features/catalog/CatalogPage'
import { ConfigLoader } from './shared/lib/configLoader'

const DetailPage = lazy(() => import('./detail/components/DetailPage'))
const PlaygroundPage = lazy(() => import('./playground/components/PlaygroundPage'))
const HistoryPage = lazy(() => import('./history/components/HistoryPage'))
const ComparisonPage = lazy(() => import('./comparison/components/ComparisonPage'))
const TemplateLibraryPage = lazy(() => import('./templates/components/TemplateLibraryPage'))

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<CatalogPage />} />
        <Route
          path="/models/:id"
          element={
            <Suspense fallback={<div className="max-w-[1440px] mx-auto px-12 py-12 text-slate-400">Loading…</div>}>
              <DetailPage />
            </Suspense>
          }
        />
        <Route
          path="/compare"
          element={
            <Suspense fallback={<div className="max-w-[1440px] mx-auto px-12 py-12 text-slate-400">Loading…</div>}>
              <ConfigLoader>
                <ComparisonPage />
              </ConfigLoader>
            </Suspense>
          }
        />
        <Route
          path="/playground"
          element={
            <Suspense fallback={<div className="max-w-[1440px] mx-auto px-12 py-12 text-slate-400">Loading…</div>}>
              <PlaygroundPage />
            </Suspense>
          }
        />
        <Route
          path="/history"
          element={
            <Suspense fallback={<div className="max-w-[1440px] mx-auto px-12 py-12 text-slate-400">Loading…</div>}>
              <HistoryPage />
            </Suspense>
          }
        />
        <Route
          path="/templates"
          element={
            <Suspense fallback={<div className="max-w-[1440px] mx-auto px-12 py-12 text-slate-400">Loading…</div>}>
              <TemplateLibraryPage />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  )
}
