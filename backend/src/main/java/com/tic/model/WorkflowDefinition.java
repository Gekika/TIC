package com.tic.model;

import com.tic.shared.model.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

/** The ordered steps an inspection request moves through for an organization. */
@Entity
@Table(name = "workflow_definitions")
public class WorkflowDefinition extends BaseEntity {
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "organization_id")
    private UUID organizationId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String mode;

    @Column(nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    private String steps;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    protected WorkflowDefinition() {
    }

    public WorkflowDefinition(UUID tenantId, UUID organizationId, String name, String mode, String steps) {
        this.tenantId = tenantId;
        this.organizationId = organizationId;
        this.name = name;
        this.mode = mode;
        this.steps = steps;
    }
}
