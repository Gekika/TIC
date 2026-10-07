-- ============================================================================
-- TIC (Training, Inspection & Certification Operations) - Core Schema
-- PostgreSQL 15+ | Flyway Migration V1__core_schema.sql
-- Multi-tenant via tenant_id column (Row-Level Security enforced)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- TENANCY & ORGANIZATIONS
-- ----------------------------------------------------------------------------

CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,           -- subdomain / API tenant key
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, SUSPENDED, TRIAL
    plan            VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
    settings        JSONB NOT NULL DEFAULT '{}',            -- feature flags, branding, locale
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(30) NOT NULL,   -- CERTIFICATION_BODY, CLIENT_COMPANY, COOPERATIVE
    registration_no VARCHAR(100),
    country         VARCHAR(2) NOT NULL DEFAULT 'KE',
    county          VARCHAR(100),
    contact_email   VARCHAR(255),
    contact_phone   VARCHAR(30),
    workflow_mode   VARCHAR(30) NOT NULL DEFAULT 'CLIENT_SUPERVISOR_INSPECTOR',
                    -- CLIENT_SUPERVISOR_INSPECTOR | CLIENT_INSPECTOR (per-org override; Scenario A default)
    logo_url        TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_org_tenant ON organizations(tenant_id);

-- ----------------------------------------------------------------------------
-- USERS, ROLES, RBAC
-- ----------------------------------------------------------------------------

CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = system-defined global role
    code            VARCHAR(50) NOT NULL,   -- SYSTEM_ADMIN, ORG_ADMIN, SUPERVISOR, INSPECTOR, CLIENT, AUDITOR
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    is_system       BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code)
);

CREATE TABLE permissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(100) NOT NULL UNIQUE,  -- e.g. INSPECTION_CREATE, FORM_PUBLISH, USER_INVITE
    description     TEXT,
    module          VARCHAR(50) NOT NULL
);

CREATE TABLE role_permissions (
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    email           VARCHAR(255) NOT NULL,
    phone           VARCHAR(30),
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INVITED, SUSPENDED, DEACTIVATED
    locale          VARCHAR(10) NOT NULL DEFAULT 'en-KE',
    mfa_enabled     BOOLEAN NOT NULL DEFAULT false,
    mfa_secret      VARCHAR(255),
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, email)
);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_org ON users(organization_id);

CREATE TABLE user_roles (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- scoped role assignment
    PRIMARY KEY (user_id, role_id, organization_id)
);

CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked         BOOLEAN NOT NULL DEFAULT false,
    device_info     JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);

-- ----------------------------------------------------------------------------
-- FARMERS & FARMS
-- ----------------------------------------------------------------------------

CREATE TABLE farmers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL, -- nullable: farmer may not have login
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    national_id     VARCHAR(50),
    phone           VARCHAR(30) NOT NULL,
    email           VARCHAR(255),
    county          VARCHAR(100) NOT NULL,
    sub_county      VARCHAR(100),
    registered_by   UUID REFERENCES users(id),  -- inspector who registered on their behalf
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_farmers_tenant ON farmers(tenant_id);
CREATE INDEX idx_farmers_org ON farmers(organization_id);

CREATE TABLE farms (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    farmer_id       UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    county          VARCHAR(100) NOT NULL,
    sub_county      VARCHAR(100),
    ward            VARCHAR(100),
    size_acres      NUMERIC(10,2),
    primary_crop    VARCHAR(100),
    crops           JSONB DEFAULT '[]',          -- array of crop types if multiple
    latitude        NUMERIC(10,7),
    longitude       NUMERIC(10,7),
    boundary_geojson JSONB,                       -- optional farm boundary polygon
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_farms_tenant ON farms(tenant_id);
CREATE INDEX idx_farms_farmer ON farms(farmer_id);
CREATE INDEX idx_farms_geo ON farms(latitude, longitude);

-- ----------------------------------------------------------------------------
-- CERTIFICATION STANDARDS (configurable, no hardcoding)
-- ----------------------------------------------------------------------------

CREATE TABLE certification_standards (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code            VARCHAR(50) NOT NULL,    -- e.g. GLOBALG.A.P, RA, ISO22000
    name            VARCHAR(255) NOT NULL,
    version         VARCHAR(20) NOT NULL DEFAULT '1.0',
    description     TEXT,
    passing_score_pct NUMERIC(5,2) DEFAULT 80.00,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code, version)
);

-- ----------------------------------------------------------------------------
-- DYNAMIC FORM BUILDER (forms, sections, questions - all admin-configurable)
-- ----------------------------------------------------------------------------

CREATE TABLE form_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    standard_id     UUID REFERENCES certification_standards(id) ON DELETE SET NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    version         INT NOT NULL DEFAULT 1,
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',  -- DRAFT, PUBLISHED, ARCHIVED
    inspection_type VARCHAR(100),            -- free-text classification, e.g. 'Pre-harvest', 'Annual Audit'
    created_by      UUID REFERENCES users(id),
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_form_tenant ON form_templates(tenant_id);

CREATE TABLE form_sections (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    display_order   INT NOT NULL DEFAULT 0,
    weight_pct      NUMERIC(5,2) DEFAULT 0   -- contribution to overall score
);
CREATE INDEX idx_section_form ON form_sections(form_template_id);

CREATE TABLE form_questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id      UUID NOT NULL REFERENCES form_sections(id) ON DELETE CASCADE,
    question_text   TEXT NOT NULL,
    help_text       TEXT,
    question_type   VARCHAR(30) NOT NULL,
                    -- TEXT, NUMBER, BOOLEAN, SINGLE_CHOICE, MULTI_CHOICE, PHOTO, GPS, SIGNATURE, DATE, SCALE
    options         JSONB DEFAULT '[]',      -- choices for SINGLE_CHOICE/MULTI_CHOICE
    is_required     BOOLEAN NOT NULL DEFAULT true,
    is_critical     BOOLEAN NOT NULL DEFAULT false, -- a "fail" here can auto-fail the whole inspection
    scoring_weight  NUMERIC(6,2) DEFAULT 1,
    pass_criteria   JSONB,                   -- e.g. {"operator":"eq","value":true} or {"min":0,"max":10}
    display_order   INT NOT NULL DEFAULT 0,
    conditional_on  UUID REFERENCES form_questions(id),  -- show only if parent question answered a certain way
    conditional_rule JSONB                   -- e.g. {"equals": "Yes"}
);
CREATE INDEX idx_question_section ON form_questions(section_id);

-- ----------------------------------------------------------------------------
-- WORKFLOW CONFIGURATION (Client→Supervisor→Inspector / Client→Inspector)
-- ----------------------------------------------------------------------------

CREATE TABLE workflow_definitions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL = tenant default
    name            VARCHAR(100) NOT NULL,
    mode            VARCHAR(30) NOT NULL,  -- CLIENT_SUPERVISOR_INSPECTOR | CLIENT_INSPECTOR
    steps           JSONB NOT NULL,        -- ordered array of {step, role, action, sla_hours}
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- INSPECTION REQUESTS, ASSIGNMENT, EXECUTION
-- ----------------------------------------------------------------------------

CREATE TABLE inspection_requests (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    farm_id             UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    requested_by        UUID NOT NULL REFERENCES users(id),
    standard_id         UUID REFERENCES certification_standards(id),
    form_template_id    UUID REFERENCES form_templates(id),
    workflow_definition_id UUID REFERENCES workflow_definitions(id),
    inspection_type     VARCHAR(100),
    preferred_date      DATE,
    status              VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW',
                        -- PENDING_REVIEW, PENDING_ASSIGNMENT, ASSIGNED, IN_PROGRESS,
                        -- SUBMITTED, UNDER_SUPERVISOR_REVIEW, APPROVED, REJECTED, COMPLETED, CANCELLED
    current_step        VARCHAR(50),       -- maps to workflow_definitions.steps[n].step
    priority            VARCHAR(10) DEFAULT 'NORMAL',
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ir_tenant ON inspection_requests(tenant_id);
CREATE INDEX idx_ir_farm ON inspection_requests(farm_id);
CREATE INDEX idx_ir_status ON inspection_requests(status);

CREATE TABLE inspection_assignments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_request_id UUID NOT NULL REFERENCES inspection_requests(id) ON DELETE CASCADE,
    inspector_id        UUID NOT NULL REFERENCES users(id),
    assigned_by         UUID REFERENCES users(id),  -- NULL if self-assigned (Scenario B)
    assigned_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    scheduled_date      DATE,
    status              VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED', -- ASSIGNED, ACCEPTED, DECLINED, COMPLETED
    decline_reason      TEXT
);
CREATE INDEX idx_assign_request ON inspection_assignments(inspection_request_id);
CREATE INDEX idx_assign_inspector ON inspection_assignments(inspector_id);

CREATE TABLE inspections (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    inspection_request_id UUID NOT NULL REFERENCES inspection_requests(id) ON DELETE CASCADE,
    form_template_id    UUID NOT NULL REFERENCES form_templates(id),
    inspector_id        UUID NOT NULL REFERENCES users(id),
    started_at          TIMESTAMPTZ,
    submitted_at         TIMESTAMPTZ,
    gps_latitude        NUMERIC(10,7),
    gps_longitude       NUMERIC(10,7),
    gps_accuracy_m      NUMERIC(8,2),
    overall_score_pct   NUMERIC(5,2),
    result              VARCHAR(20),  -- PASS, FAIL, CONDITIONAL_PASS
    inspector_signature_url TEXT,
    farmer_signature_url    TEXT,
    is_offline_capture   BOOLEAN NOT NULL DEFAULT false,
    sync_status          VARCHAR(20) DEFAULT 'SYNCED',  -- SYNCED, PENDING_SYNC, CONFLICT
    client_uuid          UUID,        -- idempotency key generated offline on device
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(client_uuid)
);
CREATE INDEX idx_inspections_tenant ON inspections(tenant_id);
CREATE INDEX idx_inspections_request ON inspections(inspection_request_id);

CREATE TABLE inspection_answers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id   UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES form_questions(id),
    answer_value    JSONB,            -- flexible: string, number, bool, array
    is_compliant    BOOLEAN,          -- evaluated against pass_criteria
    score           NUMERIC(6,2),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_answer_inspection ON inspection_answers(inspection_id);
CREATE INDEX idx_answer_question ON inspection_answers(question_id);

CREATE TABLE inspection_media (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id   UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    answer_id       UUID REFERENCES inspection_answers(id) ON DELETE CASCADE,
    media_type      VARCHAR(20) NOT NULL,  -- PHOTO, SIGNATURE, DOCUMENT
    storage_key      TEXT NOT NULL,         -- MinIO/S3 object key
    gps_latitude    NUMERIC(10,7),
    gps_longitude   NUMERIC(10,7),
    captured_at     TIMESTAMPTZ,
    file_size_bytes BIGINT,
    checksum_sha256 VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_media_inspection ON inspection_media(inspection_id);

-- ----------------------------------------------------------------------------
-- NON-CONFORMITIES
-- ----------------------------------------------------------------------------

CREATE TABLE non_conformities (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    inspection_id   UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    question_id     UUID REFERENCES form_questions(id),
    severity        VARCHAR(20) NOT NULL DEFAULT 'MINOR', -- MINOR, MAJOR, CRITICAL
    description     TEXT NOT NULL,
    corrective_action_required TEXT,
    due_date        DATE,
    status          VARCHAR(20) NOT NULL DEFAULT 'OPEN',  -- OPEN, IN_PROGRESS, RESOLVED, VERIFIED, CLOSED
    resolved_at     TIMESTAMPTZ,
    verified_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nc_inspection ON non_conformities(inspection_id);
CREATE INDEX idx_nc_status ON non_conformities(status);

-- ----------------------------------------------------------------------------
-- SUPERVISOR REVIEW (Scenario A step)
-- ----------------------------------------------------------------------------

CREATE TABLE inspection_reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id   UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    reviewer_id     UUID NOT NULL REFERENCES users(id),
    decision        VARCHAR(20) NOT NULL,  -- APPROVED, REJECTED, RETURNED_FOR_REVISION
    comments        TEXT,
    reviewed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_review_inspection ON inspection_reviews(inspection_id);

-- ----------------------------------------------------------------------------
-- REPORTS & QR VERIFICATION
-- ----------------------------------------------------------------------------

CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    inspection_id   UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    report_number   VARCHAR(50) NOT NULL UNIQUE,  -- human-readable e.g. TIC-2026-000123
    storage_key      TEXT NOT NULL,                -- PDF object key in MinIO/S3
    qr_token        VARCHAR(64) NOT NULL UNIQUE,   -- random verification token embedded in QR
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ,
    is_revoked      BOOLEAN NOT NULL DEFAULT false,
    released_to_client_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_report_qr ON reports(qr_token);
CREATE INDEX idx_report_inspection ON reports(inspection_id);

CREATE TABLE report_verifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id       UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    verified_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address      VARCHAR(45),
    user_agent      TEXT
);
CREATE INDEX idx_verification_report ON report_verifications(report_id);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS (event-driven)
-- ----------------------------------------------------------------------------

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel         VARCHAR(20) NOT NULL,  -- EMAIL, SMS, IN_APP, PUSH
    event_type      VARCHAR(100) NOT NULL, -- INSPECTION_ASSIGNED, REPORT_READY, NC_RAISED, etc.
    payload         JSONB NOT NULL DEFAULT '{}',
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, FAILED
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user ON notifications(user_id);
CREATE INDEX idx_notif_status ON notifications(status);

-- ----------------------------------------------------------------------------
-- AUDIT TRAIL (every action, every entity)
-- ----------------------------------------------------------------------------

CREATE TABLE audit_logs (
    id              UUID NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
    actor_user_id   UUID REFERENCES users(id),
    action          VARCHAR(100) NOT NULL,  -- e.g. INSPECTION_SUBMITTED, USER_LOGIN, FORM_PUBLISHED
    entity_type     VARCHAR(100) NOT NULL,
    entity_id       UUID,
    before_state    JSONB,
    after_state     JSONB,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Monthly partitions recommended; example for initial deployment:
CREATE TABLE audit_logs_2026_06 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE audit_logs_2026_07 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_user_id);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (multi-tenant isolation)
-- ----------------------------------------------------------------------------

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_organizations ON organizations
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_users ON users
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_farmers ON farmers
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_farms ON farms
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_inspection_requests ON inspection_requests
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_inspections ON inspections
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_form_templates ON form_templates
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_standards ON certification_standards
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_reports ON reports
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
