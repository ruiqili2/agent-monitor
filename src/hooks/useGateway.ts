// ============================================================================
// useGateway — Gateway connection management hook
// ============================================================================
/* eslint-disable react-hooks/set-state-in-effect */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GatewayConfig } from '@/lib/types';
import { GatewayPoller, type GatewayStatus } from '@/lib/gateway-client';

export interface UseGatewayReturn {
  connected: boolean;
  status: GatewayStatus | null;
  connect: (config: GatewayConfig) => void;
  disconnect: () => void;
  error: string | null;
}

export function useGateway(initialConfig?: GatewayConfig, enabled = true): UseGatewayReturn {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollerRef = useRef<GatewayPoller | null>(null);
  const retriesRef = useRef(0);

  const handleStatus = useCallback((s: GatewayStatus) => {
    setStatus(s);
    if (s.online) {
      setConnected(true);
      setError(null);
      retriesRef.current = 0;
    } else {
      retriesRef.current++;
      if (retriesRef.current >= 3) {
        setConnected(false);
        setError('Unable to reach gateway');
      }
    }
  }, []);

  const connect = useCallback((config: GatewayConfig) => {
    if (pollerRef.current) {
      pollerRef.current.stop();
    }
    setError(null);
    retriesRef.current = 0;
    const poller = new GatewayPoller(config, handleStatus, 3000);
    pollerRef.current = poller;
    poller.start();
  }, [handleStatus]);

  const disconnect = useCallback(() => {
    if (pollerRef.current) {
      pollerRef.current.stop();
      pollerRef.current = null;
    }
    setConnected(false);
    setStatus(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (enabled && initialConfig && initialConfig.url) {
      connect(initialConfig);
    } else {
      disconnect();
    }
    return () => {
      if (pollerRef.current) {
        pollerRef.current.stop();
      }
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return { connected, status, connect, disconnect, error };
}
