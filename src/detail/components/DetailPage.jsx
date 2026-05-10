/**
 * DetailPage — Route-level component for /models/*
 *
 * Displays full model specifications: hero section, stats grid,
 * pricing/details two-column layout, modalities badges.
 * Includes loading skeleton and error state with retry.
 *
 * Uses the splat (*) route param to support model IDs containing
 * slashes (e.g. "openai/gpt-4o").
 */
import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import {
  Star,
  Zap,
  Ruler,
  ArrowUpFromLine,
  AlertTriangle,
} from 'lucide-react';
import useModelDetail from '../hooks/useModelDetail';
import { useStore } from '../../shared/lib/store.js';

/* ─── Helpers ──────────────────────────────────────────────────────── */

/** Format token count: show as K if >= 1000 */
function formatTokens(value) {
  if (value == null) return null;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return `${value}`;
}

/** Format price per 1M tokens */
function formatPrice(value) {
  if (value == null) return null;
  return `$${value.toFixed(2)}`;
}

/** Format ISO date string to short human-readable */
function formatDate(isoString) {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return null;
  }
}

/** Fallback display for null values */
function Fallback({ value }) {
  if (value == null) return <span className="text-slate-500">—</span>;
  return value;
}

/* ─── Skeleton ─────────────────────────────────────────────────────── */

function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse bg-slate-700/50 rounded ${className}`} />;
}

function DetailSkeleton() {
  return (
    <div className="max-w-[1440px] mx-auto px-12 py-8 animate-fadeIn" data-testid="detail-skeleton">
      {/* Back */}
      <SkeletonBlock className="h-4 w-36 mb-6" />

      {/* Hero */}
      <div className="bg-surface-raised rounded-xl p-8 border border-slate-800 mb-6">
        <SkeletonBlock className="h-5 w-24 mb-3 rounded-full" />
        <SkeletonBlock className="h-10 w-80 mb-3" />
        <SkeletonBlock className="h-4 w-full max-w-lg mb-2" />
        <SkeletonBlock className="h-4 w-64 mb-4" />
        <div className="flex gap-2 mb-6">
          <SkeletonBlock className="h-6 w-16 rounded-full" />
          <SkeletonBlock className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex gap-3">
          <SkeletonBlock className="h-11 w-40 rounded-lg" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface-raised rounded-xl p-6 border border-slate-800 text-center">
            <SkeletonBlock className="w-5 h-5 rounded mx-auto mb-2" />
            <SkeletonBlock className="h-8 w-16 mx-auto mb-1" />
            <SkeletonBlock className="h-3 w-20 mx-auto" />
          </div>
        ))}
      </div>

      {/* Two-column */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-surface-raised rounded-xl p-6 border border-slate-800">
            <SkeletonBlock className="h-6 w-24 mb-4" />
            <SkeletonBlock className="h-4 w-full mb-3" />
            <SkeletonBlock className="h-4 w-full mb-3" />
            <SkeletonBlock className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Error Panel ──────────────────────────────────────────────────── */

function ErrorPanel({ error, onRetry }) {
  const isNotFound = typeof error === 'string' && error.toLowerCase().includes('not found');

  return (
    <div className="max-w-md mx-auto text-center py-20" role="alert" data-testid="error-panel">
      <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
      <h2 className="text-slate-100 text-lg mb-2">
        {isNotFound ? 'Model not found' : 'Failed to load model details'}
      </h2>
      <p className="text-slate-400 text-sm mb-6">
        {isNotFound
          ? "The model you're looking for doesn't exist or has been removed."
          : error}
      </p>
      {isNotFound ? (
        <Link
          to="/"
          className="inline-block bg-violet-500 hover:bg-violet-400 text-white rounded-lg px-6 py-2 text-sm font-semibold transition-colors"
        >
          Back to Catalog
        </Link>
      ) : (
        <button
          onClick={onRetry}
          className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg px-6 py-2 text-sm font-semibold transition-colors cursor-pointer"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/* ─── Stats Card ───────────────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, formatted }) {
  const isNull = value == null;
  return (
    <div className="bg-surface-raised rounded-xl p-6 border border-slate-800 text-center">
      <Icon className="w-5 h-5 text-violet-400 mx-auto mb-2" />
      <div className={`text-3xl font-bold ${isNull ? 'text-slate-500' : 'text-slate-100'}`}>
        {isNull ? '—' : formatted}
      </div>
      <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}

/* ─── DetailPage ───────────────────────────────────────────────────── */

export default function DetailPage() {
  // Use splat (*) param to capture model IDs that contain slashes (e.g. "openai/gpt-4o")
  const { '*': id } = useParams();
  const navigate = useNavigate();
  const { model, loading, error, fetchModel } = useModelDetail(id);

  // Loading state
  if (loading && !model) {
    return <DetailSkeleton />;
  }

  // Error state
  if (error && !model) {
    return (
      <div className="max-w-[1440px] mx-auto px-12 py-8">
        <ErrorPanel error={error} onRetry={() => fetchModel(id)} />
      </div>
    );
  }

  // No model
  if (!model) {
    return <DetailSkeleton />;
  }

  const displayName = model.name || model.id;
  const isFree = model.pricing?.prompt === 0 && model.pricing?.completion === 0;
  const hasPricing = model.pricing?.prompt != null || model.pricing?.completion != null;

  // Compute pricing percentile from catalog models
  const catalogModels = useStore((s) => s.catalog?.models ?? []);
  const pricePercentile = useMemo(() => {
    if (isFree || !hasPricing || catalogModels.length === 0) return null;
    const currentPrice = model.pricing?.prompt;
    if (currentPrice == null) return null;
    const prices = catalogModels
      .map((m) => m.pricing?.prompt)
      .filter((p) => p != null && p > 0);
    if (prices.length === 0) return null;
    const lowerCount = prices.filter((p) => p < currentPrice).length;
    return Math.round((lowerCount / prices.length) * 100);
  }, [catalogModels, model.pricing?.prompt, isFree, hasPricing]);

  return (
    <div className="max-w-[1440px] mx-auto px-12 py-8 animate-fadeIn">
      {/* Back Navigation */}
      <button
        onClick={() => navigate(-1)}
        className="text-slate-400 hover:text-white text-sm font-medium mb-6 inline-flex items-center gap-1 transition-colors cursor-pointer"
      >
        ← Back to Catalog
      </button>

      {/* Hero Section */}
      <section className="bg-surface-raised rounded-xl p-8 border border-slate-800 mb-6">
        {/* Provider Badge */}
        {model.provider && (
          <span className="inline-block bg-cyan-500/10 text-cyan-400 rounded-full text-xs px-2 py-0.5 mb-3">
            {model.provider}
          </span>
        )}

        {/* Archived Badge */}
        {model.archived && (
          <span className="inline-block bg-red-500/10 text-red-400 rounded-full text-xs px-2 py-0.5 mb-3 ml-2">
            Archived
          </span>
        )}

        {/* Model Name */}
        <h1 className="text-4xl font-bold text-slate-100" data-testid="model-name">
          {displayName}
        </h1>

        {/* Description */}
        {model.description && (
          <p className="text-sm text-slate-400 mt-2 max-w-2xl">
            {model.description}
          </p>
        )}

        {/* Category Pills */}
        {model.categories?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {model.categories.map((cat) => (
              <span
                key={cat}
                className="bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full text-xs px-2 py-0.5"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-3 mt-6">
          <Link
            to={`/playground?model=${encodeURIComponent(model.id)}`}
            className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg px-6 py-3 text-sm font-semibold transition-colors inline-flex items-center"
            data-testid="try-model-cta"
          >
            Try this Model
          </Link>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-4 md:grid-cols-2 gap-4 mb-6">
        <StatCard
          icon={Star}
          label="Quality Score"
          value={model.qualityScore}
          formatted={model.qualityScore != null ? `${model.qualityScore}/5` : null}
        />
        <StatCard
          icon={Zap}
          label="Avg. Latency"
          value={model.latency}
          formatted={model.latency != null ? `${model.latency}ms` : null}
        />
        <StatCard
          icon={Ruler}
          label="Context Window"
          value={model.contextWindow}
          formatted={model.contextWindow != null ? `${formatTokens(model.contextWindow)} tokens` : null}
        />
        <StatCard
          icon={ArrowUpFromLine}
          label="Max Output"
          value={model.maxOutput}
          formatted={model.maxOutput != null ? `${formatTokens(model.maxOutput)} tokens` : null}
        />
      </section>

      {/* Pricing + Details Two-Column */}
      <section className="grid grid-cols-2 md:grid-cols-1 gap-6 mb-6">
        {/* Pricing Card */}
        <div className="bg-surface-raised rounded-xl p-6 border border-slate-800">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Pricing</h2>
          {isFree ? (
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/10 text-emerald-400 rounded-full text-sm px-3 py-1 font-semibold">
                Free
              </span>
            </div>
          ) : hasPricing ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Input (per 1M tokens)</span>
                <span className="text-amber-400 font-mono">
                  <Fallback value={formatPrice(model.pricing.prompt)} />
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Output (per 1M tokens)</span>
                <span className="text-amber-400 font-mono">
                  <Fallback value={formatPrice(model.pricing.completion)} />
                </span>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Pricing not available</p>
          )}

          {/* Pricing Percentile Bar */}
          {isFree && (
            <div className="mt-4 pt-3 border-t border-slate-800" aria-hidden="true">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-emerald-400 font-medium">Free — cheapest tier</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-surface-base">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: '0%' }} />
              </div>
            </div>
          )}
          {!isFree && pricePercentile != null && (
            <div className="mt-4 pt-3 border-t border-slate-800" aria-hidden="true">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400">
                  {pricePercentile === 0
                    ? 'Among the cheapest models'
                    : pricePercentile === 100
                      ? 'Most expensive model'
                      : `More expensive than ${pricePercentile}% of models`}
                </span>
                <span className="text-slate-500">{pricePercentile}th percentile</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-surface-base">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.max(pricePercentile, 2)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Details Card */}
        <div className="bg-surface-raised rounded-xl p-6 border border-slate-800">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Details</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Provider</span>
              <span className="text-slate-100">
                <Fallback value={model.provider} />
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Parameters</span>
              <span className="text-slate-100">
                <Fallback value={model.parameters} />
              </span>
            </div>
            {model.created && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Added</span>
                <span className="text-slate-100">
                  {formatDate(model.created)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Model ID</span>
              <span className="text-violet-400 font-mono text-[13px]">
                {model.id}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Modalities Section */}
      {model.modalities?.length > 0 && (
        <section className="bg-surface-raised rounded-xl p-6 border border-slate-800 mb-6">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Supported Modalities</h2>
          <div className="flex flex-wrap gap-2">
            {model.modalities.map((mod) => (
              <span
                key={mod}
                className="bg-cyan-500/10 text-cyan-400 rounded-full text-xs px-3 py-1"
              >
                {mod}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
