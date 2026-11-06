const PLATFORM_HOSTS = new Set([
  'sigmago.app',
  'sigmago.tech',
  'www.sigmago.tech',
]);

export function tenantFromHostname(hostname: string): string {
  const host = hostname.toLowerCase().split(':')[0];
  if (host === 'localhost' || PLATFORM_HOSTS.has(host) || host.endsWith('.vercel.app')) {
    return '';
  }

  for (const root of ['localhost', 'sigmago.app', 'sigmago.tech']) {
    if (!host.endsWith(`.${root}`)) continue;
    const candidate = host.slice(0, -root.length - 1);
    return /^[a-z0-9-]+$/.test(candidate) && candidate !== 'www' ? candidate : '';
  }

  // Unknown hosts need an explicit domain-to-tenant mapping before rewriting.
  return '';
}
