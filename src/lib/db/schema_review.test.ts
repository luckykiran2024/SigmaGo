import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('SigmaGo Schema Review Invariants', () => {
  const schemaPath = path.resolve(__dirname, '../../../prisma/schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');

  it('1. Enums defined: DecisionRelationship, StepType, IntelligenceScope, ParticipantRole, ParticipantState, DirectoryStatus', () => {
    expect(schemaContent).toContain('enum DecisionRelationship');
    expect(schemaContent).toContain('enum StepType');
    expect(schemaContent).toContain('enum IntelligenceScope');
    expect(schemaContent).toContain('enum ParticipantRole');
    expect(schemaContent).toContain('enum ParticipantState');
    expect(schemaContent).toContain('enum DirectoryStatus');
  });

  it('2. onDelete: Restrict on user reference relations to prevent silent metric corruption', () => {
    expect(schemaContent).toContain('references: [id], onDelete: Restrict)');
  });

  it('3. Policy Version Chain: Forward relation named supersedes, array named superseded_by', () => {
    expect(schemaContent).toContain('supersedes');
    expect(schemaContent).toContain('superseded_by');
    expect(schemaContent).toContain('@relation("PolicyVersionChain"');
  });

  it('4. Policies completeness: statement field present', () => {
    expect(schemaContent).toContain('statement');
    expect(schemaContent).toContain('owning_department');
  });

  it('5. Seal metadata fields present on approval_requests', () => {
    expect(schemaContent).toContain('sealed_at');
    expect(schemaContent).toContain('seal_algorithm');
    expect(schemaContent).toContain('canonical_form_version');
  });

  it('6. MaturityBaseline model present', () => {
    expect(schemaContent).toContain('model maturity_baselines');
    expect(schemaContent).toContain('step_type  StepType');
  });
});
