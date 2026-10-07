package com.tic.security;

import com.tic.shared.constants.RoleCodes;

import java.util.List;
import java.util.UUID;

/**
 * The signed-in user, rebuilt from the JWT on every request.
 * Declare it as a controller parameter to receive it (see {@link CurrentUserArgumentResolver}).
 */
public record CurrentUser(
        UUID id,
        UUID tenantId,
        UUID organizationId,
        String email,
        List<String> roles,
        List<String> permissions
) {
    public boolean hasRole(String roleCode) {
        return roles != null && roles.contains(roleCode);
    }

    /** Platform owner: manages every organization and bypasses licence checks. */
    public boolean isSystemAdmin() {
        return hasRole(RoleCodes.SYSTEM_ADMIN);
    }

    /** SYSTEM_ADMIN or ORG_ADMIN - may manage users. */
    public boolean isAdministrator() {
        return isSystemAdmin() || hasRole(RoleCodes.ORG_ADMIN);
    }

    /** SUPERVISOR or ORG_ADMIN - runs inspection operations inside one organization. */
    public boolean isOrganizationOperator() {
        return hasRole(RoleCodes.SUPERVISOR) || hasRole(RoleCodes.ORG_ADMIN);
    }

    public boolean isInspector() {
        return hasRole(RoleCodes.INSPECTOR);
    }

    public boolean isClient() {
        return hasRole(RoleCodes.CLIENT);
    }

    public boolean belongsToTenant(UUID tenantId) {
        return tenantId != null && tenantId.equals(this.tenantId);
    }
}
