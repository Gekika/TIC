CREATE TABLE account_setup_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    purpose     VARCHAR(30) NOT NULL CHECK (purpose IN ('INVITATION', 'PASSWORD_RESET')),
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_setup_user ON account_setup_tokens(user_id);
CREATE INDEX idx_account_setup_active ON account_setup_tokens(tenant_id, token_hash, expires_at)
    WHERE used_at IS NULL;
