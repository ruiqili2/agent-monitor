// Fix for fetch mock preconnect issue
import { vi } from 'vitest';

vi.stubGlobal(
  'fetch',
  vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
  }) as unknown as typeof fetch,
);

