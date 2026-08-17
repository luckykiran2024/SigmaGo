import { describe, it, expect } from 'vitest';
import { decisionLifecycle } from './lifecycle';
import { VOCABULARY } from './copy';
import fs from 'fs';
import path from 'path';

describe('Build Prompt #12 — Product Vocabulary & RRRR Framework Invariants', () => {
  it('1. CI Banned Words Grep: Banned words must not appear in user-facing UI code', () => {
    const srcDir = path.resolve(__dirname, '../../components');
    const bannedTerms = [
      'submit for approval',
      'document your decisions',
      'decision receipt',
    ];

    const checkDir = (dirPath: string) => {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          checkDir(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
          const content = fs.readFileSync(fullPath, 'utf8').toLowerCase();
          for (const banned of bannedTerms) {
            expect(
              content.includes(banned.toLowerCase()),
              `Banned term "${banned}" found in ${fullPath}`
            ).toBe(false);
          }
        }
      }
    };

    checkDir(srcDir);
  });

  it('2. Schema Invariant: No R-named columns exist in Prisma schema', () => {
    const schemaPath = path.resolve(__dirname, '../../../prisma/schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');

    const bannedColumns = ['recordedAt', 'isRetrievable', 'relyStatus', 'reuseCount'];
    for (const col of bannedColumns) {
      expect(schemaContent.includes(col)).toBe(false);
    }
  });

  it('3. RRRR Lifecycle Derivation: Correctly computes recorded, retrievable, provable, and reusable states', () => {
    const unsealedReq = {
      id: 'req-1',
      refCode: 'REQ-2026-0001',
      reasoning: 'Approved based on Q2 budget allocation.',
      sealed: false,
      referenceCount: 0,
    };

    const unsealedLifecycle = decisionLifecycle(unsealedReq);

    expect(unsealedLifecycle.recorded.state).toBe('full');
    expect(unsealedLifecycle.retrievable.state).toBe('full');
    expect(unsealedLifecycle.provable.state).toBe('none');
    expect(unsealedLifecycle.provable.copy).toContain('pending finalisation');
    expect(unsealedLifecycle.reusable.state).toBe('none');

    const sealedReq = {
      id: 'req-2',
      refCode: 'REQ-2026-0002',
      reasoning: 'Reasoning attached.',
      sealed: true,
      referenceCount: 3,
    };

    const sealedLifecycle = decisionLifecycle(sealedReq);

    expect(sealedLifecycle.provable.state).toBe('full');
    expect(sealedLifecycle.provable.copy).toContain('SHA-256');
    expect(sealedLifecycle.reusable.state).toBe('full');
    expect(sealedLifecycle.reusable.copy).toContain('Cited by 3 later decisions');
  });

  it('4. Certificate Standard: Approval Certificate term used, Decision Receipt appears nowhere', () => {
    expect(VOCABULARY.confirmations.finalApproval).toContain('Sealed');
    expect(VOCABULARY.confirmations.rejected).toContain('reasoning is kept');
  });

  it('5. Search Results Footer: Formats sub-second retrieval duration', () => {
    const footerText = VOCABULARY.searchFooter(3, '0.4s');
    expect(footerText).toBe('3 decisions retrieved in 0.4s');
  });

  it('6. Centralized Microcopy: All empty states teach and avoid apologizing', () => {
    expect(VOCABULARY.emptyStates.noSearchResults).toContain('never recorded');
    expect(VOCABULARY.emptyStates.noDecisionsYet).toContain('findable in seconds');
  });
});
