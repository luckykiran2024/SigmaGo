import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('SigmaGo — Latency & Performance Invariants', () => {
  it('1. Region Mismatch Fix: vercel.json pins serverless function region to bom1 (Mumbai)', () => {
    const vercelConfigPath = path.resolve(__dirname, '../../../vercel.json');
    expect(fs.existsSync(vercelConfigPath)).toBe(true);

    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
    expect(vercelConfig.regions).toEqual(['bom1']);
  });

  it('2. Connection Pooler Config: DATABASE_URL uses port 6543 with pgbouncer & connection_limit=1, DIRECT_URL uses 5432', () => {
    const envPath = path.resolve(__dirname, '../../../.env');
    const envContent = fs.readFileSync(envPath, 'utf8');

    expect(envContent).toContain(':6543/postgres?pgbouncer=true&connection_limit=1');
    expect(envContent).toContain('DIRECT_URL');
    expect(envContent).toContain(':5432/postgres');
  });

  it('3. Prisma Configuration: Configured in prisma.config.ts with DIRECT_URL / DATABASE_URL', () => {
    const configPath = path.resolve(__dirname, '../../../prisma.config.ts');
    const configContent = fs.readFileSync(configPath, 'utf8');

    expect(configContent).toContain('DIRECT_URL');
    expect(configContent).toContain('DATABASE_URL');
  });

  it('4. Query Concurrency: Promise.all used for independent permission queries in decisions.ts', () => {
    const decisionsDbPath = path.resolve(__dirname, '../db/decisions.ts');
    const decisionsDbContent = fs.readFileSync(decisionsDbPath, 'utf8');

    expect(decisionsDbContent).toContain('Promise.all');
    expect(decisionsDbContent).toContain('openCategoriesRes');
    expect(decisionsDbContent).toContain('approverRecRes');
  });

  it('5. Caching Layer: Metadata cached via unstable_cache in cache.ts', () => {
    const cachePath = path.resolve(__dirname, '../db/cache.ts');
    expect(fs.existsSync(cachePath)).toBe(true);

    const cacheContent = fs.readFileSync(cachePath, 'utf8');
    expect(cacheContent).toContain('getCachedCategories');
    expect(cacheContent).toContain('getCachedTenantSettings');
  });
});
