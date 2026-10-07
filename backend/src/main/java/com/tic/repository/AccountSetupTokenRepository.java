package com.tic.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Single-use invitation / password-reset links. Only the SHA-256 hash of each token is stored.
 */
@Repository
public class AccountSetupTokenRepository {
    private final JdbcTemplate jdbcTemplate;

    public AccountSetupTokenRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void revokeOpenTokens(UUID userId, String purpose) {
        jdbcTemplate.update("""
                update account_setup_tokens
                set used_at = now()
                where user_id = ? and purpose = ? and used_at is null
                """, userId, purpose);
    }

    public void create(
            UUID tenantId,
            UUID userId,
            String tokenHash,
            String purpose,
            OffsetDateTime expiresAt,
            UUID createdBy
    ) {
        jdbcTemplate.update("""
                insert into account_setup_tokens(tenant_id, user_id, token_hash, purpose, expires_at, created_by)
                values (?, ?, ?, ?, ?, ?)
                """, tenantId, userId, tokenHash, purpose, expiresAt, createdBy);
    }

    public Optional<ActiveToken> findActive(UUID tenantId, String tokenHash) {
        return jdbcTemplate.query("""
                select id, user_id, purpose, expires_at
                from account_setup_tokens
                where tenant_id = ?
                  and token_hash = ?
                  and used_at is null
                  and expires_at > now()
                """, (resultSet, rowNumber) -> new ActiveToken(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject("user_id", UUID.class),
                resultSet.getString("purpose"),
                resultSet.getObject("expires_at", OffsetDateTime.class)
        ), tenantId, tokenHash).stream().findFirst();
    }

    public boolean consume(UUID id) {
        return jdbcTemplate.update("""
                update account_setup_tokens
                set used_at = now()
                where id = ? and used_at is null and expires_at > now()
                """, id) == 1;
    }

    public record ActiveToken(UUID id, UUID userId, String purpose, OffsetDateTime expiresAt) {
    }
}
