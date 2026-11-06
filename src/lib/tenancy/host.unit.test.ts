import { describe, expect, it } from 'vitest';
import { tenantFromHostname } from './host';

describe('tenant host resolution', () => {
  it('keeps platform, preview, and local root hosts out of tenant paths', () => {
    for (const host of [
      'sigmago.tech',
      'www.sigmago.tech',
      'sigmago.app',
      'sigma-go.vercel.app',
      'localhost:3000',
      'unknown.example',
    ]) {
      expect(tenantFromHostname(host)).toBe('');
    }
  });

  it('resolves only valid tenant subdomains', () => {
    expect(tenantFromHostname('meridian.sigmago.tech')).toBe('meridian');
    expect(tenantFromHostname('northgate.sigmago.app')).toBe('northgate');
    expect(tenantFromHostname('acme.localhost:3000')).toBe('acme');
    expect(tenantFromHostname('foo.bar.sigmago.tech')).toBe('');
  });
});
