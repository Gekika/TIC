-- ============================================================================
-- TIC V3 - Commodity inspection classification and report profiles
-- Adds support for origin, destination, and damage inspections across different
-- commodities and standards, based on supplied avocado/fresh-fruit report samples.
-- ============================================================================

CREATE TABLE commodities (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code            VARCHAR(50) NOT NULL,
    name            VARCHAR(120) NOT NULL,
    category        VARCHAR(80),
    default_unit    VARCHAR(40),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code)
);
CREATE INDEX idx_commodities_tenant ON commodities(tenant_id);

ALTER TABLE certification_standards
    ADD COLUMN commodity_id UUID REFERENCES commodities(id),
    ADD COLUMN inspection_classification VARCHAR(30) NOT NULL DEFAULT 'ORIGIN';

COMMENT ON COLUMN certification_standards.inspection_classification IS
  'ORIGIN | DESTINATION | DAMAGE. Standards can be commodity- and classification-specific.';

ALTER TABLE form_templates
    ADD COLUMN commodity_id UUID REFERENCES commodities(id),
    ADD COLUMN inspection_classification VARCHAR(30) NOT NULL DEFAULT 'ORIGIN';

ALTER TABLE inspection_requests
    ADD COLUMN commodity_id UUID REFERENCES commodities(id),
    ADD COLUMN inspection_classification VARCHAR(30) NOT NULL DEFAULT 'ORIGIN';

ALTER TABLE inspections
    ADD COLUMN commodity_id UUID REFERENCES commodities(id),
    ADD COLUMN inspection_classification VARCHAR(30) NOT NULL DEFAULT 'ORIGIN',
    ADD COLUMN report_profile_key VARCHAR(80);

ALTER TABLE reports
    ADD COLUMN report_profile_key VARCHAR(80),
    ADD COLUMN report_title VARCHAR(255);

CREATE TABLE report_profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    commodity_id    UUID REFERENCES commodities(id) ON DELETE CASCADE,
    classification  VARCHAR(30) NOT NULL,
    profile_key     VARCHAR(80) NOT NULL,
    title_pattern   VARCHAR(255) NOT NULL,
    sections        JSONB NOT NULL DEFAULT '[]',
    score_labels    JSONB NOT NULL DEFAULT '["Excellent","Good","Fair","Poor","Bad"]',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, commodity_id, classification, profile_key)
);
CREATE INDEX idx_report_profiles_tenant ON report_profiles(tenant_id);

ALTER TABLE commodities ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_commodities ON commodities
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_report_profiles ON report_profiles
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
