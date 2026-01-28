import { normalizeAssetUrl } from '@utils/urls';

describe('normalizeAssetUrl', () => {
  it('returns absolute urls unchanged', () => {
    expect(normalizeAssetUrl('https://cdn.example.com/a.png')).toBe(
      'https://cdn.example.com/a.png',
    );
  });

  it('prefixes relative urls with API base', () => {
    const value = normalizeAssetUrl('/media/gifts/a.json');
    expect(value).toContain('/media/gifts/a.json');
    expect(value.startsWith('http')).toBe(true);
  });

  it('returns empty string for invalid input', () => {
    expect(normalizeAssetUrl('')).toBe('');
    expect(normalizeAssetUrl(null)).toBe('');
  });
});
