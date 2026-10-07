package com.tic.shared.tenancy;

import com.tic.repository.TenantRepository;
import com.tic.security.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

/**
 * Resolves the tenant for every request, in this order:
 * <ol>
 *     <li>the {@code tenantId} claim of a valid bearer token (cannot be overridden by headers)</li>
 *     <li>the {@code X-Tenant-ID} header</li>
 *     <li>the {@code X-Tenant-Slug} header, defaulting to {@value #DEFAULT_TENANT_SLUG}</li>
 * </ol>
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class TenantFilter extends OncePerRequestFilter {
    public static final String DEFAULT_TENANT_SLUG = "agricert-kenya";

    private final JwtService jwtService;
    private final TenantRepository tenantRepository;

    public TenantFilter(JwtService jwtService, TenantRepository tenantRepository) {
        this.jwtService = jwtService;
        this.tenantRepository = tenantRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            resolveTenantId(request).ifPresent(TenantContext::setTenantId);
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private Optional<UUID> resolveTenantId(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) {
            Optional<UUID> fromToken = jwtService.extractTenantId(auth.substring(7));
            if (fromToken.isPresent()) {
                return fromToken;
            }
        }

        String explicitTenant = request.getHeader("X-Tenant-ID");
        if (explicitTenant != null && !explicitTenant.isBlank()) {
            try {
                return Optional.of(UUID.fromString(explicitTenant.trim()));
            } catch (IllegalArgumentException ignored) {
                // fall through to slug resolution
            }
        }

        String slug = Optional.ofNullable(request.getHeader("X-Tenant-Slug"))
                .filter(value -> !value.isBlank())
                .orElse(DEFAULT_TENANT_SLUG);
        return tenantRepository.findBySlug(slug).map(tenant -> tenant.getId());
    }
}
