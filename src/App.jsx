import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'
import AppLayout from './shared/layouts/AppLayout'

const DetailPage = lazy(() => import('./detail/components/DetailPage'))

function CatalogPlaceholder() {
  return (
    <div className="max-w-[1440px] mx-auto px-12 py-12">
      <h1 className="text-3xl font-bold mb-4">Model Catalog</h1>
      <p className="text-sm text-slate-400">
        Browse and discover AI models across categories. Coming soon.
      </p>
    </div>
  )
}

function ComparePlaceholder() {
  return (
    <div className="max-w-[1440px] mx-auto px-12 py-12">
      <h1 className="text-3xl font-bold mb-4">Compare Models</h1>
      <p className="text-sm text-slate-400">
        Compare models side by side. Coming soon.
      </p>
    </div>
  )
}

function PlaygroundPlaceholder() {
  return (
    <div className="max-w-[1440px] mx-auto px-12 py-12">
      <h1 className="text-3xl font-bold mb-4">Playground</h1>
      <p className="text-sm text-slate-400">
        Test models live with your own prompts. Coming soon.
      </p>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<CatalogPlaceholder />} />
        <Route
          path="/models/*"
          element={
            <Suspense fallback={<div className="max-w-[1440px] mx-auto px-12 py-12 text-slate-400">Loading…</div>}>
              <DetailPage />
            </Suspense>
          }
        />
        <Route path="/compare" element={<ComparePlaceholder />} />
        <Route path="/playground" element={<PlaygroundPlaceholder />} />
      </Route>
    </Routes>
  )
}
