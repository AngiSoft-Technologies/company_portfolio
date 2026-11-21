// @ts-nocheck
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderContent, sanitizeHtml } from './blogContent';

describe('sanitizeHtml — fail closed without a DOM', () => {
  it('emits nothing instead of falling back to a regex strip', () => {
    // Vitest's default node environment has no DOM, so DOMPurify cannot run.
    expect(sanitizeHtml('<p onclick="evil()">hello<script>alert(1)</script></p>')).toBe('');
  });

  it('emits nothing for empty/non-string input', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(42)).toBe('');
  });

  it('renderContent never leaks unsanitised HTML in that environment', () => {
    expect(renderContent('# Heading\n\n[link](javascript:alert(1))')).toBe('');
    expect(renderContent('plain <b>text</b>')).toBe('');
  });
});

const makeAnchor = (attributes) => {
  const attrs = { ...attributes };
  return {
    nodeType: 1,
    nodeName: 'A',
    attrs,
    getAttribute: (key) => (key in attrs ? attrs[key] : null),
    setAttribute: (key, value) => { attrs[key] = value; },
    removeAttribute: (key) => { delete attrs[key]; },
  };
};

describe('sanitizeHtml — link hardening hook', () => {
  afterEach(() => {
    vi.doUnmock('dompurify');
    vi.resetModules();
  });

  const withPurifyStub = async (anchor) => {
    let hook;
    vi.resetModules();
    vi.doMock('dompurify', () => ({
      __esModule: true,
      default: {
        isSupported: true,
        addHook: (_name, fn) => { hook = fn; },
        sanitize: () => {
          if (hook) hook(anchor);
          return 'sanitized';
        },
      },
    }));
    const module = await import('./blogContent');
    expect(module.sanitizeHtml('<a href="#">x</a>')).toBe('sanitized');
  };

  it('drops unsafe href protocols and forces rel=noopener noreferrer', async () => {
    const anchor = makeAnchor({ href: 'javascript:alert(1)', target: '_blank' });
    await withPurifyStub(anchor);
    expect(anchor.attrs.href).toBeUndefined();
    expect(anchor.attrs.rel).toBe('noopener noreferrer');
  });

  it('keeps safe hrefs and preserves existing rel tokens', async () => {
    const anchor = makeAnchor({ href: 'https://example.org/page', target: '_blank', rel: 'nofollow' });
    await withPurifyStub(anchor);
    expect(anchor.attrs.href).toBe('https://example.org/page');
    expect(anchor.attrs.rel).toBe('nofollow noopener noreferrer');
  });
});
