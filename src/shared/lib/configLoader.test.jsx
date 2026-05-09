import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router';
import { ConfigLoader } from './configLoader';

// ── Helper ────────────────────────────────────────────────────────

function encodePresetForURL(preset) {
  const json = JSON.stringify(preset);
  return btoa(unescape(encodeURIComponent(json)));
}

// Child component that reads URL params via react-router's useSearchParams
function ParamReader() {
  const [searchParams] = useSearchParams();
  const idsParam = searchParams.get('ids');
  const configParam = searchParams.get('config');
  return (
    <div>
      <span data-testid="ids-param">{idsParam || 'none'}</span>
      <span data-testid="config-param">{configParam || 'none'}</span>
    </div>
  );
}

// ── Tests ─────────────────────────────────────────────────────────

describe('ConfigLoader', () => {
  // TC-I02: Valid ?config= param redirects to ?ids= format
  it('TC-I02: valid ?config= base64 param redirects to ?ids= format', async () => {
    const preset = { ids: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'], prompt: 'test' };
    const encoded = encodePresetForURL(preset);

    render(
      <MemoryRouter initialEntries={[`/compare?config=${encoded}`]}>
        <ConfigLoader>
          <ParamReader />
        </ConfigLoader>
      </MemoryRouter>
    );

    // After ConfigLoader processes, ?config= should be removed and ?ids= should be set
    await waitFor(() => {
      expect(screen.getByTestId('ids-param')).toHaveTextContent('openai/gpt-4o,anthropic/claude-3.5-sonnet');
      expect(screen.getByTestId('config-param')).toHaveTextContent('none');
    });
  });

  // Invalid ?config= param is silently removed
  it('removes invalid ?config= param without setting ?ids=', async () => {
    const invalidEncoded = btoa('not valid json');

    render(
      <MemoryRouter initialEntries={[`/compare?config=${invalidEncoded}`]}>
        <ConfigLoader>
          <ParamReader />
        </ConfigLoader>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('config-param')).toHaveTextContent('none');
    });
    // No ids param should be set for invalid config
    expect(screen.getByTestId('ids-param')).toHaveTextContent('none');
  });

  // No ?config= param — children render normally
  it('passes through children when no ?config= param present', () => {
    render(
      <MemoryRouter initialEntries={['/compare?ids=a,b']}>
        <ConfigLoader>
          <ParamReader />
        </ConfigLoader>
      </MemoryRouter>
    );

    expect(screen.getByTestId('ids-param')).toHaveTextContent('a,b');
  });

  // ?config= with fewer than 2 IDs is treated as invalid
  it('treats ?config= with 1 ID as invalid and removes it', async () => {
    const preset = { ids: ['only-one'] };
    const encoded = encodePresetForURL(preset);

    render(
      <MemoryRouter initialEntries={[`/compare?config=${encoded}`]}>
        <ConfigLoader>
          <ParamReader />
        </ConfigLoader>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('config-param')).toHaveTextContent('none');
    });
    // Should NOT set ids for < 2 IDs
    expect(screen.getByTestId('ids-param')).toHaveTextContent('none');
  });

  // Valid ?config= preserves prompt in URL conversion
  it('sets ?ids= from valid ?config= with prompt', async () => {
    const preset = { ids: ['model-a', 'model-b', 'model-c'], prompt: 'Compare these models' };
    const encoded = encodePresetForURL(preset);

    render(
      <MemoryRouter initialEntries={[`/compare?config=${encoded}`]}>
        <ConfigLoader>
          <ParamReader />
        </ConfigLoader>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('ids-param')).toHaveTextContent('model-a,model-b,model-c');
      expect(screen.getByTestId('config-param')).toHaveTextContent('none');
    });
  });
});
