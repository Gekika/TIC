package com.tic.security;

import com.tic.config.TicProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Issues and verifies HS256-signed access tokens that carry the {@link CurrentUser}. */
@Component
public class JwtService {
    private final SecretKey key;
    private final String issuer;
    private final Duration ttl;

    public JwtService(TicProperties properties) {
        TicProperties.Jwt jwt = properties.jwt();
        this.key = Keys.hmacShaKeyFor(jwt.secret().getBytes(StandardCharsets.UTF_8));
        this.issuer = jwt.issuer();
        this.ttl = Duration.ofMinutes(jwt.accessTokenMinutes());
    }

    public String createAccessToken(CurrentUser user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(issuer)
                .subject(user.id().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .claim("tenantId", user.tenantId().toString())
                .claim("organizationId", user.organizationId() == null ? null : user.organizationId().toString())
                .claim("email", user.email())
                .claim("roles", user.roles())
                .claim("permissions", user.permissions())
                .signWith(key)
                .compact();
    }

    /** @throws io.jsonwebtoken.JwtException if the token is invalid or expired */
    @SuppressWarnings("unchecked")
    public CurrentUser parse(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return new CurrentUser(
                UUID.fromString(claims.getSubject()),
                UUID.fromString(claims.get("tenantId", String.class)),
                optionalUuid(claims.get("organizationId", String.class)),
                claims.get("email", String.class),
                claims.get("roles", List.class),
                claims.get("permissions", List.class)
        );
    }

    public Optional<UUID> extractTenantId(String token) {
        try {
            return Optional.of(parse(token).tenantId());
        } catch (RuntimeException invalidToken) {
            return Optional.empty();
        }
    }

    private UUID optionalUuid(String value) {
        return value == null || value.isBlank() ? null : UUID.fromString(value);
    }
}
