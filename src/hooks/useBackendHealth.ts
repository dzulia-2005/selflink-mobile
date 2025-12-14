import { useCallback, useEffect, useState } from 'react';

import { HEALTH_URL } from '@config/env';

type HealthStatus = 'idle' | 'loading' | 'online' | 'offline';

type BackendHealth = {
  status: HealthStatus;
  error?: string;
  refresh: () => void;
};

export function useBackendHealth(): BackendHealth {
  const [status, setStatus] = useState<HealthStatus>('idle');
  const [error, setError] = useState<string | undefined>();

  const check = useCallback(async () => {
    setStatus('loading');
    setError(undefined);
    try {
      const response = await fetch(HEALTH_URL);
      if (!response.ok) {
        throw new Error(`Health check failed (${response.status})`);
      }
      setStatus('online');
    } catch (err) {
      setStatus('offline');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    check().catch(() => undefined);
  }, [check]);

  return {
    status,
    error,
    refresh: () => {
      check().catch(() => undefined);
    },
  };
}
