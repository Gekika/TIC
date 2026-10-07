package com.tic.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Role assignments (user_roles) and the permissions they grant. Uses plain SQL because
 * user_roles has a composite key and no entity of its own.
 */
@Repository
public class UserRoleRepository {
    private final JdbcTemplate jdbcTemplate;

    public UserRoleRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<String> roleCodesForUser(UUID userId) {
        return jdbcTemplate.queryForList("""
                select distinct r.code
                from user_roles ur
                join roles r on r.id = ur.role_id
                where ur.user_id = ?
                order by r.code
                """, String.class, userId);
    }

    public List<String> permissionCodesForUser(UUID userId) {
        return jdbcTemplate.queryForList("""
                select distinct p.code
                from user_roles ur
                join role_permissions rp on rp.role_id = ur.role_id
                join permissions p on p.id = rp.permission_id
                where ur.user_id = ?
                order by p.code
                """, String.class, userId);
    }

    public void addRole(UUID userId, UUID roleId, UUID organizationId) {
        jdbcTemplate.update("""
                insert into user_roles(user_id, role_id, organization_id)
                values (?, ?, ?)
                on conflict do nothing
                """, userId, roleId, organizationId);
    }

    public void removeRole(UUID userId, UUID roleId, UUID organizationId) {
        jdbcTemplate.update("""
                delete from user_roles
                where user_id = ? and role_id = ? and organization_id = ?
                """, userId, roleId, organizationId);
    }
}
