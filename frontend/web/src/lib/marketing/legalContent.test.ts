import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '@/lib/httpClient';
import {
  fetchLegalDocument,
  getFallbackLegalDocument,
  normalizeLegalDocument,
} from './legalContent';

vi.mock('@/lib/httpClient', () => ({
  apiGet: vi.fn(),
}));

const mockedGet = vi.mocked(apiGet);

beforeEach(() => {
  mockedGet.mockReset();
});

describe('legal fallback copy', () => {
  it('preserves the current privacy policy anchors and contact details', () => {
    const doc = getFallbackLegalDocument('privacy');
    expect(doc.source).toBe('fallback');
    expect(doc.sections.map((section) => section.id)).toEqual([
      'introduction', 'data-collection', 'data-usage', 'cookies',
      'third-parties', 'security', 'rights', 'contact',
    ]);
    expect(doc.sections[1]).toMatchObject({
      title: 'Information We Collect',
      navTitle: 'Data We Collect',
    });
    expect(JSON.stringify(doc)).toContain('We do not sell your personal information to third parties.');
    expect(JSON.stringify(doc)).toContain('Email: privacy@angisoft.co.ke');
  });

  it('preserves the current terms anchors and governing-law copy', () => {
    const doc = getFallbackLegalDocument('terms');
    expect(doc.sections).toHaveLength(9);
    expect(doc.sections.map((section) => section.id)).toContain('governing-law');
    expect(JSON.stringify(doc)).toContain('the laws of the Republic of Kenya');
    expect(JSON.stringify(doc)).toContain('Email: legal@angisoft.co.ke');
  });
});

describe('fetchLegalDocument', () => {
  it('fetches the public privacy endpoint and uses a full CMS document', async () => {
    const cms = {
      titleLead: 'Owner ',
      titleAccent: 'Privacy',
      summary: 'Owner summary.',
      sections: [
        {
          id: 'introduction',
          title: 'Owner introduction',
          blocks: [{ type: 'paragraph', text: 'Owner paragraph.' }],
        },
      ],
    };
    mockedGet.mockResolvedValue(cms);

    await expect(fetchLegalDocument('privacy')).resolves.toEqual({
      ...cms,
      key: 'privacy',
      source: 'cms',
    });
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet).toHaveBeenCalledWith('/v1/legal/privacy');
  });

  it('merges a partial CMS value over the fallback sections', async () => {
    mockedGet.mockResolvedValue({ summary: 'Owner-edited terms summary.' });

    const doc = await fetchLegalDocument('terms');
    expect(mockedGet).toHaveBeenCalledWith('/v1/legal/terms');
    expect(doc.source).toBe('cms');
    expect(doc.summary).toBe('Owner-edited terms summary.');
    expect(doc.titleLead).toBe('Terms & ');
    expect(doc.sections).toHaveLength(9);
    expect(doc.sections[0].blocks[0]).toMatchObject({ type: 'paragraph' });
  });

  it('returns the checked-in fallback when the request fails', async () => {
    mockedGet.mockRejectedValue(new Error('network down'));

    const doc = await fetchLegalDocument('privacy');
    expect(doc).toEqual(getFallbackLegalDocument('privacy'));
    expect(doc.source).toBe('fallback');
  });

  it.each([
    ['a non-object payload', '<p>raw HTML</p>'],
    ['an empty object', {}],
    ['an empty sections array', { sections: [] }],
    ['a non-array sections value', { sections: 'not-an-array' }],
  ])('returns the fallback for %s', async (_label, payload) => {
    mockedGet.mockResolvedValue(payload);

    const doc = await fetchLegalDocument('privacy');
    expect(doc).toEqual(getFallbackLegalDocument('privacy'));
  });

  it('keeps CMS strings as plain text for React to escape', async () => {
    const doc = normalizeLegalDocument('privacy', {
      summary: '<script>alert(1)</script>',
      sections: [
        {
          id: 'introduction',
          title: '<img src=x onerror=alert(1)>',
          blocks: [{ type: 'paragraph', text: '<b>bold</b>' }],
        },
      ],
    });

    expect(doc?.source).toBe('cms');
    expect(doc?.summary).toBe('<script>alert(1)</script>');
    expect(doc?.sections[0].title).toBe('<img src=x onerror=alert(1)>');
    expect(doc?.sections[0].blocks[0]).toEqual({ type: 'paragraph', text: '<b>bold</b>' });
  });
});
