package com.tic.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.List;

/**
 * All application-specific settings, bound from the {@code tic.*} keys in application.yml
 * (which in turn read environment variables - see .env.example).
 */
@Validated
@ConfigurationProperties(prefix = "tic")
public record TicProperties(
        @Valid Jwt jwt,
        Cors cors,
        Portal portal,
        Mail mail,
        AccountSetup accountSetup,
        Seed seed
) {
    /** Signing settings for access tokens. The secret must be at least 32 bytes (HS256). */
    public record Jwt(String issuer, long accessTokenMinutes, @NotBlank @Size(min = 32) String secret) {
    }

    /** Browser origins allowed to call the API directly (not needed when Nginx serves both on one origin). */
    public record Cors(List<String> allowedOrigins) {
    }

    /** Public URL of the frontend; used to build links in emails. */
    public record Portal(String baseUrl) {
    }

    public record Mail(String from) {
    }

    public record AccountSetup(long tokenHours) {
    }

    /**
     * Start-up data seeding.
     *
     * @param adminEmail    email of the first platform administrator (created only if missing)
     * @param adminPassword password for that administrator (never overwrites an existing one)
     * @param demoUsers     also create demo supervisor/inspector/client accounts and a sample client site
     */
    public record Seed(boolean enabled, String adminEmail, String adminPassword, boolean demoUsers) {
    }
}
