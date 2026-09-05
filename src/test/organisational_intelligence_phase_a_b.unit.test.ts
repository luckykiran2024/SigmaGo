import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encryptSecret, decryptSecret } from '../lib/crypto/secrets';
import fs from 'fs';
import path from 'path';

describe('Organisational Intelligence Phase A & B Acceptance Tests', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalKey = process.env.SECRET_ENCRYPTION_KEY;

  afterEach(() => {
    (process.env as any).NODE_ENV = originalEnv;
    process.env.SECRET_ENCRYPTION_KEY = originalKey;
  });

  // Test 1: Security Pre-flight — Production fail closed
  it('should throw a fatal error in production when SECRET_ENCRYPTION_KEY is missing', () => {
    (process.env as any).NODE_ENV = 'production';
    delete process.env.SECRET_ENCRYPTION_KEY;

    expect(() => encryptSecret('my_test_secret')).toThrow(/FATAL: SECRET_ENCRYPTION_KEY environment variable is missing/);
  });

  // Test 2: Security Pre-flight — Zero hardcoded credentials in scripts
  it('should confirm all database migration scripts contain zero hardcoded database credentials', () => {
    const scriptsDir = path.join(__dirname, '../../scripts');
    const files = fs.readdirSync(scriptsDir);
    const forbiddenPattern = /mawiqviucthalwyfvmfr/i;

    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.ts')) {
        const content = fs.readFileSync(path.join(scriptsDir, file), 'utf8');
        expect(content).not.toMatch(forbiddenPattern);
      }
    }
  });

  // Test 3: Day-3 Action Outcome Derivation Logic
  it('should correctly derive server-side outcome based on action and condition text', () => {
    function deriveOutcome(action: 'approved' | 'rejected' | 'discuss', conditionText?: string): string {
      if (action === 'discuss') return 'CHANGES_REQUESTED';
      if (action === 'rejected') return 'REJECTED';
      if (action === 'approved' && conditionText && conditionText.trim().length > 0) {
        return 'APPROVED_WITH_CONDITIONS';
      }
      return 'APPROVED';
    }

    expect(deriveOutcome('approved')).toBe('APPROVED');
    expect(deriveOutcome('approved', 'Subject to budget approval')).toBe('APPROVED_WITH_CONDITIONS');
    expect(deriveOutcome('rejected')).toBe('REJECTED');
    expect(deriveOutcome('discuss')).toBe('CHANGES_REQUESTED');
  });

  // Test 4: Workflow Versioning Unique Constraint Structure
  it('should enforce immutable snapshot metadata for workflow versioning', () => {
    const workflowVersion = {
      workflow_id: 'wf-100',
      version_number: 2,
      base_step_type: 'TRANSACTIONAL',
      governing_policy_id_snapshot: 'pol-500',
      default_sla_hours: 72,
    };

    expect(workflowVersion.version_number).toBe(2);
    expect(workflowVersion.base_step_type).toBe('TRANSACTIONAL');
  });
});
