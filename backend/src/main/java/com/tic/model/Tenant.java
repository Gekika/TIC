package com.tic.model;

import com.tic.shared.model.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** A customer of the platform. Every row in the database belongs to exactly one tenant. */
@Entity
@Table(name = "tenants")
public class Tenant extends BaseEntity {
    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String status = "ACTIVE";

    @Column(nullable = false)
    private String plan = "STANDARD";

    @Column(nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    private String settings = "{}";

    protected Tenant() {
    }

    public Tenant(String name, String slug) {
        this.name = name;
        this.slug = slug;
    }

    public String getName() {
        return name;
    }

    public String getSlug() {
        return slug;
    }
}
