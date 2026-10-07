package com.tic.shared.model;

import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Transient;
import org.springframework.data.domain.Persistable;

import java.util.UUID;

/**
 * Parent of every JPA entity: a client-generated UUID primary key.
 * <p>
 * Implements {@link Persistable} so Spring Data issues an INSERT (not a SELECT + MERGE)
 * for new entities even though the id is already set.
 */
@MappedSuperclass
public abstract class BaseEntity implements Persistable<UUID> {
    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Transient
    private boolean newEntity = true;

    protected BaseEntity() {
        this.id = UUID.randomUUID();
    }

    @Override
    public UUID getId() {
        return id;
    }

    @Override
    public boolean isNew() {
        return newEntity;
    }

    @PostLoad
    @PostPersist
    protected void markNotNew() {
        newEntity = false;
    }
}
