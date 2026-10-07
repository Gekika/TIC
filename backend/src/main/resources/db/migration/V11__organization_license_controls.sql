ALTER TABLE organizations
    ADD COLUMN license_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN license_expires_at DATE,
    ADD COLUMN license_notes TEXT,
    ADD COLUMN license_updated_at TIMESTAMPTZ,
    ADD COLUMN license_updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE organizations
    ADD CONSTRAINT chk_organization_license_status
        CHECK (license_status IN ('ACTIVE', 'SUSPENDED', 'EXPIRED'));

CREATE INDEX idx_organizations_license_access
    ON organizations(tenant_id, is_active, license_status, license_expires_at);
