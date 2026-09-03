import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;

if (!connectionString) {
  throw new Error('FATAL: Database connection URL is missing. Set DATABASE_URL or DIRECT_URL in environment.');
}

async function applyOrganisationalIntelligenceV3Schema() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('Applying Organisational Intelligence V3 Database Schemas...');

  try {
    await client.query('BEGIN');

    // 1. Workflows
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_locked BOOLEAN NOT NULL DEFAULT false,
        base_step_type TEXT NOT NULL DEFAULT 'TRANSACTIONAL',
        governing_policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
        default_sla_hours INT,
        classification_rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        opportunity_model_id UUID,
        current_version_number INT NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_workflows_tenant_category ON workflows(tenant_id, category_id);
    `);

    // 2. Workflow Versions
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        version_number INT NOT NULL,
        name_snapshot TEXT NOT NULL,
        category_id_snapshot UUID,
        base_step_type TEXT NOT NULL,
        governing_policy_id_snapshot UUID,
        steps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        classification_rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        default_sla_hours INT,
        custom_fields_snapshot JSONB DEFAULT '[]'::jsonb,
        validity_snapshot JSONB DEFAULT '{}'::jsonb,
        opportunity_model_snapshot JSONB DEFAULT '{}'::jsonb,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        effective_to TIMESTAMPTZ,
        CONSTRAINT uq_workflow_version UNIQUE (tenant_id, workflow_id, version_number)
      );
      CREATE INDEX IF NOT EXISTS idx_workflow_versions_lookup ON workflow_versions(tenant_id, workflow_id, effective_from);
    `);

    // 3. Update approval_requests table for workflow identity & Day-3 capture
    await client.query(`
      ALTER TABLE approval_requests 
        ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS workflow_version_id UUID REFERENCES workflow_versions(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS baseline_step_type TEXT,
        ADD COLUMN IF NOT EXISTS resolved_step_type TEXT,
        ADD COLUMN IF NOT EXISTS classification_source TEXT DEFAULT 'WORKFLOW',
        ADD COLUMN IF NOT EXISTS classification_reason TEXT,
        ADD COLUMN IF NOT EXISTS expected_sla_hours INT,
        ADD COLUMN IF NOT EXISTS expected_decision_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS workflow_snapshot JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS parent_reference_id UUID;
    `);

    // 4. Update approval_steps for Day-3 semantic capture
    await client.query(`
      ALTER TABLE approval_steps
        ADD COLUMN IF NOT EXISTS stance TEXT,
        ADD COLUMN IF NOT EXISTS outcome TEXT,
        ADD COLUMN IF NOT EXISTS was_binding BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS reservation_note TEXT;
    `);

    // 5. Decision Events (Append-Only Event Spine)
    await client.query(`
      CREATE TABLE IF NOT EXISTS decision_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
        workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
        workflow_version_id UUID REFERENCES workflow_versions(id) ON DELETE SET NULL,
        event_type TEXT NOT NULL,
        event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
        step_id UUID REFERENCES approval_steps(id) ON DELETE SET NULL,
        baseline_step_type TEXT,
        resolved_step_type TEXT,
        policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
        parent_reference_id UUID,
        stance TEXT,
        outcome TEXT,
        was_binding BOOLEAN,
        event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        correlation_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_decision_events_tenant_at ON decision_events(tenant_id, event_at DESC);
      CREATE INDEX IF NOT EXISTS idx_decision_events_request ON decision_events(tenant_id, request_id, event_at);
      CREATE INDEX IF NOT EXISTS idx_decision_events_workflow ON decision_events(tenant_id, workflow_id, event_at);
      CREATE INDEX IF NOT EXISTS idx_decision_events_step_type ON decision_events(tenant_id, resolved_step_type, event_at);
      CREATE INDEX IF NOT EXISTS idx_decision_events_type ON decision_events(tenant_id, event_type, event_at);
      CREATE INDEX IF NOT EXISTS idx_decision_events_policy ON decision_events(tenant_id, policy_id, event_at);
    `);

    // 6. Decision Calendar Events (Organisational Contexts)
    await client.query(`
      CREATE TABLE IF NOT EXISTS decision_calendar_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        context_type TEXT NOT NULL,
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ NOT NULL,
        recurring_rule TEXT,
        expected_step_types JSONB DEFAULT '[]'::jsonb,
        domains JSONB DEFAULT '[]'::jsonb,
        workflows JSONB DEFAULT '[]'::jsonb,
        description TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_decision_calendar_lookup ON decision_calendar_events(tenant_id, starts_at, ends_at);
    `);

    // 7. Decision Period Metrics
    await client.query(`
      CREATE TABLE IF NOT EXISTS decision_period_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        period_key TEXT NOT NULL,
        comparator_period_key TEXT NOT NULL,
        context_id UUID REFERENCES decision_calendar_events(id) ON DELETE SET NULL,
        domain TEXT,
        workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
        step_type TEXT NOT NULL,
        total_decisions INT NOT NULL DEFAULT 0,
        approved_count INT NOT NULL DEFAULT 0,
        rejected_count INT NOT NULL DEFAULT 0,
        exception_count INT NOT NULL DEFAULT 0,
        avg_cycle_hours FLOAT NOT NULL DEFAULT 0.0,
        median_cycle_hours FLOAT NOT NULL DEFAULT 0.0,
        p90_cycle_hours FLOAT NOT NULL DEFAULT 0.0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_decision_period_metric UNIQUE (tenant_id, period_key, workflow_id, step_type)
      );
    `);

    // 8. Stage Transition Metrics
    await client.query(`
      CREATE TABLE IF NOT EXISTS stage_transition_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        period_key TEXT NOT NULL,
        context_id UUID REFERENCES decision_calendar_events(id) ON DELETE SET NULL,
        workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        step_type TEXT NOT NULL,
        from_stage TEXT NOT NULL,
        to_stage TEXT NOT NULL,
        terminal_state TEXT,
        transition_count INT NOT NULL DEFAULT 0,
        denominator_count INT NOT NULL DEFAULT 0,
        observed_probability FLOAT NOT NULL DEFAULT 0.0,
        sample_size INT NOT NULL DEFAULT 0,
        refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_stage_transition_metric UNIQUE (tenant_id, period_key, workflow_id, from_stage, to_stage)
      );
    `);

    // 9. Policy Period Metrics
    await client.query(`
      CREATE TABLE IF NOT EXISTS policy_period_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
        period_key TEXT NOT NULL,
        total_governed_decisions INT NOT NULL DEFAULT 0,
        based_on_count INT NOT NULL DEFAULT 0,
        exception_count INT NOT NULL DEFAULT 0,
        governance_rate FLOAT NOT NULL DEFAULT 1.0,
        distinct_approvers INT NOT NULL DEFAULT 0,
        dominant_exception_reason TEXT,
        health_state TEXT NOT NULL DEFAULT 'HEALTHY',
        refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_policy_period_metric UNIQUE (tenant_id, policy_id, period_key)
      );
    `);

    // 10. Decision Footprint Metrics
    await client.query(`
      CREATE TABLE IF NOT EXISTS decision_footprint_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
        direct_descendant_count INT NOT NULL DEFAULT 0,
        transitive_descendant_count INT NOT NULL DEFAULT 0,
        based_on_count INT NOT NULL DEFAULT 0,
        exception_child_count INT NOT NULL DEFAULT 0,
        replacement_count INT NOT NULL DEFAULT 0,
        renewal_count INT NOT NULL DEFAULT 0,
        cross_domain_reach INT NOT NULL DEFAULT 0,
        persistence_days INT NOT NULL DEFAULT 0,
        last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_decision_footprint_metric UNIQUE (tenant_id, request_id)
      );
    `);

    // 11. Intelligence Signals
    await client.query(`
      CREATE TABLE IF NOT EXISTS intelligence_signals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        signal_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id UUID,
        workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
        policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
        period_key TEXT NOT NULL,
        title TEXT NOT NULL,
        factual_summary TEXT NOT NULL,
        pattern_summary TEXT,
        interpretation TEXT,
        recommendation TEXT,
        magnitude FLOAT NOT NULL DEFAULT 0.0,
        persistence INT NOT NULL DEFAULT 1,
        impact TEXT DEFAULT 'MEDIUM',
        confidence TEXT NOT NULL DEFAULT 'DEVELOPING',
        confidence_basis JSONB NOT NULL DEFAULT '{}'::jsonb,
        evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_intelligence_signals_tenant ON intelligence_signals(tenant_id, period_key, status);
    `);

    // 12. Support Tickets
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'open',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON support_tickets(tenant_id, status);
    `);

    await client.query('COMMIT');
    console.log('Organisational Intelligence V3 Database Schemas applied successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to apply Organisational Intelligence V3 Database Schemas:', err);
    throw err;
  } finally {
    await client.end();
  }
}

applyOrganisationalIntelligenceV3Schema();
