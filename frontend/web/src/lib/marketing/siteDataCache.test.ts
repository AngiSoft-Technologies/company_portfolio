import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '@/lib/httpClient';
import { cachedGet, clearSiteDataCache } from './siteDataCache';

vi.mock('@/lib/httpClient', () => ({
  apiGet: vi.fn(),
}));

const mockedGet = vi.mocked(apiGet);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  clearSiteDataCache();
  mockedGet.mockReset();
});

describe('cachedGet (public site data dedupe)', () => {
  it('shares one in-flight request across concurrent callers of the same endpoint', async () => {
    const pending = deferred<{ siteName: string }>();
    mockedGet.mockReturnValue(pending.promise);

    // Header and Footer both request branding on the same page.
    const headerRequest = cachedGet('/site/branding');
    const footerRequest = cachedGet('/site/branding');
    const thirdRequest = cachedGet('/site/branding');

    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet).toHaveBeenCalledWith('/site/branding');

    pending.resolve({ siteName: 'AngiSoft' });
    await expect(Promise.all([headerRequest, footerRequest, thirdRequest])).resolves.toEqual([
      { siteName: 'AngiSoft' },
      { siteName: 'AngiSoft' },
      { siteName: 'AngiSoft' },
    ]);
  });

  it('reuses the resolved value for later callers without another request', async () => {
    mockedGet.mockImplementation(() => Promise.resolve({ siteName: 'AngiSoft' }));

    await expect(cachedGet('/site/branding')).resolves.toEqual({ siteName: 'AngiSoft' });
    await expect(cachedGet('/site/branding')).resolves.toEqual({ siteName: 'AngiSoft' });
    await expect(cachedGet('/site/branding')).resolves.toEqual({ siteName: 'AngiSoft' });

    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('keeps different endpoints independent', async () => {
    mockedGet.mockImplementation((endpoint: string) =>
      Promise.resolve(endpoint === '/site/navigation' ? { simpleLinks: [] } : { logo: 'logo.svg' }),
    );

    const [navigation, branding] = await Promise.all([
      cachedGet('/site/navigation'),
      cachedGet('/site/branding'),
    ]);

    expect(navigation).toEqual({ simpleLinks: [] });
    expect(branding).toEqual({ logo: 'logo.svg' });
    expect(mockedGet.mock.calls.map(([endpoint]) => endpoint)).toEqual([
      '/site/navigation',
      '/site/branding',
    ]);
  });

  it('evicts failures so a later mount can retry', async () => {
    mockedGet.mockImplementationOnce(() => Promise.reject(new Error('network down')));

    await expect(cachedGet('/site/hero')).rejects.toThrow('network down');
    expect(mockedGet).toHaveBeenCalledTimes(1);

    mockedGet.mockImplementation(() => Promise.resolve({ headline: 'Back online' }));
    await expect(cachedGet('/site/hero')).resolves.toEqual({ headline: 'Back online' });
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it('normalizes an empty response to null and caches that result', async () => {
    mockedGet.mockImplementation(() => Promise.resolve(undefined));

    await expect(cachedGet('/services')).resolves.toBeNull();
    await expect(cachedGet('/services')).resolves.toBeNull();
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });
});
