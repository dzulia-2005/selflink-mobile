import { act, render } from '@testing-library/react-native';
import { useEffect, useRef } from 'react';

import { ToastProvider, useToast } from '@context/ToastContext';

jest.useFakeTimers();

type ToastApi = ReturnType<typeof useToast>;

function ToastHarness({ onReady }: { onReady: (api: ToastApi) => void }) {
  const api = useToast();
  const ready = useRef(false);

  useEffect(() => {
    if (!ready.current) {
      ready.current = true;
      onReady(api);
    }
  }, [api, onReady]);

  return null;
}

describe('ToastContext', () => {
  it('queues toasts and dismisses them manually', () => {
    let ctx: ToastApi | null = null;
    render(
      <ToastProvider>
        <ToastHarness onReady={(api) => (ctx = api)} />
      </ToastProvider>,
    );

    expect(ctx).not.toBeNull();
    const api = ctx as ToastApi;

    act(() => {
      api.push({ message: 'Hello', tone: 'info' });
      api.push({ message: 'World', tone: 'error' });
    });

    expect(api.toasts).toHaveLength(2);

    act(() => {
      api.dismiss(api.toasts[0].id);
    });

    expect(api.toasts).toHaveLength(1);
    expect(api.toasts[0].message).toBe('World');
  });

  it('auto dismisses toasts after duration', () => {
    let ctx: ToastApi | null = null;
    render(
      <ToastProvider>
        <ToastHarness onReady={(api) => (ctx = api)} />
      </ToastProvider>,
    );

    const api = ctx as ToastApi;

    act(() => {
      api.push({ message: 'Ephemeral', tone: 'info', duration: 2000 });
    });

    expect(api.toasts).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(api.toasts).toHaveLength(0);
  });
});
