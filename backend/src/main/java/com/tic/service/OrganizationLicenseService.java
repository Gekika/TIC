package com.tic.service;

import com.tic.exception.ForbiddenException;
import com.tic.repository.OrganizationRepository;
import com.tic.shared.constants.RoleCodes;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Answers "may users of this organization use the platform right now?". */
@Service
public class OrganizationLicenseService {
    public static final String INACTIVE_LICENSE_CODE = "ORGANIZATION_LICENSE_INACTIVE";

    private final OrganizationRepository organizationRepository;

    public OrganizationLicenseService(OrganizationRepository organizationRepository) {
        this.organizationRepository = organizationRepository;
    }

    /** Throws 403 unless the organization's licence is usable. SYSTEM_ADMIN always passes. */
    @Transactional(readOnly = true)
    public void requireAccessible(UUID tenantId, UUID organizationId, List<String> roles) {
        if (roles != null && roles.contains(RoleCodes.SYSTEM_ADMIN)) {
            return;
        }
        if (!isAccessible(tenantId, organizationId)) {
            throw new ForbiddenException(
                    INACTIVE_LICENSE_CODE,
                    "Your organization's TIC license is inactive. Contact your system administrator to restore access."
            );
        }
    }

    @Transactional(readOnly = true)
    public boolean isAccessible(UUID tenantId, UUID organizationId) {
        if (tenantId == null || organizationId == null) {
            return false;
        }
        return organizationRepository.findByTenantIdAndId(tenantId, organizationId)
                .map(organization -> organization.hasAccessibleLicense(LocalDate.now()))
                .orElse(false);
    }
}
