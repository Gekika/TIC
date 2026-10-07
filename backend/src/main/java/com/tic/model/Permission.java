package com.tic.model;

import com.tic.shared.model.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** A single capability (e.g. USER_INVITE) that roles can be granted. */
@Entity
@Table(name = "permissions")
public class Permission extends BaseEntity {
    @Column(nullable = false, unique = true)
    private String code;

    private String description;

    @Column(nullable = false)
    private String module;

    protected Permission() {
    }

    public Permission(String code, String module) {
        this.code = code;
        this.module = module;
    }

    public String getCode() {
        return code;
    }

    public String getModule() {
        return module;
    }
}
