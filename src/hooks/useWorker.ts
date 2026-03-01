// ============================================================================
// useWorker - React hook for Web Worker communication
// ============================================================================

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkerConfig {
  url: URL;
  options?: WorkerOptions;
}

export interface WorkerState<T = unknown> {
  loading: boolean;
  error: Error | null;
  data: T | null;
}

export type WorkerMessageHandler<T = unknown> = (data: T) => void;
export type WorkerErrorHandler = (error: Error, context?: string) => void;

// ---------------------------------------------------------------------------
// Hook Implementation
// ---------------------------------------------------------------------------

/**
 * React hook for managing Web Worker lifecycle and communication.
 *
 * @example
 * ```tsx
 * const { postMessage, data, error, loading } = useWorker<string>({
 *   url: new URL('../workers/my-worker.ts', import.meta.url),
 *   onMessage: (data) => console.log('Received:', data),
 *   onError: (err) => console.error('Worker error:', err),
 * });
 *
 * postMessage({ type: 'start', config: { interval: 1000 } });
 * ```
 */
export function useWorker<T = unknown>(config: {
  url: URL;
  options?: WorkerOptions;
  onMessage?: WorkerMessageHandler<T>;
  onError?: WorkerErrorHandler;
  autoStart?: boolean;
}): {
  postMessage: (message: unknown) => void;
  terminate: () => void;
  restart: () => void;
  isReady: boolean;
  data: T | null;
  error: Error | null;
  loading: boolean;
} {
  const { url, options, onMessage, onError, autoStart = true } = config;

  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  // Create worker
  const createWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    try {
      const worker = new Worker(url, options);
      workerRef.current = worker;
      setIsReady(true);
      setError(null);

      worker.onmessage = (event: MessageEvent<T>) => {
        setLoading(false);
        setData(event.data);
        onMessage?.(event.data);
      };

      worker.onerror = (event: ErrorEvent) => {
        setLoading(false);
        const err = new Error(event.message);
        setError(err);
        onError?.(err, 'Worker error');
      };

      return worker;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsReady(false);
      onError?.(error, 'Worker creation failed');
      return null;
    }
  }, [url, options, onMessage, onError]);

  // Terminate worker
  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsReady(false);
      setData(null);
      setError(null);
    }
  }, []);

  // Restart worker
  const restart = useCallback(() => {
    terminate();
    createWorker();
  }, [terminate, createWorker]);

  // Post message to worker
  const postMessage = useCallback((message: unknown) => {
    if (!workerRef.current || !isReady) {
      console.warn('Worker not ready, cannot post message');
      return;
    }

    setLoading(true);
    try {
      workerRef.current.postMessage(message);
    } catch (err) {
      setLoading(false);
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error, 'Post message failed');
    }
  }, [isReady, onError]);

  // Auto-start on mount
  useEffect(() => {
    if (autoStart) {
      createWorker();
    }

    return () => {
      terminate();
    };
  }, [autoStart, createWorker, terminate]);

  return {
    postMessage,
    terminate,
    restart,
    isReady,
    data,
    error,
    loading,
  };
}

// ---------------------------------------------------------------------------
// Specialized Hooks
// ---------------------------------------------------------------------------

/**
 * Hook for Gateway Poller Worker.
 * Handles gateway polling and SSE events in a background thread.
 */
export function useGatewayPoller(config: {
  pollInterval?: number;
  sseEnabled?: boolean;
  onStatus?: (status: import('../workers/gateway-poller.worker').GatewayStatus) => void;
  onSSEEvent?: (event: import('../workers/gateway-poller.worker').SSEStateEvent) => void;
  onConnected?: (connected: boolean) => void;
  onError?: (error: Error, context: string) => void;
}): {
  start: () => void;
  stop: () => void;
  fetchNow: () => void;
  updateConfig: (config: { pollInterval?: number; sseEnabled?: boolean }) => void;
  isRunning: boolean;
  connected: boolean;
} {
  const {
    pollInterval = 3000,
    sseEnabled = true,
    onStatus,
    onSSEEvent,
    onConnected,
    onError,
  } = config;

  const [isRunning, setIsRunning] = useState(false);
  const [connected, setConnected] = useState(false);

  const workerUrl = new URL(
    '../workers/gateway-poller.worker.ts',
    import.meta.url,
  );

  const handleMessage = useCallback(
    (event: unknown) => {
      const msg = event as {
        type: string;
        status?: import('../workers/gateway-poller.worker').GatewayStatus;
        event?: import('../workers/gateway-poller.worker').SSEStateEvent;
        connected?: boolean;
        active?: boolean;
        error?: string;
        context?: string;
      };

      switch (msg.type) {
        case 'status':
          if (msg.status) onStatus?.(msg.status);
          break;
        case 'sseEvent':
          if (msg.event) onSSEEvent?.(msg.event);
          break;
        case 'connected':
          if (msg.connected !== undefined) {
            setConnected(msg.connected);
            onConnected?.(msg.connected);
          }
          break;
        case 'polling':
          setIsRunning(msg.active ?? false);
          break;
        case 'error':
          if (msg.error && msg.context) {
            onError?.(new Error(msg.error), msg.context);
          }
          break;
      }
    },
    [onStatus, onSSEEvent, onConnected, onError],
  );

  const { postMessage, isReady, terminate } = useWorker({
    url: workerUrl,
    onMessage: handleMessage,
    onError: (err, ctx) => onError?.(err, ctx ?? 'Unknown error'),
  });

  const start = useCallback(() => {
    if (isReady) {
      postMessage({ type: 'start', config: { pollInterval, sseEnabled } });
    }
  }, [isReady, postMessage, pollInterval, sseEnabled]);

  const stop = useCallback(() => {
    if (isReady) {
      postMessage({ type: 'stop' });
    }
  }, [isReady, postMessage]);

  const fetchNow = useCallback(() => {
    if (isReady) {
      postMessage({ type: 'fetchNow' });
    }
  }, [isReady, postMessage]);

  const updateConfig = useCallback(
    (newConfig: { pollInterval?: number; sseEnabled?: boolean }) => {
      if (isReady) {
        postMessage({ type: 'updateConfig', config: newConfig });
      }
    },
    [isReady, postMessage],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      terminate();
    };
  }, [terminate]);

  return {
    start,
    stop,
    fetchNow,
    updateConfig,
    isRunning,
    connected,
  };
}

/**
 * Hook for Canvas Renderer Worker.
 * Offloads heavy rendering calculations to a background thread.
 */
export function useCanvasRenderer(config?: {
  onError?: (error: Error, context: string) => void;
}): {
  calculateRender: (
    payload: import('../workers/canvas-renderer.worker').CalcRenderPayload,
  ) => Promise<import('../workers/canvas-renderer.worker').RenderCalculation>;
  updateConfig: (config: Partial<import('../workers/canvas-renderer.worker').IsometricConfig>) => void;
  isReady: boolean;
} {
  const { onError } = config ?? {};

  const pendingResolve = useRef<
    Map<string, (value: import('../workers/canvas-renderer.worker').RenderCalculation) => void>
  >(new Map());
  const pendingReject = useRef<Map<string, (error: Error) => void>>(new Map());
  const requestIdRef = useRef(0);

  const workerUrl = new URL(
    '../workers/canvas-renderer.worker.ts',
    import.meta.url,
  );

  const handleMessage = useCallback(
    (event: unknown) => {
      const msg = event as {
        type: string;
        result?: import('../workers/canvas-renderer.worker').RenderCalculation;
        error?: string;
        context?: string;
      };

      if (msg.type === 'renderResult' && msg.result) {
        const entries = Array.from(pendingResolve.current.entries());
        if (entries.length > 0) {
          const [id, resolve] = entries[0];
          pendingResolve.current.delete(id);
          pendingReject.current.delete(id);
          resolve(msg.result);
        }
      } else if (msg.type === 'error' && msg.error && msg.context) {
        const error = new Error(msg.error);
        onError?.(error, msg.context);

        const entries = Array.from(pendingReject.current.entries());
        if (entries.length > 0) {
          const [id, reject] = entries[0];
          pendingResolve.current.delete(id);
          pendingReject.current.delete(id);
          reject(error);
        }
      }
    },
    [onError],
  );

  const { postMessage, isReady, terminate } = useWorker({
    url: workerUrl,
    onMessage: handleMessage,
    onError: (err, ctx) => onError?.(err, ctx ?? 'Unknown error'),
  });

  const calculateRender = useCallback(
    (
      payload: import('../workers/canvas-renderer.worker').CalcRenderPayload,
    ): Promise<import('../workers/canvas-renderer.worker').RenderCalculation> => {
      return new Promise((resolve, reject) => {
        if (!isReady) {
          reject(new Error('Worker not ready'));
          return;
        }

        const requestId = `render-${++requestIdRef.current}`;
        pendingResolve.current.set(requestId, resolve);
        pendingReject.current.set(requestId, reject);

        postMessage({ type: 'calcRender', payload });

        // Timeout after 5 seconds
        setTimeout(() => {
          if (pendingResolve.current.has(requestId)) {
            pendingResolve.current.delete(requestId);
            pendingReject.current.delete(requestId);
            reject(new Error('Render calculation timeout'));
          }
        }, 5000);
      });
    },
    [isReady, postMessage],
  );

  const updateConfig = useCallback(
    (newConfig: Partial<import('../workers/canvas-renderer.worker').IsometricConfig>) => {
      if (isReady) {
        postMessage({ type: 'updateConfig', config: newConfig });
      }
    },
    [isReady, postMessage],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      terminate();
    };
  }, [terminate]);

  return {
    calculateRender,
    updateConfig,
    isReady,
  };
}

export default useWorker;
