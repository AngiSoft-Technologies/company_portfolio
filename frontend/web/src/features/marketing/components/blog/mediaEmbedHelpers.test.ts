// @ts-nocheck
import { describe, it, expect } from 'vitest';
import {
  toEmbedSrc,
  toSafeHttpUrl,
  parseHttpUrl,
  isExternalMedia,
} from './mediaEmbedHelpers';

describe('toEmbedSrc — trusted hosts only', () => {
  it('constructs a YouTube embed URL from watch, short and embed links', () => {
    expect(toEmbedSrc('https://www.youtube.com/watch?v=abcd1234'))
      .toBe('https://www.youtube.com/embed/abcd1234');
    expect(toEmbedSrc('https://youtu.be/abcd1234'))
      .toBe('https://www.youtube.com/embed/abcd1234');
    expect(toEmbedSrc('https://www.youtube-nocookie.com/embed/abcd1234'))
      .toBe('https://www.youtube.com/embed/abcd1234');
    expect(toEmbedSrc('https://m.youtube.com/shorts/abcd1234'))
      .toBe('https://www.youtube.com/embed/abcd1234');
  });

  it('constructs a Vimeo embed URL from player and share links', () => {
    expect(toEmbedSrc('https://vimeo.com/123456789'))
      .toBe('https://player.vimeo.com/video/123456789');
    expect(toEmbedSrc('https://player.vimeo.com/video/123456789?autoplay=1'))
      .toBe('https://player.vimeo.com/video/123456789');
  });

  it('rejects lookalike hosts, arbitrary URLs and malformed ids', () => {
    expect(toEmbedSrc('https://youtube.com.evil.example/watch?v=abcd1234')).toBeNull();
    expect(toEmbedSrc('https://notvimeo.com/12345')).toBeNull();
    expect(toEmbedSrc('https://evil.example/embed/abcd1234')).toBeNull();
    expect(toEmbedSrc('javascript:alert(1)')).toBeNull();
    expect(toEmbedSrc('https://www.youtube.com/watch?v=<script>')).toBeNull();
    expect(toEmbedSrc('https://vimeo.com/not-a-number')).toBeNull();
    expect(toEmbedSrc('/relative/path')).toBeNull();
    expect(toEmbedSrc('')).toBeNull();
  });
});

describe('toSafeHttpUrl / isExternalMedia', () => {
  it('accepts normalised http(s) URLs only', () => {
    expect(toSafeHttpUrl(' https://cdn1.angisoft.co.ke/audio/episode.mp3 '))
      .toBe('https://cdn1.angisoft.co.ke/audio/episode.mp3');
    expect(toSafeHttpUrl('http://example.org/a.mp3')).toBe('http://example.org/a.mp3');
    expect(isExternalMedia('https://example.org/a.mp3')).toBe(true);
  });

  it('rejects non-http schemes and malformed input', () => {
    expect(toSafeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(toSafeHttpUrl('data:text/html;base64,AAA')).toBeNull();
    expect(toSafeHttpUrl('//example.org/a.mp3')).toBeNull();
    expect(toSafeHttpUrl('not a url')).toBeNull();
    expect(isExternalMedia('javascript:alert(1)')).toBe(false);
    expect(parseHttpUrl('ftp://example.org/a.mp3')).toBeNull();
  });
});
