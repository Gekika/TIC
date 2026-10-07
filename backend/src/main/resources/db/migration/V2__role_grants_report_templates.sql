-- ============================================================================
-- TIC Schema V2 — Three additions to V1
-- Migration: V2__role_grants_report_templates_workflow_rename.sql
--
-- Changes:
--   1. Rename workflow actor labels: CLIENT → FARMER throughout comments/enums
--   2. Temporary role elevation: user_role_grants (replaces simple user_roles
--      for time-bounded assignments; permanent roles stay in user_roles)
--   3. Configurable PDF report templates: report_templates + report_template_sections
--      + report_template_fields (section-level toggles + field-level overrides)
-- ============================================================================

-- ============================================================================
-- 1. ACTOR RENAME: update workflow_mode label in organizations
--    CLIENT_SUPERVISOR_INSPECTOR  →  FARMER_SUPERVISOR_INSPECTOR
--    CLIENT_INSPECTOR             →  FARMER_INSPECTOR
-- ============================================================================

ALTER TABLE organizations
    ALTER COLUMN workflow_mode SET DEFAULT 'FARMER_SUPERVISOR_INSPECTOR';

-- Update existing rows
UPDATE organizations
   SET workflow_mode = REPLACE(workflow_mode, 'CLIENT_', 'FARMER_')
 WHERE workflow_mode LIKE 'CLIENT_%';

-- Update workflow_definitions.mode as well
UPDATE workflow_definitions
   SET mode = REPLACE(mode, 'CLIENT_', 'FARMER_')
 WHERE mode LIKE 'CLIENT_%';

COMMENT ON COLUMN organizations.workflow_mode IS
  'FARMER_SUPERVISOR_INSPECTOR (Scenario A, default) | FARMER_INSPECTOR (Scenario B, supervisor step off)';

-- ============================================================================
-- 2. TEMPORARY ROLE ELEVATION  (user_role_grants)
--
--    An Org Admin grants a user (e.g. Inspector) an elevated role
--    (e.g. SUPERVISOR) for a defined window.  A scheduled job
--    (Spring @Scheduled every minute) auto-revokes expired grants
--    and fires a notification.  Manual revocation is also supported.
-- ============================================================================

CREATE TABLE user_role_grants (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id             UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Grant window
    granted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at          TIMESTAMPTZ NOT NULL,               -- must be future; enforced by CHECK
    revoked_at          TIMESTAMPTZ,                        -- set by auto-expiry job or manual revoke
    revoked_by          UUID REFERENCES users(id),          -- NULL = auto-revoked by system

    -- Context / audit
    reason              TEXT,                               -- why the elevation was granted
    granted_by          UUID NOT NULL REFERENCES users(id),
    auto_revoke_notified BOOLEAN NOT NULL DEFAULT false,    -- has expiry notification been sent?

    CONSTRAINT chk_expires_future CHECK (expires_at > granted_at),
    CONSTRAINT chk_revoked_after_grant CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);

CREATE INDEX idx_role_grants_user       ON user_role_grants(user_id);
CREATE INDEX idx_role_grants_tenant     ON user_role_grants(tenant_id);
CREATE INDEX idx_role_grants_expires    ON user_role_grants(expires_at)
    WHERE revoked_at IS NULL;   -- partial index — only live grants need expiry scanning

-- Helper view: currently active elevated grants (used by the auth layer
-- when building the effective permission set for a JWT)
CREATE OR REPLACE VIEW active_role_grants AS
SELECT *
  FROM user_role_grants
 WHERE revoked_at IS NULL
   AND expires_at > now();

COMMENT ON TABLE user_role_grants IS
  'Time-bounded role elevations. The Spring scheduler checks every 60 s, '
  'revokes expired rows, and fires an EMAIL+SMS notification to the user. '
  'The auth layer merges active grants with permanent user_roles at token '
  'issue time so no re-login is needed when a grant activates mid-session '
  '(next token refresh picks it up automatically).';

-- ============================================================================
-- 3. CONFIGURABLE PDF REPORT TEMPLATES
--
--    Hierarchy:
--      report_templates          — one per org (or tenant default)
--        report_template_sections — sections that MAY appear on a report
--          report_template_fields  — individual fields within each section,
--                                    with visible flag + custom label override
--
--    Built-in section keys (app-defined, not user-created):
--      COVER_PAGE, FARM_DETAILS, FARMER_DETAILS, INSPECTOR_DETAILS,
--      CERTIFICATION_STANDARD, INSPECTION_SUMMARY, SCORE_BREAKDOWN,
--      SECTION_SCORES, INDIVIDUAL_ANSWERS, PHOTO_GALLERY, GPS_MAP,
--      NON_CONFORMITIES, CORRECTIVE_ACTIONS, INSPECTOR_SIGNATURE,
--      FARMER_SIGNATURE, QR_VERIFICATION_BLOCK, APPENDIX_NOTES
--
--    Built-in field keys within INSPECTION_SUMMARY (example):
--      overall_score, result_badge, inspection_date, form_version,
--      inspector_license_no, time_on_farm_minutes
-- ============================================================================

CREATE TABLE report_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
                    -- NULL = tenant-wide default; org-level overrides tenant default
    name            VARCHAR(255) NOT NULL DEFAULT 'Default Report Template',
    description     TEXT,

    -- Branding overrides (all optional; fall back to org/tenant logo)
    header_logo_url TEXT,
    footer_text     TEXT,
    primary_color   VARCHAR(7),                -- hex e.g. #1F4E5F
    show_watermark  BOOLEAN NOT NULL DEFAULT false,
    watermark_text  VARCHAR(100),              -- e.g. "CONFIDENTIAL", "DRAFT"

    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Only one active template per org (or per tenant when org IS NULL)
    UNIQUE NULLS NOT DISTINCT (tenant_id, organization_id)
);
CREATE INDEX idx_rpt_tmpl_tenant ON report_templates(tenant_id);
CREATE INDEX idx_rpt_tmpl_org    ON report_templates(organization_id);

CREATE TABLE report_template_sections (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_template_id  UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,

    section_key         VARCHAR(60) NOT NULL,   -- one of the built-in section keys above
    is_visible          BOOLEAN NOT NULL DEFAULT true,
    display_order       INT NOT NULL DEFAULT 0,
    custom_title        VARCHAR(255),           -- override the default section heading

    -- Section-level formatting hints
    page_break_before   BOOLEAN NOT NULL DEFAULT false,
    collapse_if_empty   BOOLEAN NOT NULL DEFAULT true,  -- hide section if it has no data

    UNIQUE (report_template_id, section_key)
);
CREATE INDEX idx_rpt_section_tmpl ON report_template_sections(report_template_id);

CREATE TABLE report_template_fields (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id              UUID NOT NULL REFERENCES report_template_sections(id) ON DELETE CASCADE,

    field_key               VARCHAR(100) NOT NULL,  -- built-in field key within the section
    is_visible              BOOLEAN NOT NULL DEFAULT true,
    custom_label            VARCHAR(255),            -- override the default field label
    display_order           INT NOT NULL DEFAULT 0,

    -- Fine-grained overrides
    mask_value              BOOLEAN NOT NULL DEFAULT false,
                            -- redact the value (show *** ) — useful for PII like national_id
    format_override         VARCHAR(50),
                            -- e.g. 'DATE_ONLY', 'SCORE_PCT', 'SCORE_FRACTION' for numeric fields

    UNIQUE (section_id, field_key)
);
CREATE INDEX idx_rpt_field_section ON report_template_fields(section_id);

-- RLS policies for new tables
ALTER TABLE user_role_grants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_template_fields  ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_role_grants ON user_role_grants
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_report_templates ON report_templates
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_rpt_sections ON report_template_sections
    USING (
        report_template_id IN (
            SELECT id FROM report_templates
             WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
        )
    );

CREATE POLICY tenant_isolation_rpt_fields ON report_template_fields
    USING (
        section_id IN (
            SELECT rts.id
              FROM report_template_sections rts
              JOIN report_templates rt ON rt.id = rts.report_template_id
             WHERE rt.tenant_id = current_setting('app.current_tenant_id')::uuid
        )
    );

-- ============================================================================
-- 4. SEED: default report template sections for every new tenant
--    (run once per tenant provisioning, or via app-layer bootstrap)
-- ============================================================================

-- This stored procedure is called during tenant onboarding to create
-- the default report template with all sections visible, in standard order.
CREATE OR REPLACE FUNCTION create_default_report_template(
    p_tenant_id     UUID,
    p_org_id        UUID,       -- pass NULL for tenant-wide default
    p_created_by    UUID
) RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
    v_tmpl_id UUID;
    v_section_id UUID;
    v_order  INT := 0;

    section_keys TEXT[] := ARRAY[
        'COVER_PAGE', 'FARM_DETAILS', 'FARMER_DETAILS', 'INSPECTOR_DETAILS',
        'CERTIFICATION_STANDARD', 'INSPECTION_SUMMARY', 'SCORE_BREAKDOWN',
        'SECTION_SCORES', 'INDIVIDUAL_ANSWERS', 'PHOTO_GALLERY', 'GPS_MAP',
        'NON_CONFORMITIES', 'CORRECTIVE_ACTIONS', 'INSPECTOR_SIGNATURE',
        'FARMER_SIGNATURE', 'QR_VERIFICATION_BLOCK', 'APPENDIX_NOTES'
    ];
    sk TEXT;
BEGIN
    INSERT INTO report_templates (tenant_id, organization_id, created_by)
    VALUES (p_tenant_id, p_org_id, p_created_by)
    RETURNING id INTO v_tmpl_id;

    FOREACH sk IN ARRAY section_keys LOOP
        INSERT INTO report_template_sections
            (report_template_id, section_key, is_visible, display_order)
        VALUES
            (v_tmpl_id, sk, true, v_order);
        v_order := v_order + 1;
    END LOOP;

    RETURN v_tmpl_id;
END;
$$;

COMMENT ON FUNCTION create_default_report_template IS
  'Called during tenant/org provisioning. Creates a report template with all '
  'standard sections enabled. Admins can then toggle sections off or reorder '
  'them via the Admin Panel without touching code.';
