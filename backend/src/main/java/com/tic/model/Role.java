package com.tic.model;

import com.tic.shared.model.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.util.UUID;

/** A named bundle of permissions (e.g. SUPERVISOR) defined per tenant. */
@Entity
@Table(name = "roles")
public class Role extends BaseEntity {
    @Column(name = "tenant_id")
    private UUID tenantId;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(name = "is_system", nullable = false)
    private boolean system;

    protected Role() {
    }

    public Role(UUID tenantId, String code, String name, boolean system) {
        this.tenantId = tenantId;
        this.code = code;
        this.name = name;
        this.system = system;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }
}
