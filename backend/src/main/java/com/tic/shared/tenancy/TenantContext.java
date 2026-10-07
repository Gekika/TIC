package com.tic.shared.tenancy;

import java.util.Optional;
import java.util.UUID;

/**
 * Holds the tenant of the current request (set by {@link TenantFilter}, cleared after the request).
 */
public final class TenantContext {
    private static final ThreadLocal<UUID> CURRENT_TENANT = new ThreadLocal<>();

    private TenantContext() {
    }

    public static void setTenantId(UUID tenantId) {
        CURRENT_TENANT.set(tenantId);
    }

    public static Optional<UUID> getTenantId() {
        return Optional.ofNullable(CURRENT_TENANT.get());
    }

    public static UUID requireTenantId() {
        return getTenantId().orElseThrow(() -> new IllegalStateException("Tenant context is not set"));
    }

    public static void clear() {
        CURRENT_TENANT.remove();
    }
}
