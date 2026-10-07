package com.tic.seed;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/** Creates seed users only when their email does not exist yet, then ensures their roles. */
@Component
public class UserSeeder {
    private static final Logger LOGGER = LoggerFactory.getLogger(UserSeeder.class);

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;

    public UserSeeder(JdbcTemplate jdbcTemplate, PasswordEncoder passwordEncoder) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
    }

    public UUID createIfMissing(SeedContext context, String email, String firstName, String lastName,
                                String password, String... roleCodes) {
        List<UUID> existing = jdbcTemplate.queryForList(
                "select id from users where tenant_id = ? and lower(email) = lower(?)",
                UUID.class, context.tenantId(), email);
        UUID userId;
        if (existing.isEmpty()) {
            userId = jdbcTemplate.queryForObject("""
                    insert into users(tenant_id, organization_id, email, phone, password_hash, first_name, last_name, status)
                    values (?, ?, ?, '+254700000000', ?, ?, ?, 'ACTIVE')
                    returning id
                    """, UUID.class, context.tenantId(), context.organizationId(), email,
                    passwordEncoder.encode(password), firstName, lastName);
            LOGGER.info("Seeded user {} with roles {}", email, String.join(", ", roleCodes));
        } else {
            userId = existing.getFirst();
        }
        for (String roleCode : roleCodes) {
            jdbcTemplate.update("""
                    insert into user_roles(user_id, role_id, organization_id)
                    select ?, r.id, ?
                    from roles r
                    where r.tenant_id = ? and r.code = ?
                    on conflict do nothing
                    """, userId, context.organizationId(), context.tenantId(), roleCode);
        }
        return userId;
    }
}
