// Fix for fetch mock preconnect issue
import { vi } from 'vitest';

vi.mock('global', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetch: vi.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        preconnect: vi.fn(),
      })
    ),
  };
});
