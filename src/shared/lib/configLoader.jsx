/**
 * ConfigLoader — parses ?config= base64 query param on /compare route.
 *
 * When a ?config= param is present, decodes it and applies the preset
 * to the URL as ?ids= for the existing useComparison hook to pick up.
 *
 * This keeps the comparison page decoupled from the sharing mechanism —
 * useComparison still reads ?ids= as its source of truth.
 */
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { decodePresetFromBase64 } from './exportUtils';

/**
 * ConfigLoader wraps children and handles ?config= base64 param.
 * On mount, if ?config= is present and valid, it redirects to ?ids= format.
 * Invalid config is silently ignored (no toast — the comparison page shows its empty state).
 *
 * @param {{ children: React.ReactNode }} props
 */
export function ConfigLoader({ children }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;

    const configParam = searchParams.get('config');
    if (!configParam) return;

    applied.current = true;

    const preset = decodePresetFromBase64(configParam);
    if (!preset || !Array.isArray(preset.ids) || preset.ids.length < 2) {
      // Invalid config — remove it and let the page render normally
      searchParams.delete('config');
      setSearchParams(searchParams, { replace: true });
      return;
    }

    // Apply the preset: set ?ids= and remove ?config=
    searchParams.delete('config');
    searchParams.set('ids', preset.ids.join(','));
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  return children;
}
