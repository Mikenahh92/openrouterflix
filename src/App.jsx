function App() {
  return (
    <div className="min-h-screen bg-surface-base font-sans text-slate-100 animate-fadeIn">
      <div className="max-w-[1440px] mx-auto px-12 py-12">
        <h1 className="text-4xl font-bold mb-6">
          OpenRouterFlix
        </h1>
        <p className="text-sm text-slate-400 mb-8">
          Netflix-style AI model browser — powered by OpenRouter
        </p>

        {/* Token verification demo */}
        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <div className="bg-surface-raised rounded-xl p-4 shadow-glow">
            <p className="text-xs text-slate-500 mb-1">surface-raised</p>
            <p className="text-sm text-slate-100">Raised card</p>
          </div>
          <div className="bg-surface-overlay rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">surface-overlay</p>
            <p className="text-sm text-slate-100">Overlay panel</p>
          </div>
          <div className="bg-surface-sunken rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">surface-sunken</p>
            <p className="text-sm text-slate-100">Sunken area</p>
          </div>
          <div className="rounded-xl p-4 font-mono text-[13px] border border-slate-800">
            <p className="text-xs text-slate-500 mb-1">font-mono</p>
            <p className="text-sm text-slate-100">JetBrains Mono</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
